import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { TaxKitServerLayer } from "@taxkit/api-http/server";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
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

// The standalone host chooses the bounded calculator service; the HTTP package
// leaves it open so each host composes its own.
const ApiHttpServerLive = HttpRouter.serve(TaxKitServerLayer).pipe(
  Layer.provide(PublicCalculatorServiceLive),
  Layer.provide(ApiContentLive),
  Layer.provide(BunHttpServerLive)
);

export const ApiAppLayer = Layer.mergeAll(
  ApiServerConfigLive,
  ApiHttpServerLive
);
