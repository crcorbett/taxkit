import { Layer } from "effect";
import type { HttpClient } from "effect/unstable/http/HttpClient";

import { makeWhatTaxApiClient } from "./index.js";
import { WhatTaxHttpApiService } from "./service.js";

export interface MakeWhatTaxApiClientLayerOptions {
  readonly baseUrl?: URL | string | undefined;
  readonly transformClient?: (client: HttpClient) => HttpClient;
}

export const makeWhatTaxApiClientLayer = (
  options: MakeWhatTaxApiClientLayerOptions = {}
) => Layer.effect(WhatTaxHttpApiService, makeWhatTaxApiClient(options));
