import { WhatTaxServerLayer } from "@whattax/http-api/server";
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
      address: {
        _tag: "TcpAddress",
        hostname: config.host,
        port: config.port,
      },
      serve: (httpEffect, middleware) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const handler = HttpEffect.toWebHandler(
              middleware === undefined ? httpEffect : middleware(httpEffect)
            );

            return Bun.serve({
              fetch: (request) => handler(request),
              hostname: config.host,
              port: config.port,
            });
          }),
          (server) => Effect.sync(() => server.stop(true))
        ).pipe(Effect.asVoid),
    });
  })
);

const ApiRoutesLive = WhatTaxServerLayer.pipe(Layer.provide(HttpRouter.cors()));

const ApiHttpServerLive = HttpRouter.serve(ApiRoutesLive).pipe(
  Layer.provide(BunHttpServerLive.pipe(Layer.provide(ApiServerConfigLive)))
);

export const ApiAppLayer = Layer.mergeAll(
  ApiServerConfigLive,
  ApiHttpServerLive
);
