import { docsSources } from "@content/docs/sources";
import { ContentCatalogueLive } from "@taxkit/content/catalogue";
import { DocsSourceError } from "@taxkit/content/errors";
import {
  ContentLinkResolverLive,
  DocsLinkTargetsLive,
} from "@taxkit/content/link-resolver";
import { ContentMdxReaderLive } from "@taxkit/content/mdx";
import { DocsSource } from "@taxkit/content/schemas";
import { DocsSources } from "@taxkit/content/service";
import { MermaidDiagramRendererLive } from "@taxkit/diagrams/mermaid";
import { PierreCodeHighlighterLive } from "@taxkit/mdx/highlights";
import { MdxLive } from "@taxkit/mdx/live";
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
    ContentMdxReaderLive.pipe(
      Layer.provide(
        MdxLive.pipe(
          Layer.provide(
            Layer.mergeAll(
              PierreCodeHighlighterLive,
              MermaidDiagramRendererLive,
              ContentLinkResolverLive.pipe(Layer.provide(DocsLinkTargetsLive))
            )
          )
        )
      )
    )
  )
);
