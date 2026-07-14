import { WhatTaxServerLayer } from "@whattax/api-http/server";
import { Effect, Layer } from "effect";
import * as HttpEffect from "effect/unstable/http/HttpEffect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";

import { ApiServerConfig, ApiServerConfigLive } from "./config.js";

const BunHttpServerLive = Layer.effect(
  HttpServer.HttpServer,
  Effect.gen(function* makeBunHttpServer() {
    const config = yield* ApiServerConfig;

    return HttpServer.make({
      address: config.address,
      serve: (httpEffect, middleware) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const handler = HttpEffect.toWebHandler(
              middleware === undefined ? httpEffect : middleware(httpEffect)
            );

            return Bun.serve({
              fetch: (request) => handler(request),
              hostname: config.address.hostname,
              port: config.address.port,
            });
          }),
          (server) => Effect.promise(() => server.stop(true))
        ).pipe(Effect.asVoid),
    });
  })
);

const ApiHttpServerLive = HttpRouter.serve(WhatTaxServerLayer).pipe(
  Layer.provide(BunHttpServerLive.pipe(Layer.provide(ApiServerConfigLive)))
);

export const ApiAppLayer = Layer.mergeAll(
  ApiServerConfigLive,
  ApiHttpServerLive
);
