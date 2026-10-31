import { Effect, Layer, Match, Option } from "effect";

import { CodeHighlightError, DiagramRenderError } from "./errors.js";
import { InlineText, DiagramSvg } from "./schemas.js";
import type { CodeSnippet } from "./schemas.js";
import { CodeHighlighter, DiagramRenderer } from "./service.js";

// Deterministic highlighter: each source line becomes one uncoloured token.
export const CodeHighlighterTest = Layer.succeed(CodeHighlighter)(
  CodeHighlighter.of({
    highlight: Effect.fn("CodeHighlighter.highlight")((snippet: CodeSnippet) =>
      Effect.forEach(snippet.text.split("\n"), (line) =>
        Match.value(line).pipe(
          Match.when("", () => Effect.succeed([])),
          Match.orElse((value) =>
            InlineText.makeEffect(value).pipe(
              Effect.map((text) => [
                { color: Option.none(), style: "normal" as const, text },
              ])
            )
          )
        )
      ).pipe(
        Effect.mapError(
          () =>
            new CodeHighlightError({
              language: snippet.language,
              reason: "tokens",
            })
        )
      )
    ),
  })
);

// Deterministic renderer: one fixed, valid SVG document for every diagram.
export const DiagramRendererTest = Layer.succeed(DiagramRenderer)(
  DiagramRenderer.of({
    render: Effect.fn("DiagramRenderer.render")(() =>
      DiagramSvg.makeEffect(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>'
      ).pipe(Effect.mapError(() => new DiagramRenderError({ reason: "svg" })))
    ),
  })
);
