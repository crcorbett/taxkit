import { assert, describe, it } from "@effect/vitest";
import { MdxCompilerLive } from "@taxkit/mdx/compiler";
import { SourceId, SourceText } from "@taxkit/mdx/schemas";
import { MdxCompiler } from "@taxkit/mdx/service";
import { Effect } from "effect";

describe("MDX source admission", () => {
  it.effect("keeps code indentation, blank lines and literal JSX", () =>
    Effect.gen(function* () {
      const compiler = yield* MdxCompiler;
      const id = yield* SourceId.makeEffect("example");
      const { blocks } = yield* compiler.compile({
        id,
        text: yield* SourceText.makeEffect(
          "```txt\n  <Example />\n\n    indented\n```"
        ),
      });
      const [block] = blocks;
      assert.deepEqual<unknown>(block, {
        kind: "code",
        language: "txt",
        text: "  <Example />\n\n    indented",
      });
    }).pipe(Effect.provide(MdxCompilerLive))
  );

  it.effect("rejects unsupported nested expressions and malformed JSX", () =>
    Effect.gen(function* () {
      const compiler = yield* MdxCompiler;
      const id = yield* SourceId.makeEffect("example");
      yield* Effect.forEach(
        [
          "A **nested {1 + 1}** expression.",
          "<Example {...props} />",
          "<Example>",
          "# !!!",
        ],
        (text) =>
          SourceText.makeEffect(text).pipe(
            Effect.orDie,
            Effect.flatMap((checked) =>
              compiler.compile({ id, text: checked })
            ),
            Effect.flip,
            Effect.tap((error) =>
              Effect.sync(() => {
                assert.strictEqual(error.source, id);
              })
            )
          )
      );
    }).pipe(Effect.provide(MdxCompilerLive))
  );
});
