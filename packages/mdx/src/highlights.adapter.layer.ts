import { createHighlighter } from "@pierre/highlights";
import type { Theme as PierreTheme } from "@pierre/highlights";
import {
  Array,
  Effect,
  Function as EffectFunction,
  Layer,
  Match,
  Option,
  Record,
  Result,
  Schema,
} from "effect";

import {
  CodeHighlightError,
  CodeHighlighterInitializationError,
} from "./errors.js";
import { InlineText } from "./schemas.js";
import type { CodeToken } from "./schemas.js";
import { CodeHighlighter } from "./service.js";
import { Color } from "./theme.schemas.js";
import type { Scheme, TokenAppearance } from "./theme.schemas.js";

// Decode the paired provider styles immediately. Other SDK metadata stays private.
const HighlightsTokens = Schema.Struct({
  tokens: Schema.Array(
    Schema.Array(
      Schema.Struct({
        content: Schema.Union([Schema.Literal(""), InlineText]),
        htmlStyle: Schema.Struct({
          "--mdx-light": Color,
          "--mdx-dark": Color,
          "--mdx-light-font-style": Schema.OptionFromOptional(
            Schema.Literal("italic")
          ),
          "--mdx-dark-font-style": Schema.OptionFromOptional(
            Schema.Literal("italic")
          ),
          "--mdx-light-font-weight": Schema.OptionFromOptional(
            Schema.Literals(["400", "600"])
          ),
          "--mdx-dark-font-weight": Schema.OptionFromOptional(
            Schema.Literals(["400", "600"])
          ),
        }),
      })
    )
  ).check(Schema.isMinLength(1)),
});
const createPierreTheme = (
  scheme: Scheme,
  appearance: "light" | "dark"
): PierreTheme => ({
  name: appearance,
  appearance,
  style: {
    "editor.background": scheme.palette.background,
    "editor.foreground": scheme.palette.foreground,
    syntax: EffectFunction.pipe(
      scheme.syntax,
      Record.map(({ color, style }) =>
        Match.value(style).pipe(
          Match.when("normal", () => ({
            color,
            font_style: "normal",
            font_weight: 400,
          })),
          Match.when("italic", () => ({
            color,
            font_style: "italic",
            font_weight: 400,
          })),
          Match.when("bold", () => ({
            color,
            font_style: "normal",
            font_weight: 600,
          })),
          Match.when("bold-italic", () => ({
            color,
            font_style: "italic",
            font_weight: 600,
          })),
          Match.exhaustive
        )
      )
    ),
  },
});
const resolveAppearance = (
  color: Color,
  italic: boolean,
  bold: boolean
): TokenAppearance => ({
  color,
  style: Match.value({ italic, bold }).pipe(
    Match.when({ italic: true, bold: true }, () => "bold-italic" as const),
    Match.when({ italic: true }, () => "italic" as const),
    Match.when({ bold: true }, () => "bold" as const),
    Match.orElse(() => "normal" as const)
  ),
});
// Shared WASM initialization belongs to module startup; the Layer owns this instance.
export const PierreCodeHighlighterLive = Layer.effect(
  CodeHighlighter,
  Effect.gen(function* () {
    const highlighter = yield* Effect.try({
      try: () => createHighlighter(),
      catch: () =>
        new CodeHighlighterInitializationError({ reason: "initialize" }),
    });
    return CodeHighlighter.of({
      highlight: Effect.fn("CodeHighlighter.highlight")(function* ({
        snippet,
        theme,
      }) {
        const reply: unknown = yield* Effect.try({
          try: () =>
            highlighter.codeToTokens(snippet.text, {
              lang: snippet.language,
              themes: {
                light: createPierreTheme(theme.light, "light"),
                dark: createPierreTheme(theme.dark, "dark"),
              },
              defaultColor: false,
              cssVariablePrefix: "--mdx-",
            }),
          catch: () =>
            new CodeHighlightError({
              language: snippet.language,
              reason: "highlight",
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
        return EffectFunction.pipe(
          tokens,
          Array.map((line) =>
            EffectFunction.pipe(
              line,
              Array.filterMap((token) => {
                const {
                  "--mdx-light": lightColor,
                  "--mdx-dark": darkColor,
                  "--mdx-light-font-style": lightStyle,
                  "--mdx-dark-font-style": darkStyle,
                  "--mdx-light-font-weight": lightWeight,
                  "--mdx-dark-font-weight": darkWeight,
                } = token.htmlStyle;
                const lightItalic = Option.isSome(lightStyle);
                const darkItalic = Option.isSome(darkStyle);
                const lightBold = EffectFunction.pipe(
                  lightWeight,
                  Option.contains("600")
                );
                const darkBold = EffectFunction.pipe(
                  darkWeight,
                  Option.contains("600")
                );
                const light = resolveAppearance(
                  lightColor,
                  lightItalic,
                  lightBold
                );
                const dark = resolveAppearance(darkColor, darkItalic, darkBold);
                return Match.value(token.content).pipe(
                  Match.when("", () => Result.failVoid),
                  Match.orElse((text) =>
                    Result.succeed<CodeToken>({ text, light, dark })
                  )
                );
              })
            )
          )
        );
      }),
    });
  })
);
