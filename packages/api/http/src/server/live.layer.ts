import { PublicCalculatorServiceLive } from "@taxkit/calculators";
import { PublicCalculatorServiceBounded } from "@taxkit/calculators/work";
import { CalculationEngineLive } from "@taxkit/core";
import { Effect, Layer } from "effect";
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import * as HttpServerResponse from "effect/http/HttpServerResponse";

import { TaxKitApi } from "../api.js";
import { CalculatorApiHandlerLive } from "../handlers/calculators.js";
import { HealthHandlerLive } from "../handlers/health.js";
import { taxKitOpenApiSpec } from "../openapi.js";

const ApiRoutes = HttpApiBuilder.layer(TaxKitApi).pipe(
  Layer.provide(CalculatorApiHandlerLive),
  Layer.provide(HealthHandlerLive)
);

const DocsRouteLayer = HttpApiScalar.layer(TaxKitApi, {
  path: "/api/docs",
});

const OpenApiRouteLayer = HttpRouter.add(
  "GET",
  "/api/docs/openapi.json",
  Effect.succeed(HttpServerResponse.jsonUnsafe(taxKitOpenApiSpec))
);

// Hosts supply their shared application service and origin policy. Retain the
// existing standalone Layer below for existing Bun and in-process consumers.
export const ApiRoutesLayer = Layer.mergeAll(
  ApiRoutes,
  DocsRouteLayer,
  OpenApiRouteLayer
).pipe(Layer.provide(HttpServer.layerServices));

export const ApiRoutesLive = ApiRoutesLayer.pipe(
  HttpRouter.provideRequest(
    PublicCalculatorServiceBounded.pipe(
      Layer.provide(PublicCalculatorServiceLive),
      Layer.provide(CalculationEngineLive)
    )
  ),
  Layer.provide(HttpRouter.cors())
);
