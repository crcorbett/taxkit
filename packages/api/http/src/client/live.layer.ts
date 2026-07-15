import { Layer } from "effect";
import type { HttpClient } from "effect/unstable/http/HttpClient";

import { makeTaxKitApiClient } from "./index.js";
import { TaxKitHttpApiService } from "./service.js";

export interface MakeTaxKitApiClientLayerOptions {
  readonly baseUrl?: URL | string | undefined;
  readonly transformClient?: (client: HttpClient) => HttpClient;
}

export const makeTaxKitApiClientLayer = (
  options: MakeTaxKitApiClientLayerOptions = {}
) => Layer.effect(TaxKitHttpApiService, makeTaxKitApiClient(options));
