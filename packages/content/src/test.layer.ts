import { Array, Effect, Layer, Option, Ref } from "effect";

import type { ContentObservations } from "./__testing__/observations.js";
import { DocsDiagramRenderError } from "./errors.js";
import { ContentServiceLive } from "./live.layer.js";
import { DocsDiagramSvg } from "./schemas.js";
import type {
  DocsCodeSnippet,
  DocsPagePath,
  DocsPublicCatalogue,
  DocsSearchTerm,
} from "./schemas.js";
import {
  ContentCatalogue,
  ContentService,
  DocsCodeHighlighter,
  DocsDiagramRenderer,
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

// Deterministic highlighter: each source line becomes one uncoloured token.
export const DocsCodeHighlighterTest = Layer.succeed(DocsCodeHighlighter)(
  DocsCodeHighlighter.of({
    highlight: (snippet: DocsCodeSnippet) =>
      Effect.succeed(
        Array.map(snippet.text.split("\n"), (line) =>
          line === ""
            ? []
            : [{ color: Option.none(), style: "normal" as const, text: line }]
        )
      ),
  })
);

// Deterministic renderer: one fixed, valid SVG document for every diagram.
export const DocsDiagramRendererTest = Layer.succeed(DocsDiagramRenderer)(
  DocsDiagramRenderer.of({
    render: () =>
      DocsDiagramSvg.makeEffect(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>'
      ).pipe(
        Effect.mapError(() => new DocsDiagramRenderError({ reason: "svg" }))
      ),
  })
);
