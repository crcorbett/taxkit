import { createHighlighter } from "@pierre/highlights";
import { pierreDark, pierreLight } from "@pierre/highlights/themes";
import { CodeHighlightError } from "@taxkit/mdx/errors";
import { InlineText, TokenColor } from "@taxkit/mdx/schemas";
import type { CodeSnippet, CodeToken, TokenStyle } from "@taxkit/mdx/schemas";
import { CodeHighlighter } from "@taxkit/mdx/service";
import { Array, Effect, Layer, Match, Option, Result, Schema } from "effect";

import { PresentationThemeConfig } from "./config.js";

// The checked part of the provider's Shiki-compatible reply. Font-style
// bits: 1 italic, 2 bold. Other provider fields are ignored.
const HighlightsTokens = Schema.Struct({
  tokens: Schema.Array(
    Schema.Array(
      Schema.Struct({
        color: Schema.OptionFromOptional(TokenColor),
        content: Schema.Union([Schema.Literal(""), InlineText]),
        fontStyle: Schema.OptionFromOptional(Schema.Int),
      })
    )
  ).check(Schema.isMinLength(1)),
});

const tokenStyle = (fontStyle: number): TokenStyle =>
  Match.value({
    bold: Math.floor(fontStyle / 2) % 2 === 1,
    italic: fontStyle % 2 === 1,
  }).pipe(
    Match.when({ bold: true, italic: true }, () => "bold-italic" as const),
    Match.when({ bold: true }, () => "bold" as const),
    Match.when({ italic: true }, () => "italic" as const),
    Match.orElse(() => "normal" as const)
  );

// @pierre/highlights initialises its WebAssembly on import. Only the API
// build loads this adapter; every provider call stays in this operation.
export const PierreCodeHighlighterLive = Layer.effect(
  CodeHighlighter,
  Effect.gen(function* () {
    const theme = yield* PresentationThemeConfig;
    const highlighter = yield* Effect.try({
      catch: () =>
        new CodeHighlightError({ language: "txt", reason: "highlight" }),
      try: () => createHighlighter(),
    });
    return CodeHighlighter.of({
      highlight: Effect.fn("CodeHighlighter.highlight")(function* (
        snippet: CodeSnippet
      ) {
        const reply: unknown = yield* Effect.try({
          catch: () =>
            new CodeHighlightError({
              language: snippet.language,
              reason: "highlight",
            }),
          try: () =>
            highlighter.codeToTokens(snippet.text, {
              lang: snippet.language,
              theme: Match.value(theme).pipe(
                Match.when("dark", () => pierreDark),
                Match.when("light", () => pierreLight),
                Match.exhaustive
              ),
            }),
        });
        const { tokens } = yield* Schema.decodeUnknownEffect(HighlightsTokens)(
          reply
        ).pipe(
          Effect.mapError(
            () =>
              new CodeHighlightError({
                language: snippet.language,
                reason: "tokens",
              })
          )
        );
        // Already-checked provider tokens become Content tokens; empty runs
        // carry no text and are dropped.
        return Array.map(tokens, (line) =>
          Array.filterMap(line, (token) =>
            Match.value(token.content).pipe(
              Match.when("", () => Result.failVoid),
              Match.orElse((text) =>
                Result.succeed<CodeToken>({
                  color: token.color,
                  style: tokenStyle(Option.getOrElse(token.fontStyle, () => 0)),
                  text,
                })
              )
            )
          )
        );
      }),
    });
  })
);
