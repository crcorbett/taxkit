import { createTaxKitApiClientLayer } from "@taxkit/api-http/client/live";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";

import {
  TaxKitWebClientConfig,
  TaxKitWebClientConfigProviderLive,
} from "./config.client";

const TaxKitApiClientLive = Layer.unwrap(
  Effect.gen(function* makeTaxKitApiClientLive() {
    const config = yield* TaxKitWebClientConfig;
    return createTaxKitApiClientLayer({ baseUrl: config.httpApi.baseUrl });
  })
).pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(TaxKitWebClientConfigProviderLive)
);

export const appRuntime = ManagedRuntime.make(TaxKitApiClientLive);
