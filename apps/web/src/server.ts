import { createServerOnlyFn } from "@tanstack/react-start";
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import {
  CalculatorRequestBodyPolicy,
  withCalculatorRequestBodyLimit,
} from "@taxkit/api-http/request-boundary";
import { applyCachePolicy } from "@taxkit/api-http/response-policy";
import { observeHostRequest } from "@taxkit/api-rpc/host-telemetry";
import type { HostRoute } from "@taxkit/api-rpc/host-telemetry";
import { CalculatorRequestRateKey } from "@taxkit/calculators/admission.service";
import { DocsDiscoveryPath } from "@taxkit/content/schemas";
import { AuAnnualTaxCalculatorId } from "@taxkit/rules-au-income-tax/schemas";
import { AuPayCalculatorId } from "@taxkit/rules-au-pay/schemas";
import { calculatorEdgeRateKey } from "api/edge-identity";
import { Effect, ErrorReporter, Match, Schema } from "effect";
import {
  Headers as EffectHeaders,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { WebsiteAnalyticsRelay } from "./lib/analytics/relay/service";
import { WebsiteHost } from "./lib/api/host.server";
import { calculate } from "./lib/api/requests";
import { withDocsRepresentation } from "./lib/docs/markdown.response.server";
import {
  takeHomeRequestFromForm,
  annualTaxRequestFromForm,
  AnnualTaxForm,
  TakeHomeForm,
  WebsiteInputError,
} from "./lib/form.boundary";
import type { WebsiteCalculatorForm } from "./lib/form.boundary";
import { runtime } from "./lib/runtime.server";
import { WebsiteSubmission, WebsiteSubmissionTransport } from "./lib/schemas";
import type { WebsiteServerRenderContext } from "./lib/schemas";

const render = createStartHandler<{
  server: { requestContext: WebsiteServerRenderContext };
}>(defaultStreamHandler);

// The closed route family for the one request record; the raw path, query and
// form fields never leave this function.
const websiteRoute = (pathname: string, method: string): HostRoute =>
  Match.value(pathname).pipe(
    Match.when(Schema.is(DocsDiscoveryPath), () => "discovery" as const),
    Match.when(
      (path) => path.startsWith("/ingest/"),
      () => "analytics-relay" as const
    ),
    Match.when(
      (path) => path === "/" || path.startsWith("/calculators/"),
      (): HostRoute => (method === "POST" ? "calculate" : "calculator-page")
    ),
    Match.when("/search", () => "search" as const),
    Match.when(
      (path) => path === "/_serverFn" || path.startsWith("/_serverFn/"),
      () => "other" as const
    ),
    Match.orElse(() => "page" as const)
  );

// The Worker entry is server-only; the runtime never reaches a browser bundle.
const handleRequest = createServerOnlyFn((request: Request) =>
  // A standard HTML form remains usable without JavaScript. Its checked
  // request reaches the same native API client through the private binding.
  // Only plain, Schema-encoded form/report data reaches TanStack rendering.
  runtime.runPromise(
    Effect.gen(function* websiteRequest() {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/ingest/")) {
        const relay = yield* WebsiteAnalyticsRelay;
        const incoming = yield* HttpServerRequest.HttpServerRequest;
        return yield* relay.handle(incoming).pipe(
          Effect.catchTag("WebsiteRelayFailure", (error) =>
            Effect.succeed(
              HttpServerResponse.empty({
                headers: { "cache-control": "no-store" },
                status: Match.value(error.reason).pipe(
                  Match.when("configuration", () => 503),
                  Match.when("origin", () => 403),
                  Match.whenOr("metadata", "request", () => 400),
                  Match.when("request-size", () => 413),
                  Match.whenOr(
                    "transport",
                    "redirect",
                    "response-size",
                    () => 502
                  ),
                  Match.when("deadline", () => 504),
                  Match.exhaustive
                ),
              })
            )
          )
        );
      }
      const discoveryPath = url.pathname;
      if (Schema.is(DocsDiscoveryPath)(discoveryPath)) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return HttpServerResponse.empty({
            headers: { allow: "GET, HEAD" },
            status: 405,
          });
        }
        if (url.search !== "") {
          return HttpServerResponse.empty({ status: 400 });
        }
        // The API owns the finished document; forward it once.
        const host = yield* WebsiteHost;
        return yield* host
          .forward(`/api/v1/docs/discovery${discoveryPath}`)
          .pipe(
            Effect.map(HttpServerResponse.fromWeb),
            Effect.catch(() =>
              Effect.succeed(HttpServerResponse.empty({ status: 503 }))
            )
          );
      }
      // The framework still mounts its server-function base. The Website
      // declares no server functions, so every such address is absent.
      if (
        url.pathname === "/_serverFn" ||
        url.pathname.startsWith("/_serverFn/")
      ) {
        return HttpServerResponse.empty({ status: 404 });
      }
      const calculatorId = Match.value(url.pathname).pipe(
        Match.when("/calculators/au.income-tax.annual", () =>
          AuAnnualTaxCalculatorId.make("au.income-tax.annual")
        ),
        Match.when("/calculators/au.pay.withholdings", () =>
          AuPayCalculatorId.make("au.pay.withholdings")
        ),
        Match.when("/", () => AuPayCalculatorId.make("au.pay.take-home")),
        Match.orElse(() => null)
      );
      return yield* request.method !== "POST" || calculatorId === null
        ? Effect.gen(function* websiteHtml() {
            const incoming = yield* HttpServerRequest.HttpServerRequest;
            const htmlRequest = yield* HttpServerRequest.toWeb(incoming).pipe(
              Effect.orDie
            );
            return yield* Effect.promise(() =>
              Promise.resolve(render(htmlRequest, { context: {} }))
            ).pipe(Effect.map(HttpServerResponse.fromWeb));
          }).pipe(withDocsRepresentation)
        : withCalculatorRequestBodyLimit(
            Effect.gen(function* () {
              const incoming = yield* HttpServerRequest.HttpServerRequest;
              const bounded = yield* HttpServerRequest.toWeb(incoming, {
                signal: request.signal,
              });
              const data = yield* Effect.tryPromise({
                catch: () =>
                  new WebsiteInputError({
                    message: "Enter a valid pay amount and pay period.",
                  }),
                try: () => bounded.formData(),
              });
              const decodedForm: Effect.Effect<
                WebsiteCalculatorForm,
                Schema.SchemaError
              > =
                calculatorId === "au.income-tax.annual"
                  ? Schema.decodeUnknownEffect(AnnualTaxForm)({
                      taxableDollars: data.get("taxableDollars"),
                    })
                  : Schema.decodeUnknownEffect(TakeHomeForm)({
                      grossDollars: data.get("grossDollars"),
                      period: data.get("period"),
                      taxFreeThresholdClaimed:
                        data.get("taxFreeThresholdClaimed") === "on",
                    });
              const form = yield* decodedForm.pipe(
                Effect.mapError(
                  () =>
                    new WebsiteInputError({
                      message: "Enter a valid pay amount and pay period.",
                    })
                )
              );
              const result = yield* (
                Schema.is(AnnualTaxForm)(form)
                  ? annualTaxRequestFromForm(form)
                  : takeHomeRequestFromForm(
                      form,
                      AuPayCalculatorId.make(
                        calculatorId === "au.pay.withholdings"
                          ? "au.pay.withholdings"
                          : "au.pay.take-home"
                      )
                    )
              ).pipe(
                Effect.fromResult,
                Effect.flatMap((input) =>
                  WebsiteHost.pipe(
                    Effect.flatMap((host) => Effect.fromResult(host.client)),
                    Effect.flatMap((client) => calculate(client, input))
                  )
                ),
                Effect.result
              );
              const submission = yield* Schema.encodeEffect(
                WebsiteSubmissionTransport
              )(WebsiteSubmission.make({ calculatorId, form, result })).pipe(
                Effect.orDie
              );
              const headers = new Headers(request.headers);
              headers.delete("content-length");
              headers.delete("content-type");
              const response = yield* Effect.promise(() =>
                Promise.resolve(
                  render(
                    new Request(request.url, {
                      headers,
                      method: "GET",
                      signal: request.signal,
                    }),
                    { context: { submission } }
                  )
                )
              );
              return HttpServerResponse.fromWeb(response);
            }),
            CalculatorRequestBodyPolicy.make({ responseFormat: "html" })
          ).pipe(
            Effect.catchTag("WebsiteInputError", () =>
              Effect.succeed(HttpServerResponse.empty({ status: 400 }))
            )
          );
    }).pipe(
      // Native HTTP failure matching preserves aborts and safe empty errors.
      // The installed host reporter discards arbitrary Causes before logging.
      Effect.catchCause((cause) =>
        HttpServerError.causeResponse(cause).pipe(
          Effect.flatMap(([response, reportable]) =>
            ErrorReporter.report(reportable).pipe(Effect.as(response))
          )
        )
      ),
      // One cache decision for every reply. Public pages, Markdown and
      // discovery documents are shared; submissions, errors, analytics and
      // anything setting a cookie are not.
      Effect.map((response) =>
        applyCachePolicy(response, {
          method: request.method,
          publicRead: !new URL(request.url).pathname.startsWith("/ingest/"),
        })
      ),
      // One fixed request record per Website request.
      observeHostRequest("taxkit-web", {
        method: request.method,
        route: websiteRoute(new URL(request.url).pathname, request.method),
      }),
      Effect.provideService(
        CalculatorRequestRateKey,
        calculatorEdgeRateKey(EffectHeaders.fromInput(request.headers))
      ),
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        HttpServerRequest.fromWeb(request)
      ),
      Effect.scoped,
      Effect.map(HttpServerResponse.toWeb)
    ),
    { signal: request.signal }
  )
);

export default { fetch: handleRequest };
