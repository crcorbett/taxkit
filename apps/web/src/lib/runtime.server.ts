import "@tanstack/react-start/server-only";
import { makeWhatTaxApiClientLayer } from "@whattax/api-http/client/live";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

import { WhatTaxWebConfigError } from "./config";
import {
  WhatTaxWebServerConfig,
  WhatTaxWebServerConfigProviderLive,
} from "./config.server";

const WhatTaxApiClientLive = Layer.unwrap(
  Effect.gen(function* makeWhatTaxApiClientLive() {
    const config = yield* WhatTaxWebServerConfig;
    return makeWhatTaxApiClientLayer({ baseUrl: config.httpApi.baseUrl });
  }).pipe(
    Effect.mapError(
      (cause) =>
        new WhatTaxWebConfigError({
          cause,
          message: `Invalid WhatTax web server config: ${cause.message}`,
        })
    )
  )
).pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(WhatTaxWebServerConfigProviderLive)
);

export const appRuntime = ManagedRuntime.make(WhatTaxApiClientLive);
