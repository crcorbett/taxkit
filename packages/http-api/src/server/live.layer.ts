import { Effect, Layer } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import {
  HttpApiBuilder,
  HttpApiScalar,
  OpenApi,
} from "effect/unstable/httpapi";

import { WhatTaxApi } from "../api.js";
import { PublicCalculationMetadataHandlerLive } from "../handlers/calculators.js";
import { HealthHandlerLive } from "../handlers/health.js";

const ApiRoutes = HttpApiBuilder.layer(WhatTaxApi).pipe(
  Layer.provide(PublicCalculationMetadataHandlerLive),
  Layer.provide(HealthHandlerLive)
);

const openApiSpec = OpenApi.fromApi(WhatTaxApi);

const DocsRouteLayer = HttpApiScalar.layer(WhatTaxApi, {
  path: "/api/docs",
});

const OpenApiRouteLayer = HttpRouter.add(
  "GET",
  "/api/docs/openapi.json",
  Effect.succeed(HttpServerResponse.jsonUnsafe(openApiSpec))
);

export const ApiRoutesLive = Layer.mergeAll(
  ApiRoutes,
  DocsRouteLayer,
  OpenApiRouteLayer
).pipe(
  Layer.provide(HttpServer.layerServices),
  Layer.provide(HttpRouter.cors())
);
