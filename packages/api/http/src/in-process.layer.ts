import { Effect, Layer } from "effect";
import {
  HttpClient,
  HttpRouter,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { HttpApiClient } from "effect/http-api";

import { TaxKitApi } from "../api.js";
import { TaxKitServerLayer } from "../server.js";
import { TaxKitHttpApiService } from "./service.js";

// The caller supplies accepted content. Native request Effects share the
// caller's Layer lifetime and each request has its own closing scope.
export const TaxKitApiInProcessClientLive = Layer.effect(
  TaxKitHttpApiService,
  Effect.gen(function* () {
    const handler = yield* HttpRouter.toHttpEffect(TaxKitServerLayer);
    const client = HttpClient.make((request) =>
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
    return yield* HttpApiClient.make(TaxKitApi, {
      baseUrl: "http://taxkit.internal",
    }).pipe(Effect.provideService(HttpClient.HttpClient, client));
  })
);
