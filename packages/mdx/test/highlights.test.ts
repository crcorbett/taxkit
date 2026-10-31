import { assert, describe, it } from "@effect/vitest";
import { CodeText } from "@taxkit/mdx/schemas";
import { CodeHighlighter } from "@taxkit/mdx/service";
import { Array, Effect, Option } from "effect";

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
        Array.map(lines, (line) =>
          Array.map(line, (token) => token.text).join("")
        ),
        text.split("\n")
      );
      assert.isTrue(
        Array.some(lines, (line) =>
          Array.some(line, (token) => Option.isSome(token.color))
        )
      );
    }).pipe(Effect.provide(PierreCodeHighlighterLive))
  );
});
