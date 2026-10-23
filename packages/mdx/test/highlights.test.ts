import { assert, describe, it } from "@effect/vitest";
import { DocsCodeHighlighter } from "@taxkit/content/service";
import { Array, Effect, Option } from "effect";

import { DocsCodeHighlighterLive } from "../src/highlights.adapter.layer.js";

describe("Pierre code highlighter", () => {
  it.effect("returns coloured tokens that spell out every source line", () =>
    Effect.gen(function* () {
      const highlighter = yield* DocsCodeHighlighter;
      const text = 'import { Effect } from "effect";\n\nconst total = 1;';
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
    }).pipe(Effect.provide(DocsCodeHighlighterLive))
  );
});
