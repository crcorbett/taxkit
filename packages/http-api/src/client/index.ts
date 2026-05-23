import type * as EffectTypes from "effect/Effect";
import type { HttpClient } from "effect/unstable/http/HttpClient";
import { HttpApiClient } from "effect/unstable/httpapi";

import { WhatTaxApi } from "../api.js";

export interface WhatTaxApiClientOptions {
  readonly baseUrl?: URL | string | undefined;
  readonly transformClient?: (client: HttpClient) => HttpClient;
}

export const makeWhatTaxApiClient = (options: WhatTaxApiClientOptions = {}) =>
  HttpApiClient.make(WhatTaxApi, {
    baseUrl: options.baseUrl,
    transformClient: options.transformClient,
  });

export type WhatTaxApiClient = EffectTypes.Success<
  ReturnType<typeof makeWhatTaxApiClient>
>;

export {
  getWhatTaxHttpApiClient,
  WhatTaxHttpApiService,
  withWhatTaxHttpApiClient,
} from "./service.js";
