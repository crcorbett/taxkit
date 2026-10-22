import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, Match, Schema } from "effect";

import { FumadocsSourceLoadError } from "./errors.js";
import { FumadocsSourceLive } from "./live.layer.js";
import { FumadocsGeneratedCollection, FumadocsSource } from "./service.js";
import { FumadocsSourceFixtures, FumadocsSourceTest } from "./test.layer.js";

const guide = {
  browserPath: "guides/example.mdx",
  frontmatter: {
    description: "A deterministic guide.",
    status: "draft",
    title: "Guide",
  },
  markdown: "# Guide",
  slugs: ["guides", "example"],
  sourcePath: "content/guides/example.mdx",
} as const;

describe("FumadocsSource", () => {
  it.effect(
    "uses the same named operations through the deterministic Layer",
    () =>
      Effect.gen(function* () {
        const source = yield* FumadocsSource;
        const page = yield* source.getPage(["guides", "example"]);
        const pages = yield* source.listPages();

        expect(page).toEqual(guide);
        expect(pages).toEqual([guide]);
      }).pipe(
        Effect.provide(
          FumadocsSourceTest.pipe(
            Layer.provide(Layer.succeed(FumadocsSourceFixtures)([guide]))
          )
        )
      )
  );

  it.effect("returns a tagged missing-page error", () =>
    Effect.gen(function* () {
      const source = yield* FumadocsSource;
      return yield* source.getPage(["missing"]);
    }).pipe(
      Effect.provide(
        FumadocsSourceTest.pipe(
          Layer.provide(Layer.succeed(FumadocsSourceFixtures)([guide]))
        )
      ),
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          expect(error._tag).toBe("FumadocsPageNotFoundError");
        })
      )
    )
  );

  it.effect(
    "maps a failed generated-loader operation to a safe tagged error",
    () =>
      Effect.gen(function* () {
        const source = yield* FumadocsSource;
        return yield* source.listPages();
      }).pipe(
        Effect.provide(
          FumadocsSourceLive.pipe(
            Layer.provide(
              Layer.succeed(FumadocsGeneratedCollection)({
                getPage: () => Effect.succeed(guide),
                listPages: () =>
                  Effect.fail(
                    new FumadocsSourceLoadError({
                      message: "provider detail",
                      operation: "listPages",
                    })
                  ),
              })
            )
          )
        ),
        Effect.flip,
        Effect.tap((error) =>
          Effect.gen(function* () {
            expect(error._tag).toBe("FumadocsSourceLoadError");
            expect(error.message).toBe("The Fumadocs page listing failed.");
            expect(error.operation).toBe("listPages");
            const encoded = yield* Schema.encodeEffect(
              Schema.fromJsonString(FumadocsSourceLoadError)
            )(error);
            expect(encoded).not.toContain("provider detail");
          })
        )
      )
  );

  it.effect("rejects malformed generated representations at ingress", () =>
    Effect.gen(function* () {
      const source = yield* FumadocsSource;
      return yield* source.getPage(["guides", "example"]);
    }).pipe(
      Effect.provide(
        FumadocsSourceLive.pipe(
          Layer.provide(
            Layer.succeed(FumadocsGeneratedCollection)({
              getPage: () => Effect.succeed({ ...guide, markdown: 42 }),
              listPages: () => Effect.succeed([guide]),
            })
          )
        )
      ),
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          expect(error._tag).toBe("FumadocsSourceLoadError");
          Match.value(error).pipe(
            Match.tags({
              FumadocsPageNotFoundError: (notFoundError) => {
                expect(notFoundError._tag).toBe("FumadocsSourceLoadError");
              },
              FumadocsSourceLoadError: (sourceError) => {
                expect(sourceError.operation).toBe("getPage");
              },
            }),

            // oxlint-disable-next-line typescript/strict-void-return -- Effect Match terminal preserves the assertion callbacks; its generic host signature uses any.
            Match.exhaustive
          );
        })
      )
    )
  );
});
