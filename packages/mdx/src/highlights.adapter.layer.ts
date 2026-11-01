import { createHighlighter } from "@pierre/highlights/core";
import { pierreDark, pierreLight } from "@pierre/highlights/themes";
import wasmBytes from "@pierre/highlights/wasm";
import {
  CodeHighlightError,
  CodeHighlighterInitializationError,
} from "@taxkit/mdx/errors";
import { InlineText, TokenColor } from "@taxkit/mdx/schemas";
import type { CodeSnippet, CodeToken, TokenStyle } from "@taxkit/mdx/schemas";
import { CodeHighlighter } from "@taxkit/mdx/service";
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
const resolveTokenStyle = (fontStyle: number): TokenStyle =>
  Match.value({
    bold: Math.floor(fontStyle / 2) % 2 === 1,
    italic: fontStyle % 2 === 1,
  }).pipe(
    Match.when({ bold: true, italic: true }, () => "bold-italic" as const),
    Match.when({ bold: true }, () => "bold" as const),
    Match.when({ italic: true }, () => "italic" as const),
    Match.orElse(() => "normal" as const)
  );
// The pinned export patch exposes Pierre's pure core and packaged bytes.
// Compilation and instance creation belong to this static Layer's acquisition.
export const PierreCodeHighlighterLive = Layer.effect(
  CodeHighlighter,
  Effect.gen(function* () {
    const theme = yield* PresentationThemeConfig;
    const highlighter = yield* Effect.try({
      catch: () =>
        new CodeHighlighterInitializationError({ reason: "initialize" }),
      try: () => createHighlighter(new WebAssembly.Module(wasmBytes)),
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
        // Already-checked provider tokens become MDX tokens; empty runs
        // carry no text and are dropped.
        return EffectFunction.pipe(
          tokens,
          Array.map((line) =>
            EffectFunction.pipe(
              line,
              Array.filterMap((token) =>
                Match.value(token.content).pipe(
                  Match.when("", () => Result.failVoid),
                  Match.orElse((text) =>
                    Result.succeed<CodeToken>({
                      color: token.color,
                      style: EffectFunction.pipe(
                        token.fontStyle,
                        Option.getOrElse(() => 0),
                        resolveTokenStyle
                      ),
                      text,
                    })
                  )
                )
              )
            )
          )
        );
      }),
    });
  })
);
