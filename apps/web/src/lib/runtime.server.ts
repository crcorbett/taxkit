import "@tanstack/react-start/server-only";
import { createTaxKitApiClientLayer } from "@taxkit/api-http/client/live";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";

import { TaxKitWebConfigError } from "./config";
import {
  TaxKitWebServerConfig,
  TaxKitWebServerConfigProviderLive,
} from "./config.server";

const TaxKitApiClientLive = Layer.unwrap(
  Effect.gen(function* makeTaxKitApiClientLive() {
    const config = yield* TaxKitWebServerConfig;
    return createTaxKitApiClientLayer({ baseUrl: config.httpApi.baseUrl });
  }).pipe(
    Effect.mapError(
      (cause) =>
        new TaxKitWebConfigError({
          cause,
          message: `Invalid TaxKit web server config: ${cause.message}`,
        })
    )
  )
).pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(TaxKitWebServerConfigProviderLive)
);

export const appRuntime = ManagedRuntime.make(TaxKitApiClientLive);
