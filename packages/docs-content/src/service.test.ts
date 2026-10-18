import { describe, expect, it } from "@effect/vitest";
import { FumadocsSourceFixtures } from "@taxkit/docs-fumadocs/test";
import { Array, Effect, Layer, Match, Option, Schema } from "effect";

import manifest from "../package.json" with { type: "json" };
import { DocsSourceError } from "./errors.js";
import { DocsContentService } from "./service.js";
import { DocsContentServiceTest } from "./test.layer.js";

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

describe("DocsContentService", () => {
  it.each(["./generated-source", "./server", "./validate"])(
    "retires the unused source/executable import %s while keeping the CLI",
    (subpath) => {
      expect(manifest.exports).not.toHaveProperty([subpath]);
      expect(manifest.scripts.validate).toBe(
        "bun run ./src/validate.runtime.ts"
      );
    }
  );

  it.effect("decodes generic source values into canonical TaxKit pages", () =>
    Effect.gen(function* () {
      const content = yield* DocsContentService;
      const pages = yield* content.listPages();
      const page = Array.head(pages).pipe(
        Option.getOrElse(() => expect.fail("Expected decoded page"))
      );
      const navigation = yield* content.getNavigation();
      expect(navigation.primaryNavigation.length).toBeGreaterThan(0);

      expect(page.frontmatter.title).toBe("Guide");
      expect(page.path).toBe("/guides/example");
      expect(page.source).toBe("content/guides/example.mdx");
      expect(pages).toEqual([page]);
    }).pipe(
      Effect.provide(
        DocsContentServiceTest.pipe(
          Layer.provide(Layer.succeed(FumadocsSourceFixtures)([guide]))
        )
      )
    )
  );

  it.effect(
    "rejects malformed TaxKit frontmatter with a safe content error",
    () =>
      Effect.gen(function* () {
        const content = yield* DocsContentService;
        return yield* content.listPages();
      }).pipe(
        Effect.provide(
          DocsContentServiceTest.pipe(
            Layer.provide(
              Layer.succeed(FumadocsSourceFixtures)([
                {
                  ...guide,
                  frontmatter: {
                    description: "Missing canonical fields.",
                  },
                  slugs: ["guides", "malformed"],
                },
              ])
            )
          )
        ),
        Effect.flip,
        Effect.tap((error) =>
          Effect.gen(function* () {
            const sourceError = Match.value(error).pipe(
              Match.tag("DocsSourceError", (value) => value),
              Match.orElse(() => expect.fail("Expected source error"))
            );
            const encoded = yield* Schema.encodeEffect(
              Schema.fromJsonString(DocsSourceError)
            )(sourceError);
            expect(encoded).not.toContain("Missing canonical fields.");
          })
        )
      )
  );
});
