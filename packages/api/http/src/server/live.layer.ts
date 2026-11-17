import { PublicCalculatorService } from "@taxkit/calculators/service";
import { inputValidationError } from "@taxkit/core/errors";
import { Effect, Layer } from "effect";
import { HttpApiBuilder, HttpApiScalar, HttpApiError } from "effect/http-api";
import * as HttpMiddleware from "effect/http/HttpMiddleware";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import * as HttpServerResponse from "effect/http/HttpServerResponse";

import { TaxKitApi } from "../api.js";
import { CalculatorApiHandlerLive } from "../handlers/calculators.js";
import { ContentApiHandlerLive } from "../handlers/content.js";
import { HealthHandlerLive } from "../handlers/health.js";
import { taxKitOpenApiSpec } from "../openapi.js";
import { withCalculatorRequestBodyLimit } from "../request-boundary.js";
import { publicCors } from "../response-policy.js";
import { openApiPath, referencePath } from "../routes.js";

const ApiRoutes = HttpApiBuilder.layer(TaxKitApi).pipe(
  Layer.provide(CalculatorApiHandlerLive),
  Layer.provide(ContentApiHandlerLive),
  Layer.provide(HealthHandlerLive),
  Layer.provide(
    HttpRouter.middleware((handler) =>
      handler.pipe(
        Effect.catchDefect((failure) => {
          if (
            HttpApiError.HttpApiSchemaError.is(failure) &&
            failure.kind === "Payload"
          ) {
            return Effect.succeed(
              HttpServerResponse.jsonUnsafe(
                { error: inputValidationError(failure.cause.issue) },
                { status: 400 }
              )
            );
          }
          return Effect.die(failure);
        })
      )
    ).layer
  )
);

const DocsRouteLayer = HttpApiScalar.layer(TaxKitApi, {
  path: referencePath,
});

const OpenApiRouteLayer = HttpRouter.add(
  "GET",
  openApiPath,
  Effect.succeed(HttpServerResponse.jsonUnsafe(taxKitOpenApiSpec))
);

// The public HTTP routes. Request handlers require the calculator and content
// services; a host supplies them with its own origin and body policy.
export const TaxKitApiRoutesLayer = Layer.mergeAll(
  ApiRoutes,
  DocsRouteLayer,
  OpenApiRouteLayer
).pipe(Layer.provide(HttpServer.layerServices));

// The standalone server: the routes with the shared body limit and public CORS.
// The calculator service is read once, when the router is built, from the
// host's composition; `ContentService` stays a request requirement.
export const TaxKitServerLayer = TaxKitApiRoutesLayer.pipe(
  HttpRouter.provideRequest(
    Layer.effect(PublicCalculatorService, PublicCalculatorService)
  ),
  Layer.provide(
    HttpRouter.middleware((handler) =>
      withCalculatorRequestBodyLimit({ handler })
    ).layer
  ),
  Layer.provide(
    HttpRouter.middleware(HttpMiddleware.cors(publicCors), { global: true })
  )
);
