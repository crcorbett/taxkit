import { makeWhatTaxApiClientLayer } from "@whattax/http-api/client/live";
import { Layer, ManagedRuntime } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

const WhatTaxApiClientLive = makeWhatTaxApiClientLayer().pipe(
  Layer.provide(FetchHttpClient.layer)
);

export const appRuntime = ManagedRuntime.make(WhatTaxApiClientLive);
