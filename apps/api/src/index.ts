import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import { Console, Effect } from "effect";

import { ApiServerConfig } from "./config.js";
import { ApiAppLayer } from "./server.js";

const ApiMain = Effect.gen(function* apiMain() {
  const config = yield* ApiServerConfig;

  yield* Console.info(
    `WhatTax API listening on http://${config.address.hostname}:${config.address.port}`
  );

  return yield* Effect.never;
}).pipe(
  Effect.ensuring(Console.info("WhatTax API stopped")),
  Effect.provide(ApiAppLayer)
);

BunRuntime.runMain(ApiMain);
