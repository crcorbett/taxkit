import { Array, Effect, Layer, Ref } from "effect";

import type { ContentObservations } from "./__testing__/observations.js";
import { DocsImageRenderError } from "./errors.js";
import { ContentServiceLive } from "./live.layer.js";
import { DocsPngBytes, docsOgImageSize } from "./schemas.js";
import type {
  DocsPagePath,
  DocsPublicCatalogue,
  DocsSearchTerm,
} from "./schemas.js";
import { ContentCatalogue, ContentService, DocsOgImages } from "./service.js";

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

// Deterministic share images: one fixed PNG header of the owned size for
// every page.
export const DocsOgImagesTest = Layer.succeed(DocsOgImages)(
  DocsOgImages.of({
    getImage: () =>
      Effect.sync(() => {
        const bytes = new Uint8Array(24);
        const data = new DataView(bytes.buffer);
        data.setBigUint64(0, 0x89_50_4e_47_0d_0a_1a_0an);
        data.setUint32(16, docsOgImageSize.width);
        data.setUint32(20, docsOgImageSize.height);
        return bytes;
      }).pipe(
        Effect.flatMap((bytes) => DocsPngBytes.makeEffect(bytes)),
        Effect.mapError(() => new DocsImageRenderError({ reason: "output" }))
      ),
  })
);
