import { assert, describe, it } from "@effect/vitest";
import { MdxArtifactsLive } from "@taxkit/mdx/artifacts";
import { MdxArtifacts } from "@taxkit/mdx/service";
import { exampleTheme, exampleThemeInput } from "@taxkit/mdx/testing/fixtures";
import { Array, Effect, Record, Schema, Struct } from "effect";

describe("paired theme artifact ingress", () => {
  it.effect("round-trips the complete checked theme", () =>
    Effect.gen(function* () {
      const artifacts = yield* MdxArtifacts;
      const theme = yield* exampleTheme;
      assert.deepEqual(
        yield* artifacts.decodeTheme(yield* artifacts.encodeTheme(theme)),
        theme
      );
      const future = { ...theme, future: true };
      yield* artifacts.encodeTheme(future).pipe(Effect.flip);
    }).pipe(Effect.provide(MdxArtifactsLive))
  );

  it.effect(
    "rejects incomplete palettes, unsupported styles, CSS injection and excess fields",
    () =>
      Effect.gen(function* () {
        const artifacts = yield* MdxArtifacts;
        const input = exampleThemeInput;
        yield* Effect.forEach(
          [
            Struct.omit(input, ["dark"]),
            {
              ...input,
              light: {
                ...input.light,
                palette: { ...input.light.palette, accent: "#112233\n" },
              },
            },
            {
              ...input,
              typography: {
                ...input.typography,
                text: { names: ["Inter\n"], fallback: "sans-serif" },
              },
            },
            {
              ...input,
              light: {
                ...input.light,
                palette: Record.remove(input.light.palette, "border"),
              },
            },
            {
              ...input,
              light: {
                ...input.light,
                palette: {
                  ...input.light.palette,
                  accent: "red;fill:url(example)",
                },
              },
            },
            {
              ...input,
              light: {
                ...input.light,
                series: Array.take(input.light.series, 7),
              },
            },
            {
              ...input,
              dark: {
                ...input.dark,
                syntax: {
                  ...input.dark.syntax,
                  keyword: { color: "#112233", style: "underline" },
                },
              },
            },
            {
              ...input,
              typography: {
                ...input.typography,
                text: { names: ["X;fill:red"], fallback: "sans-serif" },
              },
            },
            { ...input, typography: { ...input.typography, diagramSize: 100 } },
            { ...input, dark: { ...input.dark, unknown: true } },
          ],
          (value) =>
            Effect.gen(function* () {
              const json = yield* Schema.encodeEffect(
                Schema.fromJsonString(Schema.Json)
              )(value);
              return yield* artifacts.decodeTheme(json).pipe(Effect.flip);
            })
        );
      }).pipe(Effect.provide(MdxArtifactsLive))
  );
});
