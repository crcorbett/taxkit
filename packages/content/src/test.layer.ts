import { Effect, Layer } from "effect";

import { exampleContentCatalogue } from "./__testing__/fixtures.js";
import { DocsImageRenderError } from "./errors.js";
import { ContentServiceLive } from "./live.layer.js";
import { DocsPngBytes, docsOgImageSize } from "./schemas.js";
import { ContentCatalogue, DocsOgImages } from "./service.js";

// The checked example catalogue: one published guide and its navigation.
export const ContentCatalogueTest = Layer.effect(
  ContentCatalogue,
  exampleContentCatalogue
);
// The production content service over the example catalogue, so page lookup,
// navigation and search keep their real behaviour.
export const ContentServiceTest = ContentServiceLive.pipe(
  Layer.provide(ContentCatalogueTest)
);

// Deterministic share images: one fixed PNG header of the owned size for
// every page.
export const DocsOgImagesTest = Layer.succeed(DocsOgImages)(
  DocsOgImages.of({
    getImage: Effect.fn("DocsOgImages.getImage")(() =>
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
      )
    ),
  })
);
