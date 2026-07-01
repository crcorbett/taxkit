import { makeWhatTaxApiClientLayer } from "@whattax/api-http/client/live";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

import { WhatTaxWebConfigError } from "./config";
import {
  WhatTaxWebClientConfig,
  WhatTaxWebClientConfigProviderLive,
} from "./config.client";

const WhatTaxApiClientLive = Layer.unwrap(
  Effect.gen(function* makeWhatTaxApiClientLive() {
    const config = yield* WhatTaxWebClientConfig;
    return makeWhatTaxApiClientLayer({ baseUrl: config.httpApi.baseUrl });
  }).pipe(
    Effect.mapError(
      (cause) =>
        new WhatTaxWebConfigError({
          cause,
          message: `Invalid WhatTax web client config: ${cause.message}`,
        })
    )
  )
).pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(WhatTaxWebClientConfigProviderLive)
);

export const appRuntime = ManagedRuntime.make(WhatTaxApiClientLive);
