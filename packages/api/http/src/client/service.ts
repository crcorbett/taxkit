import { Context, Effect } from "effect";

import type { WhatTaxApiClient } from "./index.js";

export class WhatTaxHttpApiService extends Context.Service<
  WhatTaxHttpApiService,
  WhatTaxApiClient
>()("@whattax/api-http/Client") {}

export const getWhatTaxHttpApiClient = WhatTaxHttpApiService;

export const withWhatTaxHttpApiClient = <A, E, R>(
  fn: (client: WhatTaxApiClient) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | WhatTaxHttpApiService> =>
  Effect.gen(function* () {
    const client = yield* WhatTaxHttpApiService;
    return yield* fn(client);
  });
