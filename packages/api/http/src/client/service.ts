import { Context, Effect } from "effect";

import type { TaxKitApiClient } from "./index.js";

export class TaxKitHttpApiService extends Context.Service<
  TaxKitHttpApiService,
  TaxKitApiClient
>()("@taxkit/api-http/Client") {}

export const getTaxKitHttpApiClient = TaxKitHttpApiService;

export const withTaxKitHttpApiClient = <A, E, R>(
  fn: (client: TaxKitApiClient) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | TaxKitHttpApiService> =>
  Effect.gen(function* () {
    const client = yield* TaxKitHttpApiService;
    return yield* fn(client);
  });
