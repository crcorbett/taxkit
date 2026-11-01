import { assert, describe, it } from "@effect/vitest";
import { CodeText } from "@taxkit/mdx/schemas";
import { CodeHighlighter } from "@taxkit/mdx/service";
import { exampleTheme } from "@taxkit/mdx/testing/fixtures";
import { Color } from "@taxkit/mdx/theme";
import { Function as EffectFunction, Array, Effect, Schema } from "effect";

import { PierreCodeHighlighterLive } from "../src/highlights.adapter.layer.js";

describe("Pierre code highlighter", () => {
  it.effect(
    "keeps independent light and dark font styles over the same token text",
    () =>
      Effect.gen(function* () {
        const highlighter = yield* CodeHighlighter;
        const base = yield* exampleTheme;
        const { keyword } = base.light.syntax;
        const theme = {
          ...base,
          light: {
            ...base.light,
            syntax: {
              ...base.light.syntax,
              keyword: { ...keyword, style: "normal" as const },
            },
          },
          dark: {
            ...base.dark,
            syntax: {
              ...base.dark.syntax,
              keyword: {
                ...base.dark.syntax.keyword,
                style: "bold-italic" as const,
              },
            },
          },
        };
        const text = yield* CodeText.makeEffect("const n = 1;");
        const lines = yield* highlighter.highlight({
          snippet: { language: "ts", text },
          theme,
        });
        const token = yield* EffectFunction.pipe(
          lines,
          Array.flatten,
          Array.findFirst((value) => value.text.includes("const")),
          Effect.fromOption
        );
        assert.strictEqual(token.light.style, "normal");
        assert.strictEqual(token.dark.style, "bold-italic");
      }).pipe(Effect.provide(PierreCodeHighlighterLive))
  );
  it.effect("returns coloured tokens that spell out every source line", () =>
    Effect.gen(function* () {
      const highlighter = yield* CodeHighlighter;
      const text = yield* CodeText.makeEffect(
        'import { Effect } from "effect";\n\nconst total = 1;'
      );
      const lines = yield* highlighter.highlight({
        snippet: { language: "ts", text },
        theme: yield* exampleTheme,
      });
      assert.deepEqual(
        EffectFunction.pipe(
          lines,
          Array.map((line) =>
            EffectFunction.pipe(
              line,
              Array.map((token) => token.text)
            ).join("")
          )
        ),
        text.split("\n")
      );
      assert.isTrue(
        EffectFunction.pipe(
          lines,
          Array.some((line) =>
            EffectFunction.pipe(
              line,
              Array.some(
                (token) =>
                  Schema.is(Color)(token.light.color) &&
                  Schema.is(Color)(token.dark.color) &&
                  token.light.color !== token.dark.color
              )
            )
          )
        )
      );
    }).pipe(Effect.provide(PierreCodeHighlighterLive))
  );
});
