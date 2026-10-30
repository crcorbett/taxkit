import { docsSources } from "@content/docs/sources";
import { DocsSourceError } from "@taxkit/content/errors";
import { ContentCatalogueLive } from "@taxkit/content/live";
import { DocsSource } from "@taxkit/content/schemas";
import { DocsSources } from "@taxkit/content/service";
import { DocsDiagramRendererLive } from "@taxkit/diagrams/mermaid";
import { DocsCodeHighlighterLive } from "@taxkit/mdx/highlights";
import { DocsPageReaderLive } from "@taxkit/mdx/live";
import { Effect, Layer, Schema } from "effect";

// The build-time catalogue. Content reads every authored page with the MDX
// reader, code highlighter and diagram renderer. Only the API build and its
// tests run this; the Worker decodes the written result instead.
export const DocsCatalogueBuildLive = ContentCatalogueLive.pipe(
  Layer.provide(
    Layer.effect(
      DocsSources,
      Schema.decodeEffect(Schema.Array(DocsSource))(docsSources).pipe(
        Effect.mapError(
          () =>
            new DocsSourceError({
              message: "A bundled docs source path is invalid.",
              operation: "decode",
            })
        )
      )
    )
  ),
  Layer.provide(
    DocsPageReaderLive.pipe(
      Layer.provide(
        Layer.merge(DocsCodeHighlighterLive, DocsDiagramRendererLive)
      )
    )
  )
);
