import { Effect, Layer } from "effect";

import { DocsImageRenderError } from "./errors.js";
import { DocsPngBytes, docsOgImageSize } from "./schemas.js";
import { DocsOgImages } from "./service.js";

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
