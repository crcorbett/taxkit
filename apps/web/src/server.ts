import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { withCalculatorRequestBodyLimit } from "@taxkit/api-rpc/request-boundary";
import { Effect, ErrorReporter, Schema } from "effect";
import {
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { WebsiteServerFunctionBase } from "./lib/config";
import {
  takeHomeRequestFromForm,
  TakeHomeForm,
  WebsiteInputError,
} from "./lib/form.boundary";
import { WebsiteSettingsFunctionPath } from "./lib/loaders";
import { appRuntime } from "./lib/runtime.server";
import { WebsiteSubmission, WebsiteSubmissionTransport } from "./lib/schemas";
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
        if (url.pathname.startsWith(`${WebsiteServerFunctionBase}/`)) {
          if (url.pathname !== WebsiteSettingsFunctionPath) {
            return HttpServerResponse.empty({ status: 404 });
          }
          // The only native server function reads settings and takes no data or
          // client Context. Reject representation input before the framework's
          // JSON/FormData parser can reflect it in an unexpected error.
          if (request.method !== "GET") {
            return HttpServerResponse.empty({
              headers: { allow: "GET" },
              status: 405,
            });
          }
          if (url.search !== "") {
            return HttpServerResponse.empty({ status: 400 });
          }
        }
        return yield* request.method !== "POST" || url.pathname !== "/"
          ? Effect.promise(() =>
              Promise.resolve(render(request, { context: {} }))
            ).pipe(Effect.map(HttpServerResponse.fromWeb))
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
                const form = yield* Schema.decodeUnknownEffect(TakeHomeForm)({
                  grossDollars: data.get("grossDollars"),
                  period: data.get("period"),
                  taxFreeThresholdClaimed:
                    data.get("taxFreeThresholdClaimed") === "on",
                }).pipe(
                  Effect.mapError(
                    () =>
                      new WebsiteInputError({
                        message: "Enter a valid pay amount and pay period.",
                      })
                  )
                );
                const result = yield* takeHomeRequestFromForm(form).pipe(
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
                )(WebsiteSubmission.make({ form, result })).pipe(Effect.orDie);
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
              })
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
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(request)
        ),
        Effect.scoped,
        Effect.map(HttpServerResponse.toWeb)
      ),
      { signal: request.signal }
    ),
};
