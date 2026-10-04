import { Layer } from "effect";
import type { HttpClient } from "effect/http/HttpClient";

import { createTaxKitApiClient } from "./index.js";
import { TaxKitHttpApiService } from "./service.js";

export interface MakeTaxKitApiClientLayerOptions {
  readonly baseUrl?: URL | string | undefined;
  readonly transformClient?: (client: HttpClient) => HttpClient;
}

export const createTaxKitApiClientLayer = (
  options: MakeTaxKitApiClientLayerOptions = {}
) => Layer.effect(TaxKitHttpApiService, createTaxKitApiClient(options));

/** @deprecated Use `createTaxKitApiClientLayer`. */
export const makeTaxKitApiClientLayer = (
  options: MakeTaxKitApiClientLayerOptions = {}
) => createTaxKitApiClientLayer(options);
