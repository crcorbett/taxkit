import { Layer } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { HttpApiClient } from "effect/unstable/httpapi";

import { WhatTaxApi } from "../api.js";
import { WhatTaxHttpApiService } from "./service.js";

export type InProcessWhatTaxApiHandler = (
  request: Request
) => Promise<Response>;

const makeInProcessFetch = (handler: InProcessWhatTaxApiHandler) => {
  const fetchStatics = globalThis.fetch as typeof fetch & {
    readonly preconnect?: unknown;
  };

  return Object.assign(
    async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1]
    ) => await handler(new Request(input, init)),
    "preconnect" in fetchStatics ? { preconnect: fetchStatics.preconnect } : {}
  ) as typeof fetch;
};

export const makeInProcessFetchLayer = (handler: InProcessWhatTaxApiHandler) =>
  Layer.succeed(FetchHttpClient.Fetch, makeInProcessFetch(handler));

export const makeWhatTaxApiInProcessClientLayer = (
  handler: InProcessWhatTaxApiHandler
) => {
  const InProcessHttpClientLive = FetchHttpClient.layer.pipe(
    Layer.provide(makeInProcessFetchLayer(handler))
  );

  return Layer.effect(
    WhatTaxHttpApiService,
    HttpApiClient.make(WhatTaxApi, {
      baseUrl: "http://whattax.internal",
    })
  ).pipe(Layer.provide(InProcessHttpClientLive));
};
