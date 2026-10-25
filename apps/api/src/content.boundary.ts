import { DocsImageRenderError, DocsSourceError } from "@taxkit/content/errors";
import { ContentServiceLive } from "@taxkit/content/live";
import {
  DocsPngBytes,
  DocsPublicCatalogue,
  DocsPublicPagePath,
} from "@taxkit/content/schemas";
import { ContentCatalogue, DocsOgImages } from "@taxkit/content/service";
import { Effect, Layer, Record, Schema } from "effect";

import catalogue from "./generated/docs-catalogue.json" with { type: "json" };
import images from "./generated/docs-images.json" with { type: "json" };

const PngFromBase64 = Schema.toCodecJson(DocsPngBytes);

// The API build writes the checked catalogue and every page's share image from
// the authored MDX. The Worker decodes the catalogue once per isolate and an
// image only when it is asked for; it never parses MDX or renders an image.
export const ApiContentLive = ContentServiceLive.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.effect(
        ContentCatalogue,
        Schema.decodeUnknownEffect(DocsPublicCatalogue)(catalogue).pipe(
          Effect.mapError(
            () =>
              new DocsSourceError({
                message: "The built docs catalogue is invalid.",
                operation: "decode",
              })
          )
        )
      ),
      Layer.effect(
        DocsOgImages,
        Schema.decodeUnknownEffect(
          Schema.Record(DocsPublicPagePath, Schema.String)
        )(images).pipe(
          Effect.mapError(
            () =>
              new DocsSourceError({
                message: "The built docs images are invalid.",
                operation: "decode",
              })
          ),
          Effect.map((archive) =>
            DocsOgImages.of({
              getImage: Effect.fn("DocsOgImages.getImage")(function* (path) {
                const encoded = yield* Record.get(archive, path).pipe(
                  Effect.fromOption,
                  Effect.mapError(
                    () => new DocsImageRenderError({ reason: "missing" })
                  )
                );
                return yield* Schema.decodeEffect(PngFromBase64)(encoded).pipe(
                  Effect.mapError(
                    () => new DocsImageRenderError({ reason: "output" })
                  )
                );
              }),
            })
          )
        )
      )
    )
  )
);
