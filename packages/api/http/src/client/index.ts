import type * as EffectTypes from "effect/Effect";
import type { HttpClient } from "effect/unstable/http/HttpClient";
import { HttpApiClient } from "effect/unstable/httpapi";

import { TaxKitApi } from "../api.js";

export interface TaxKitApiClientOptions {
  readonly baseUrl?: URL | string | undefined;
  readonly transformClient?: (client: HttpClient) => HttpClient;
}

export const makeTaxKitApiClient = (options: TaxKitApiClientOptions = {}) =>
  HttpApiClient.make(TaxKitApi, {
    baseUrl: options.baseUrl,
    transformClient: options.transformClient,
  });

export type TaxKitApiClient = EffectTypes.Success<
  ReturnType<typeof makeTaxKitApiClient>
>;

export {
  getTaxKitHttpApiClient,
  TaxKitHttpApiService,
  withTaxKitHttpApiClient,
} from "./service.js";
