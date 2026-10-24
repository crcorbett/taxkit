import { docsPageMetadata } from "@taxkit/content/publication";
import { Effect, Schema } from "effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import { browserApiClient, publicSettingsAtom } from "./api/client.atoms";
import { readDocsPage, readDocsSearch } from "./api/requests";
import { TaxKitWebConfigError } from "./config";
import type { WebsiteDocsSearchQuery } from "./docs/search-location.boundary";
import { rejectRouteLoad } from "./load.failure";
import type { LoaderContext } from "./loader-context";
import { WebsiteDocsSearchView, WebsiteRootView } from "./schemas";

const settingsUnavailable = new TaxKitWebConfigError({
  message: "TaxKit web settings are missing or invalid.",
  operation: "settings",
  runtime: "client",
});

// TanStack's one browser Promise bridge. It runs a request Effect with the
// shared registry and the loader's own AbortSignal. Route results belong to
// the router; there is no request Atom or second cache.
const runForLoader = <A, E>({
  context,
  effect,
  signal,
}: Readonly<{
  context: LoaderContext;
  effect: Effect.Effect<A, E, AtomRegistry.AtomRegistry>;
  signal: AbortSignal;
}>) =>
  Effect.runPromise(
    Effect.fromOption(context.registry).pipe(
      Effect.mapError(() => settingsUnavailable),
      Effect.flatMap((registry) =>
        effect.pipe(Effect.provideService(AtomRegistry.AtomRegistry, registry))
      ),
      Effect.catchCause(rejectRouteLoad)
    ),
    { signal }
  );

const settings = AtomRegistry.AtomRegistry.pipe(
  Effect.map((registry) => registry.get(publicSettingsAtom)),
  Effect.flatMap(Effect.fromOption),
  Effect.mapError(() => settingsUnavailable)
);

export const loadRoot = (
  request: Readonly<{
    context: LoaderContext;
    signal: AbortSignal;
  }>
) =>
  runForLoader({
    ...request,
    effect: Effect.gen(function* () {
      const current = yield* settings;
      return {
        view: yield* Schema.encodeEffect(WebsiteRootView)({
          settings: current,
        }),
      };
    }),
  });

export const loadDocsPage = (
  request: Readonly<{
    context: LoaderContext;
    path: string;
    signal: AbortSignal;
  }>
) =>
  runForLoader({
    ...request,
    effect: Effect.gen(function* () {
      const current = yield* settings;
      const client = yield* browserApiClient;
      const { navigation, page } = yield* readDocsPage(client, request.path);
      return {
        metadata: yield* docsPageMetadata(page, current.publicationOrigin),
        navigation,
        page,
      };
    }),
  });

export const loadDocsSearch = (
  request: Readonly<{
    context: LoaderContext;
    query: WebsiteDocsSearchQuery;
    signal: AbortSignal;
  }>
) =>
  runForLoader({
    ...request,
    effect: Effect.fromResult(request.query).pipe(
      Effect.matchEffect({
        onFailure: () => Effect.succeed(WebsiteDocsSearchView.InvalidSearch()),
        onSuccess: (term) =>
          browserApiClient.pipe(
            Effect.flatMap((client) => readDocsSearch(client, term)),
            Effect.map((found) =>
              WebsiteDocsSearchView.Found({ ...found, term })
            )
          ),
      })
    ),
  });
