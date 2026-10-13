import { Effect, Layer } from "effect";
import {
  HttpClient,
  HttpRouter,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { TaxKitServerLayer } from "./server.js";

// An HttpClient that answers from the TaxKit HTTP routes in this process, for
// tests and examples. Use it under the native generated client:
// `HttpApiClient.make(TaxKitApi, { baseUrl })`. The caller supplies accepted
// content; each request has its own closing scope.
export const TaxKitApiInProcessLive = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const handler = yield* HttpRouter.toHttpEffect(TaxKitServerLayer);
    return HttpClient.make((request) =>
      handler.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromClientRequest(request)
        ),
        Effect.catchCause((cause) =>
          HttpServerError.causeResponse(cause).pipe(
            Effect.map(([response]) => response)
          )
        ),
        Effect.map((response) =>
          HttpServerResponse.toClientResponse(response, { request })
        ),
        Effect.scoped
      )
    );
  })
);
