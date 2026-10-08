import type * as EffectTypes from "effect/Effect";
import { HttpApiClient } from "effect/http-api";
import type { HttpClient } from "effect/http/HttpClient";

import { TaxKitApi } from "../api.js";

export interface TaxKitApiClientOptions {
  readonly baseUrl?: URL | string | undefined;
  readonly transformClient?: (client: HttpClient) => HttpClient;
}

export const createTaxKitApiClient = (options: TaxKitApiClientOptions = {}) =>
  HttpApiClient.make(TaxKitApi, {
    baseUrl: options.baseUrl,
    transformClient: options.transformClient,
  });

/** @deprecated Use `createTaxKitApiClient`. */
export const makeTaxKitApiClient = (options: TaxKitApiClientOptions = {}) =>
  createTaxKitApiClient(options);

export type TaxKitApiClient = EffectTypes.Success<
  ReturnType<typeof createTaxKitApiClient>
>;

export {
  getTaxKitHttpApiClient,
  TaxKitHttpApiService,
  withTaxKitHttpApiClient,
} from "./service.js";
