import { describe, expect, it } from "@effect/vitest";
import { Effect, Match, Schema } from "effect";

import { DocsSourceError } from "./errors.js";
import { DocsPagePath } from "./schemas.js";
import { DocsContentService } from "./service.js";
import { makeDocsContentServiceTest } from "./test.layer.js";

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
  it.effect("decodes generic source values into canonical TaxKit pages", () =>
    Effect.gen(function* () {
      const content = yield* DocsContentService;
      const page = yield* content.getPage(DocsPagePath.make("/guides/example"));
      const pages = yield* content.listPages();

      expect(page.frontmatter.title).toBe("Guide");
      expect(page.path).toBe("/guides/example");
      expect(page.source).toBe("content/guides/example.mdx");
      expect(pages).toEqual([page]);
    }).pipe(Effect.provide(makeDocsContentServiceTest([guide])))
  );

  it.effect("maps generic missing pages to the content-owned path error", () =>
    Effect.gen(function* () {
      const content = yield* DocsContentService;
      return yield* content.getPage(DocsPagePath.make("/missing"));
    }).pipe(
      Effect.provide(makeDocsContentServiceTest([guide])),
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          expect(error._tag).toBe("DocsPageNotFoundError");
        })
      )
    )
  );

  it.effect(
    "rejects malformed TaxKit frontmatter with a safe content error",
    () =>
      Effect.gen(function* () {
        const content = yield* DocsContentService;
        return yield* content.getPage(DocsPagePath.make("/guides/malformed"));
      }).pipe(
        Effect.provide(
          makeDocsContentServiceTest([
            {
              ...guide,
              frontmatter: {
                description: "Missing canonical fields.",
              },
              slugs: ["guides", "malformed"],
            },
          ])
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
