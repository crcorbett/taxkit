import { makeWhatTaxApiClientLayer } from "@whattax/http-api/client/live";
import { Layer, ManagedRuntime } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

const defaultApiBaseUrl = "http://127.0.0.1:4000";

const getClientApiBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env.VITE_WHATTAX_API_BASE_URL;

  return typeof configuredBaseUrl === "string" &&
    configuredBaseUrl.trim() !== ""
    ? configuredBaseUrl.trim()
    : defaultApiBaseUrl;
};

const WhatTaxApiClientLive = makeWhatTaxApiClientLayer({
  baseUrl: getClientApiBaseUrl(),
}).pipe(Layer.provide(FetchHttpClient.layer));

export const appRuntime = ManagedRuntime.make(WhatTaxApiClientLive);
