import "@tanstack/react-start/server-only";
import type { NotFoundError } from "@tanstack/react-router";
import { setResponseStatus } from "@tanstack/react-start/server";
import { requestDocsPage, requestDocsSearch } from "@taxkit/api-http/requests";
import { docsPageMetadata } from "@taxkit/content/publication";
import { WebsiteHostTelemetryLive } from "@taxkit/observability/host-telemetry";
import { env } from "cloudflare:workers";
import { Cause, Effect, Layer, ManagedRuntime } from "effect";

import { WebsiteDocsSearchView } from "./docs/schemas";
import type { WebsiteDocsSearchQuery } from "./docs/search-location.ingress";
import { WebsiteApiLive } from "./host/binding.server";
import { WebsiteBindings } from "./host/config.server";
import type { WebsiteLoadError } from "./host/errors";
import { WebsiteApi, WebsiteSettings } from "./host/service";
import { WebsiteSettingsLive } from "./host/settings.server.layer";
import { loadFailureStatus, rejectRouteLoad } from "./pages/load.failure";
import { loadRootView } from "./pages/root.load.server";

// The Worker's bindings object, read at this host edge only.
const bindings = Layer.sync(WebsiteBindings, () => ({ ...env }));

// One server runner per loaded Worker module. It supplies native API clients,
// never a backend implementation; each request supplies its own signal.
export const runtime = ManagedRuntime.make(
  Layer.mergeAll(
    WebsiteApiLive,
    WebsiteSettingsLive,
    WebsiteHostTelemetryLive
  ).pipe(Layer.provide(bindings))
);

// Server loads report their HTTP status before TanStack renders the native
// not-found or error component. Cancellation stays interruption.
const rejectServerLoad = <E>(
  cause: Cause.Cause<E>
): Effect.Effect<never, E | NotFoundError | WebsiteLoadError> =>
  Cause.hasInterruptsOnly(cause)
    ? Effect.failCause(cause)
    : Effect.sync(() => {
        setResponseStatus(loadFailureStatus(cause));
      }).pipe(Effect.andThen(rejectRouteLoad(cause)));

const client = WebsiteApi.pipe(
  Effect.flatMap((host) => Effect.fromResult(host.client))
);

export const loadRoot = ({ signal }: Readonly<{ signal: AbortSignal }>) =>
  runtime.runPromise(loadRootView.pipe(Effect.catchCause(rejectServerLoad)), {
    signal,
  });

export const loadDocsPage = ({
  path,
  signal,
}: Readonly<{ path: string; signal: AbortSignal }>) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const host = yield* WebsiteSettings;
      const settings = yield* Effect.fromResult(host.settings);
      const { navigation, page } = yield* requestDocsPage(yield* client, path);
      return {
        metadata: yield* docsPageMetadata(page, settings.publicationOrigin),
        navigation,
        page,
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
            Effect.flatMap((generated) => requestDocsSearch(generated, term)),
            Effect.map((found) =>
              WebsiteDocsSearchView.Found({ ...found, term })
            )
          ),
      }),
      Effect.catchCause(rejectServerLoad)
    ),
    { signal }
  );
