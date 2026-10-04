import { TaxKitApiRoutesLayer } from "@taxkit/api-http/server";
import { TaxKitRpcHttpLayer } from "@taxkit/api-rpc/server";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { safeHttpEffect } from "alchemy/Http";
import { Effect, Layer } from "effect";
import { HttpMiddleware, HttpRouter, HttpServerResponse } from "effect/http";

import { withApiRequestBodyLimit } from "./worker-request.boundary.js";
import { ApiSafeTelemetryLive } from "./worker-telemetry.layer.js";
import { ApiWorkerSettingsConfig } from "./worker.config.js";

// Construct once in the native instance scope. Both transports receive this
// same application service; native requests keep their own scope and fibre.
export const ApiWorkerApplication = Effect.gen(function* () {
  // Native planning binds deferred resource addresses. Read their runtime
  // values once on first incoming use, without inventing planning URLs.
  const settings = yield* Effect.cached(ApiWorkerSettingsConfig);
  const telemetry = yield* Layer.build(ApiSafeTelemetryLive);
  const calculator = Layer.succeed(
    PublicCalculatorService,
    yield* PublicCalculatorService
  );
  const routes = Layer.mergeAll(
    TaxKitApiRoutesLayer,
    TaxKitRpcHttpLayer.pipe(Layer.provide(calculator))
  ).pipe(HttpRouter.provideRequest(calculator));
  const handler = yield* HttpRouter.toHttpEffect(routes).pipe(
    Effect.provideContext(telemetry)
  );

  return {
    fetch: safeHttpEffect(
      Effect.gen(function* () {
        const config = yield* settings;
        return yield* withApiRequestBodyLimit(handler).pipe(
          HttpMiddleware.cors({
            allowedHeaders: ["content-type"],
            allowedMethods: ["GET", "POST", "OPTIONS"],
            // The native predicate checks the actual request origin.
            allowedOrigins: (origin) => origin === config.websiteOrigin.origin,
            credentials: false,
          })
        );
      }).pipe(
        Effect.catchTag("ConfigError", () =>
          Effect.succeed(HttpServerResponse.empty({ status: 503 }))
        )
      )
    ).pipe(Effect.provideContext(telemetry)),
  };
});
