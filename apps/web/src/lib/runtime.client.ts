import { makeTaxKitApiClientLayer } from "@taxkit/api-http/client/live";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

import { TaxKitWebConfigError } from "./config";
import {
  TaxKitWebClientConfig,
  TaxKitWebClientConfigProviderLive,
} from "./config.client";

const TaxKitApiClientLive = Layer.unwrap(
  Effect.gen(function* makeTaxKitApiClientLive() {
    const config = yield* TaxKitWebClientConfig;
    return makeTaxKitApiClientLayer({ baseUrl: config.httpApi.baseUrl });
  }).pipe(
    Effect.mapError(
      (cause) =>
        new TaxKitWebConfigError({
          cause,
          message: `Invalid TaxKit web client config: ${cause.message}`,
        })
    )
  )
).pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(TaxKitWebClientConfigProviderLive)
);

export const appRuntime = ManagedRuntime.make(TaxKitApiClientLive);
