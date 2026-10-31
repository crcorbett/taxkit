import { assert, describe, it } from "@effect/vitest";
import { CodeText } from "@taxkit/mdx/schemas";
import { CodeHighlighter } from "@taxkit/mdx/service";
import { Function as EffectFunction, Array, Effect, Option } from "effect";

import { PierreCodeHighlighterLive } from "../src/highlights.adapter.layer.js";

describe("Pierre code highlighter", () => {
  it.effect("returns coloured tokens that spell out every source line", () =>
    Effect.gen(function* () {
      const highlighter = yield* CodeHighlighter;
      const text = yield* CodeText.makeEffect(
        'import { Effect } from "effect";\n\nconst total = 1;'
      );
      const lines = yield* highlighter.highlight({ language: "ts", text });
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
              Array.some((token) => Option.isSome(token.color))
            )
          )
        )
      );
    }).pipe(Effect.provide(PierreCodeHighlighterLive))
  );
});
