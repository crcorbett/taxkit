import { Layer } from "effect";
import { HttpApiClient } from "effect/http-api";
import * as FetchHttpClient from "effect/http/FetchHttpClient";

import { TaxKitApi } from "../api.js";
import { TaxKitHttpApiService } from "./service.js";

// Fetch requires a Promise-returning host signature. This adapter only forwards
// the request; it owns no Promise orchestration or Effect execution. HTTP
// integration tests exercise this bridge; native app composition replaces it
// in the clean-slate migration.
export type InProcessTaxKitApiHandler = (request: Request) => Promise<Response>;

const makeInProcessFetch = (handler: InProcessTaxKitApiHandler) => {
  const fetch: typeof globalThis.fetch = (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => handler(new Request(input, init));

  return fetch;
};

const makeInProcessFetchLayer = (handler: InProcessTaxKitApiHandler) =>
  Layer.succeed(FetchHttpClient.Fetch, makeInProcessFetch(handler));

export const createTaxKitApiInProcessClientLayer = (
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
