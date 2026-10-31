import { assert, describe, it } from "@effect/vitest";
import { DocsCodeHighlighter } from "@taxkit/content/service";
import { Function as EffectFunction, Array, Effect, Option } from "effect";

import { DocsCodeHighlighterLive } from "../src/highlights.adapter.layer.js";

describe("Pierre code highlighter", () => {
  it.effect("returns coloured tokens that spell out every source line", () =>
    Effect.gen(function* () {
      const highlighter = yield* DocsCodeHighlighter;
      const text = 'import { Effect } from "effect";\n\nconst total = 1;';
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
    }).pipe(Effect.provide(DocsCodeHighlighterLive))
  );
});
