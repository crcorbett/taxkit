import { TaxKitApi } from "@taxkit/api-http/api";
import { Context, Effect, Layer, Option } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientError,
  HttpClientRequest,
} from "effect/http";
import * as Atom from "effect/reactivity/Atom";
import * as AtomHttpApi from "effect/reactivity/AtomHttpApi";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import { BrowserCalculatorPolicyLive } from "../calculator-policy.browser.layer";
import type { WebsitePublicSettings } from "../schemas";
import { boundedResponses } from "./bounded-response";

// Root settings seeded once from the server render. They stay alive for the
// registry's lifetime so an idle page keeps its configuration.
export const publicSettingsAtom = Atom.make(
  Option.none<WebsitePublicSettings>()
).pipe(Atom.keepAlive);

// The one application runtime factory. Native service runtimes share it and
// the router/React registry.
const browserRuntime = Atom.runtime(Layer.empty);

const browserTransportAtom = Atom.make(
  FetchHttpClient.layer.pipe(
    Layer.provide(
      Layer.succeed(FetchHttpClient.RequestInit, {
        credentials: "omit",
        redirect: "error",
      })
    )
  )
).pipe(Atom.keepAlive);

/**
 * The native generated public API client for browser loaders, components and
 * page tools. It owns encoding, decoding and declared errors; replies are
 * read with the Website's 2 MiB bound.
 */
export class ApiClient extends AtomHttpApi.Service<ApiClient>()(
  "taxkit/web/ApiClient",
  {
    api: TaxKitApi,
    httpClient: (get) =>
      Layer.effect(
        HttpClient.HttpClient,
        HttpClient.HttpClient.pipe(
          Effect.map((client) =>
            Option.match(get(publicSettingsAtom), {
              onNone: () =>
                client.pipe(
                  HttpClient.mapRequestEffect((request) =>
                    Effect.fail(
                      new HttpClientError.HttpClientError({
                        reason: new HttpClientError.InvalidUrlError({
                          description: "TaxKit API settings are unavailable",
                          request,
                        }),
                      })
                    )
                  )
                ),
              onSome: (settings) =>
                client.pipe(
                  HttpClient.mapRequest(
                    HttpClientRequest.prependUrl(settings.apiOrigin.origin)
                  ),
                  boundedResponses,
                  // Browser calls carry no b3/traceparent correlation headers.
                  HttpClient.transformResponse(
                    Effect.provideService(
                      HttpClient.TracerDisabledWhen,
                      () => true
                    )
                  )
                ),
            })
          )
        )
      ).pipe(
        Layer.provide(BrowserCalculatorPolicyLive),
        Layer.provide(get(browserTransportAtom))
      ),
    runtime: browserRuntime.factory,
  }
) {}

// Native retention keeps the client available between route loads and shares
// it with component queries that use `ApiClient.runtime`.
export const apiClientRuntime = ApiClient.runtime.pipe(Atom.keepAlive);

export const browserApiClient = Atom.getResult(apiClientRuntime, {
  suspendOnWaiting: true,
}).pipe(Effect.map(Context.get(ApiClient)));

// TanStack creates its router before loaders or React run. This one registry
// is shared by browser loaders and React's RegistryContext.
export const createLoaderRegistry = () => Option.some(AtomRegistry.make());
