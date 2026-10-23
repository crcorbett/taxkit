import { docsSources } from "@content/docs/sources";
import { DocsSourceError } from "@taxkit/content/errors";
import { ContentCatalogueLive, ContentServiceLive } from "@taxkit/content/live";
import { DocsSource } from "@taxkit/content/schemas";
import { DocsSources } from "@taxkit/content/service";
import { DocsDiagramRendererLive } from "@taxkit/diagrams/mermaid";
import { DocsCodeHighlighterLive } from "@taxkit/mdx/highlights";
import { DocsPageReaderLive } from "@taxkit/mdx/live";
import { Effect, Layer, Schema } from "effect";

// The API bundles the authored MDX list and chooses the reader, highlighter and
// diagram renderer. Content builds the checked catalogue once per isolate.
export const ApiContentLive = ContentServiceLive.pipe(
  Layer.provideMerge(ContentCatalogueLive),
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
