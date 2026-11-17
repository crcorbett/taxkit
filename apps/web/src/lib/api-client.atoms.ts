import { TaxKitApi } from "@taxkit/api-http/api";
import { boundedReplies } from "@taxkit/api-http/requests";
import { Context, Effect, Layer, Option } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import * as Atom from "effect/reactivity/Atom";
import * as AtomHttpApi from "effect/reactivity/AtomHttpApi";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import { TaxKitWebConfigError } from "./host/errors";
import type { WebsitePublicSettings } from "./host/schemas";

// Root settings seeded once from the server render. They stay alive for the
// registry's lifetime so an idle page keeps its configuration.
export const publicSettingsAtom = Atom.make(
  Option.none<WebsitePublicSettings>()
).pipe(Atom.keepAlive);

// Missing browser settings have their own named failure. Every browser read
// checks them before it acquires the API client, so the failure is never
// disguised as an unreachable API.
export const browserSettingsUnavailable = new TaxKitWebConfigError({
  message: "TaxKit web settings are missing or invalid.",
  operation: "settings",
  runtime: "client",
});
export const browserSettings = AtomRegistry.AtomRegistry.pipe(
  Effect.map((registry) => registry.get(publicSettingsAtom)),
  Effect.flatMap(Effect.fromOption),
  Effect.mapError(() => browserSettingsUnavailable)
);

// The one application runtime factory. Native service runtimes share it and
// the router/React registry.
export const browserRuntime = Atom.runtime(Layer.empty);

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
              // Callers check settings before acquiring this client, so a
              // request without them is a broken invariant, not an outage.
              onNone: () =>
                client.pipe(
                  HttpClient.mapRequestEffect(() =>
                    Effect.die(browserSettingsUnavailable)
                  )
                ),
              onSome: (settings) =>
                client.pipe(
                  HttpClient.mapRequest(
                    HttpClientRequest.prependUrl(settings.apiOrigin.origin)
                  ),
                  boundedReplies,
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
      ).pipe(Layer.provide(get(browserTransportAtom))),
    runtime: browserRuntime.factory,
  }
) {}

// Native retention keeps the client available between route loads and shares
// it with component queries that use `ApiClient.runtime`.
export const apiClientRuntime = ApiClient.runtime.pipe(Atom.keepAlive);

// Loader reads: checked settings first, then the shared generated client.
export const browserApiClient = browserSettings.pipe(
  Effect.andThen(
    Atom.getResult(apiClientRuntime, {
      suspendOnWaiting: true,
    })
  ),
  Effect.map(Context.get(ApiClient))
);

// TanStack creates its router before loaders or React run. This one registry
// is shared by browser loaders and React's RegistryContext.
export const createLoaderRegistry = () => Option.some(AtomRegistry.make());
