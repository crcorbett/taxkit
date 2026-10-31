import { codeToTokens } from "@pierre/highlights";
import { pierreLight } from "@pierre/highlights/themes";
import { DocsCodeHighlightError } from "@taxkit/content/errors";
import { DocsTokenColor } from "@taxkit/content/schemas";
import type {
  DocsCodeSnippet,
  DocsCodeToken,
  DocsTokenStyle,
} from "@taxkit/content/schemas";
import { DocsCodeHighlighter } from "@taxkit/content/service";
import {
  Function as EffectFunction,
  Array,
  Effect,
  Layer,
  Match,
  Option,
  Result,
  Schema,
} from "effect";
// The part of the provider's Shiki-compatible reply Content reads. Font-style
// bits: 1 italic, 2 bold. Other provider fields are ignored.
const HighlightsTokens = Schema.Struct({
  tokens: Schema.Array(
    Schema.Array(
      Schema.Struct({
        color: Schema.optional(DocsTokenColor),
        content: Schema.String,
        fontStyle: Schema.optional(Schema.Int),
      })
    )
  ).check(Schema.isMinLength(1)),
});
const tokenStyle = (fontStyle: number): DocsTokenStyle =>
  Match.value({
    bold: Math.floor(fontStyle / 2) % 2 === 1,
    italic: fontStyle % 2 === 1,
  }).pipe(
    Match.when({ bold: true, italic: true }, () => "bold-italic" as const),
    Match.when({ bold: true }, () => "bold" as const),
    Match.when({ italic: true }, () => "italic" as const),
    Match.orElse(() => "normal" as const)
  );
// @pierre/highlights is the only syntax highlighter. Its module initialises
// its WebAssembly on import (the Worker build loads it as a compiled module);
// every call stays inside this one named operation.
export const DocsCodeHighlighterLive = Layer.succeed(DocsCodeHighlighter)(
  DocsCodeHighlighter.of({
    highlight: Effect.fn("DocsCodeHighlighter.highlight")(function* (
      snippet: DocsCodeSnippet
    ) {
      const reply: unknown = yield* Effect.try({
        catch: () =>
          new DocsCodeHighlightError({
            language: snippet.language,
            reason: "highlight",
          }),
        try: () =>
          codeToTokens(snippet.text, {
            lang: snippet.language,
            theme: pierreLight,
          }),
      });
      const { tokens } = yield* Schema.decodeUnknownEffect(HighlightsTokens)(
        reply
      ).pipe(
        Effect.mapError(
          () =>
            new DocsCodeHighlightError({
              language: snippet.language,
              reason: "tokens",
            })
        )
      );
      // Already-checked provider tokens become Content tokens; empty runs
      // carry no text and are dropped.
      return EffectFunction.pipe(
        tokens,
        Array.map((line) =>
          Array.filterMap(line, (token) =>
            Match.value(token).pipe(
              Match.when({ content: "" }, () => Result.failVoid),
              Match.orElse((matchedValue) =>
                Result.succeed<DocsCodeToken>({
                  color: Option.fromUndefinedOr(matchedValue.color),
                  style: tokenStyle(matchedValue.fontStyle ?? 0),
                  text: matchedValue.content,
                })
              )
            )
          )
        )
      );
    }),
  })
);
