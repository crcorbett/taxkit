import "@tanstack/react-start/server-only";
import { makeWhatTaxApiClientLayer } from "@whattax/http-api/client/live";
import { Layer, ManagedRuntime } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

const defaultApiBaseUrl = "http://127.0.0.1:4000";

const getServerApiBaseUrl = (env: NodeJS.ProcessEnv = process.env): string => {
  const configuredBaseUrl =
    env.WHATTAX_API_BASE_URL ?? env.VITE_WHATTAX_API_BASE_URL;

  return configuredBaseUrl?.trim() || defaultApiBaseUrl;
};

const WhatTaxApiClientLive = makeWhatTaxApiClientLayer({
  baseUrl: getServerApiBaseUrl(),
}).pipe(Layer.provide(FetchHttpClient.layer));

export const appRuntime = ManagedRuntime.make(WhatTaxApiClientLive);
