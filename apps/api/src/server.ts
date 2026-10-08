import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { TaxKitServerLayer } from "@taxkit/api-http/server";
import { Effect, Layer } from "effect";
import * as HttpRouter from "effect/http/HttpRouter";

import { ApiServerConfig, ApiServerConfigLive } from "./config.js";
import { ApiContentLive } from "./content.boundary.js";

const BunHttpServerLive = Layer.unwrap(
  ApiServerConfig.pipe(
    Effect.map(({ address }) =>
      BunHttpServer.layerServer({
        hostname: address.hostname,
        port: address.port,
      })
    )
  )
).pipe(Layer.provide(ApiServerConfigLive));

const ApiHttpServerLive = HttpRouter.serve(TaxKitServerLayer).pipe(
  Layer.provide(ApiContentLive),
  Layer.provide(BunHttpServerLive)
);

export const ApiAppLayer = Layer.mergeAll(
  ApiServerConfigLive,
  ApiHttpServerLive
);
