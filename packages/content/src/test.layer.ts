import { Array, Effect, Layer, Ref } from "effect";

import type { ContentObservations } from "./__testing__/observations.js";
import { ContentDiscoveryLive, ContentServiceLive } from "./live.layer.js";
import type {
  DocsDiscoveryPath,
  DocsDiscoverySettings,
  DocsPagePath,
  DocsPublicCatalogue,
  DocsSearchTerm,
} from "./schemas.js";
import {
  ContentCatalogue,
  ContentDiscovery,
  ContentService,
} from "./service.js";

export const makeContentTest = Effect.fnUntraced(function* (
  catalogue: DocsPublicCatalogue
) {
  const service = yield* ContentService.pipe(
    Effect.provide(
      ContentServiceLive.pipe(
        Layer.provide(Layer.succeed(ContentCatalogue, catalogue))
      )
    )
  );
  const observations = {
    requestedPages: yield* Ref.make<readonly DocsPagePath[]>([]),
    searchTerms: yield* Ref.make<readonly DocsSearchTerm[]>([]),
  } satisfies ContentObservations;
  return {
    layer: Layer.succeed(
      ContentService,
      ContentService.of({
        getNavigation: service.getNavigation,
        getPage: Effect.fn("ContentService.getPage")(function* (
          path: DocsPagePath
        ) {
          yield* Ref.update(observations.requestedPages, Array.append(path));
          return yield* service.getPage(path);
        }),
        listPages: service.listPages,
        searchPages: Effect.fn("ContentService.searchPages")(function* (
          term: DocsSearchTerm
        ) {
          yield* Ref.update(observations.searchTerms, Array.append(term));
          return yield* service.searchPages(term);
        }),
      })
    ),
    observations,
  };
});

export const makeContentDiscoveryTest = Effect.fnUntraced(function* (
  catalogue: DocsPublicCatalogue,
  settings: DocsDiscoverySettings
) {
  const service = yield* ContentDiscovery.pipe(
    Effect.provide(
      ContentDiscoveryLive(Effect.succeed(settings)).pipe(
        Layer.provide(Layer.succeed(ContentCatalogue, catalogue))
      )
    )
  );
  const requestedDocuments = yield* Ref.make<readonly DocsDiscoveryPath[]>([]);
  return {
    layer: Layer.succeed(
      ContentDiscovery,
      ContentDiscovery.of({
        getDocument: Effect.fn("ContentDiscovery.getDocument")(
          function* (path) {
            yield* Ref.update(requestedDocuments, Array.append(path));
            return yield* service.getDocument(path);
          }
        ),
      })
    ),
    observations: { requestedDocuments },
  };
});
