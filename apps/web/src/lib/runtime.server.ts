import "@tanstack/react-start/server-only";
import type { NotFoundError } from "@tanstack/react-router";
import { setResponseStatus } from "@tanstack/react-start/server";
import { WebsiteHostTelemetryLive } from "@taxkit/api-rpc/host-telemetry";
import { env } from "cloudflare:workers";
import {
  Cause,
  ConfigProvider,
  Effect,
  Layer,
  ManagedRuntime,
  Schema,
} from "effect";
import { FetchHttpClient } from "effect/http";

import { WebsiteAnalyticsRelayLive } from "./analytics/relay/relay.adapter.layer";
import type { WebsiteLoadError } from "./api/errors";
import { WebsiteHost, WebsiteHostLive } from "./api/host.server";
import { readCatalogue, readDocsPage, readDocsSearch } from "./api/requests";
import { WebsiteBindings, websiteConfigProvider } from "./config.server";
import { preloadDocsPresentation } from "./docs/mdx.boundary";
import type { WebsiteDocsSearchQuery } from "./docs/search-location.boundary";
import { loadFailureStatus, rejectRouteLoad } from "./load.failure";
import { WebsiteDocsSearchView, WebsiteRootView } from "./schemas";
import type { WebsiteServerRenderContext } from "./schemas";

// The Worker's bindings object, read at this host edge only.
const bindings = Layer.sync(WebsiteBindings, () => ({ ...env }));

// One server runner per loaded Worker module. It supplies native API clients
// and the analytics relay, never a backend implementation; each request
// supplies its own signal.
export const runtime = ManagedRuntime.make(
  Layer.mergeAll(
    WebsiteHostLive,
    WebsiteHostTelemetryLive,
    WebsiteAnalyticsRelayLive.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(
        Layer.unwrap(Effect.map(websiteConfigProvider, ConfigProvider.layer))
      )
    )
  ).pipe(Layer.provide(bindings))
);

// Server loads report their HTTP status before TanStack renders the native
// not-found or error component. Cancellation stays interruption.
const rejectServerLoad = <E>(
  cause: Cause.Cause<E>
): Effect.Effect<never, E | NotFoundError | WebsiteLoadError> =>
  Cause.hasInterruptsOnly(cause)
    ? Effect.failCause(cause)
    : Effect.sync(() => setResponseStatus(loadFailureStatus(cause))).pipe(
        Effect.andThen(rejectRouteLoad(cause))
      );

const client = WebsiteHost.pipe(
  Effect.flatMap((host) => Effect.fromResult(host.client))
);

// A no-JavaScript calculation result is personal: it comes from this
// request's server context and is returned beside, not inside, public data.
export const loadRoot = ({
  signal,
  submission,
}: Readonly<{
  signal: AbortSignal;
  submission: WebsiteServerRenderContext["submission"];
}>) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const host = yield* WebsiteHost;
      const settings = yield* Effect.fromResult(host.settings);
      // The catalogue is optional page chrome; its absence is shown in place.
      const catalogue = yield* client.pipe(
        Effect.flatMap(readCatalogue),
        Effect.option
      );
      return {
        submission,
        view: yield* Schema.encodeEffect(WebsiteRootView)({
          catalogue,
          settings,
        }),
      };
    }).pipe(Effect.catchCause(rejectServerLoad)),
    { signal }
  );

export const loadDocsPage = ({
  path,
  signal,
}: Readonly<{ path: string; signal: AbortSignal }>) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const host = yield* WebsiteHost;
      const settings = yield* Effect.fromResult(host.settings);
      const { navigation, page } = yield* readDocsPage(yield* client, path);
      yield* preloadDocsPresentation(page);
      return {
        navigation,
        page,
        publicationOrigin: settings.publicationOrigin.href,
      };
    }).pipe(Effect.catchCause(rejectServerLoad)),
    { signal }
  );

export const loadDocsSearch = ({
  query,
  signal,
}: Readonly<{ query: WebsiteDocsSearchQuery; signal: AbortSignal }>) =>
  runtime.runPromise(
    Effect.fromResult(query).pipe(
      Effect.matchEffect({
        // Invalid search words are a normal page state, not a failed load.
        onFailure: () => Effect.succeed(WebsiteDocsSearchView.InvalidSearch()),
        onSuccess: (term) =>
          client.pipe(
            Effect.flatMap((generated) => readDocsSearch(generated, term)),
            Effect.map((found) =>
              WebsiteDocsSearchView.Found({ ...found, term })
            )
          ),
      }),
      Effect.catchCause(rejectServerLoad)
    ),
    { signal }
  );
