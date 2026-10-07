import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import {
  CalculatorRequestBodyPolicy,
  withCalculatorRequestBodyLimit,
} from "@taxkit/api-http/request-boundary";
import {
  CalculatorRequestRateKey,
  calculatorEdgeRateKey,
} from "@taxkit/api-rpc/rate-identity";
import { DocsDiscoveryPath, DocsPublicPagePath } from "@taxkit/content/schemas";
import { AuAnnualTaxCalculatorId } from "@taxkit/rules-au-income-tax/schemas";
import { AuPayCalculatorId } from "@taxkit/rules-au-pay/schemas";
import { Effect, ErrorReporter, Match, Schema } from "effect";
import {
  Headers as EffectHeaders,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { WebsiteAnalyticsRelay } from "./lib/analytics/relay/service";
import { WebsiteServerFunctionBase } from "./lib/config";
import { withDocsRepresentation } from "./lib/docs/markdown.response.server";
import {
  takeHomeRequestFromForm,
  annualTaxRequestFromForm,
  AnnualTaxForm,
  TakeHomeForm,
  WebsiteInputError,
} from "./lib/form.boundary";
import type { WebsiteCalculatorForm } from "./lib/form.boundary";
import {
  WebsiteDocsSearchFunctionPath,
  WebsiteDocsPageFunctionPath,
  WebsiteSettingsFunctionPath,
} from "./lib/loaders";
import { appRuntime } from "./lib/runtime.server";
import {
  WebsiteDocsSearchHeader,
  WebsiteSubmission,
  WebsiteSubmissionTransport,
} from "./lib/schemas";
import type { WebsiteServerRenderContext } from "./lib/schemas";
import { WebsiteServerApplication } from "./lib/service.server";

const render = createStartHandler<{
  server: { requestContext: WebsiteServerRenderContext };
}>(defaultStreamHandler);

export default {
  fetch: (request: Request) =>
    // A standard HTML form remains usable without JavaScript. Its checked
    // request reaches the same named RPC client through the private binding.
    // Only plain, Schema-encoded form/report data reaches TanStack rendering.
    appRuntime.runPromise(
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
          const application = yield* WebsiteServerApplication;
          return yield* application.docsDiscovery(discoveryPath).pipe(
            Effect.map((document) => {
              const headers = {
                "cache-control": "public, max-age=300",
                "content-type": `${document.contentType}; charset=utf-8`,
                "x-content-type-options": "nosniff",
              };
              return request.method === "HEAD"
                ? HttpServerResponse.empty({ headers, status: 200 })
                : HttpServerResponse.text(document.body, {
                    contentType: `${document.contentType}; charset=utf-8`,
                    headers,
                  });
            }),
            Effect.catch(() =>
              Effect.succeed(
                HttpServerResponse.empty({
                  headers: { "cache-control": "no-store" },
                  status: 503,
                })
              )
            )
          );
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
        if (url.pathname.startsWith(`${WebsiteServerFunctionBase}/`)) {
          if (
            url.pathname !== WebsiteSettingsFunctionPath &&
            url.pathname !== WebsiteDocsPageFunctionPath &&
            url.pathname !== WebsiteDocsSearchFunctionPath
          ) {
            return HttpServerResponse.empty({ status: 404 });
          }
          // The native GET functions take no data or client Context. Reject
          // representation input before the framework's
          // JSON/FormData parser can reflect it in an unexpected error.
          if (request.method !== "GET") {
            return HttpServerResponse.empty({
              headers: { allow: "GET" },
              status: 405,
            });
          }
          if (
            url.search !== "" ||
            request.headers.has("content-type") ||
            (url.pathname === WebsiteDocsSearchFunctionPath &&
              !Schema.is(Schema.toEncoded(WebsiteDocsSearchHeader))(
                request.headers.get("x-taxkit-docs-search")
              )) ||
            (url.pathname === WebsiteDocsPageFunctionPath &&
              !Schema.is(DocsPublicPagePath)(
                request.headers.get("x-taxkit-docs-page")
              ))
          ) {
            return HttpServerResponse.empty({ status: 400 });
          }
        }

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
                    WebsiteServerApplication.pipe(
                      Effect.flatMap((application) =>
                        application.calculate(input)
                      )
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
    ),
};
