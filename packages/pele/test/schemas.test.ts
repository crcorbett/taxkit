import { assert, describe, it } from "@effect/vitest";
import { FontFamily, FontSizePx, Source, Svg } from "@taxkit/pele/schemas";
import { Effect } from "effect";

describe("Pele values", () => {
  it.effect(
    "checks independent provider typography without accepting arbitrary CSS",
    () =>
      Effect.gen(function* () {
        assert.strictEqual(
          yield* FontFamily.makeEffect('"Inter",sans-serif'),
          '"Inter",sans-serif'
        );
        yield* FontFamily.makeEffect('"Inter";fill:red').pipe(Effect.flip);
        yield* FontSizePx.makeEffect(49).pipe(Effect.flip);
        yield* FontSizePx.makeEffect(Number.POSITIVE_INFINITY).pipe(
          Effect.flip
        );
      })
  );
  it.effect("checks source bounds without changing authored whitespace", () =>
    Effect.gen(function* () {
      const text = "\n  flowchart LR\n A --> B\n";
      assert.strictEqual(yield* Source.makeEffect(text), text);
      yield* Source.makeEffect("").pipe(Effect.flip);
      yield* Source.makeEffect("s".repeat(50_001)).pipe(Effect.flip);
    })
  );

  it.effect("requires a bounded standalone SVG document", () =>
    Effect.gen(function* () {
      yield* Svg.makeEffect("not SVG").pipe(Effect.flip);
      yield* Svg.makeEffect("<svg></svg>").pipe(Effect.flip);
      yield* Svg.makeEffect(
        `<svg xmlns="http://www.w3.org/2000/svg">${" ".repeat(4_000_000)}</svg>`
      ).pipe(Effect.flip);
    })
  );
});
