import { Layer } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { HttpApiClient } from "effect/unstable/httpapi";

import { TaxKitApi } from "../api.js";
import { TaxKitHttpApiService } from "./service.js";

export type InProcessTaxKitApiHandler = (request: Request) => Promise<Response>;

const makeInProcessFetch = (handler: InProcessTaxKitApiHandler) => {
  const fetch: typeof globalThis.fetch = (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => handler(new Request(input, init));

  return fetch;
};

export const makeInProcessFetchLayer = (handler: InProcessTaxKitApiHandler) =>
  Layer.succeed(FetchHttpClient.Fetch, makeInProcessFetch(handler));

export const makeTaxKitApiInProcessClientLayer = (
  handler: InProcessTaxKitApiHandler
) => {
  const InProcessHttpClientLive = FetchHttpClient.layer.pipe(
    Layer.provide(makeInProcessFetchLayer(handler))
  );

  return Layer.effect(
    TaxKitHttpApiService,
    HttpApiClient.make(TaxKitApi, {
      baseUrl: "http://taxkit.internal",
    })
  ).pipe(Layer.provide(InProcessHttpClientLive));
};
