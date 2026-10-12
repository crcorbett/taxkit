import { assert, describe, it } from "@effect/vitest";
import {
  DocsNavigation,
  DocsPagePath,
  DocsSourcePath,
} from "@taxkit/content/schemas";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Array, Effect } from "effect";

import { projectPublicCatalogue } from "./catalogue.policy.js";

describe("public catalogue projection", () => {
  it.effect("rejects a published child beneath a draft section", () =>
    Effect.gen(function* () {
      const fixture = yield* exampleContentCatalogue;
      const navigation = yield* DocsNavigation.makeEffect({
        contentRoot: "packages/docs-content/content",
        primaryNavigation: [
          {
            pageType: "section index",
            pages: fixture.navigation.primaryNavigation,
            path: yield* DocsPagePath.makeEffect("/draft-section"),
            primaryReader: "New contributor",
            source: yield* DocsSourcePath.makeEffect(
              "content/draft-section.mdx"
            ),
            title: "Draft section",
          },
        ],
        status: "published",
      });
      const error = yield* projectPublicCatalogue(
        fixture.pages,
        navigation
      ).pipe(Effect.flip);
      assert.equal(error.operation, "project");
    })
  );

  it.effect("uses published pages and omits drafts", () =>
    Effect.gen(function* () {
      const fixture = yield* exampleContentCatalogue;
      const navigation = yield* DocsNavigation.makeEffect({
        ...fixture.navigation,
        contentRoot: "packages/docs-content/content",
        status: "published",
      });
      assert.deepEqual(
        yield* projectPublicCatalogue(fixture.pages, navigation),
        fixture
      );
      const drafts = Array.map(fixture.pages, (page) => ({
        ...page,
        frontmatter: { ...page.frontmatter, status: "draft" as const },
      }));
      const empty = yield* projectPublicCatalogue(drafts, navigation).pipe(
        Effect.flip
      );
      assert.equal(empty.operation, "no-published-pages");
      const pages = [
        ...fixture.pages,
        ...Array.map(fixture.pages, (page) => ({
          ...page,
          frontmatter: {
            description: "Private draft",
            status: "draft" as const,
            title: "Private draft",
          },
        })),
      ];
      assert.deepEqual(
        yield* projectPublicCatalogue(pages, navigation),
        fixture
      );
    })
  );

  it.effect("rejects draft navigation", () =>
    Effect.gen(function* () {
      const fixture = yield* exampleContentCatalogue;
      const navigation = yield* DocsNavigation.makeEffect({
        ...fixture.navigation,
        contentRoot: "packages/docs-content/content",
        status: "draft",
      });
      const error = yield* projectPublicCatalogue(
        fixture.pages,
        navigation
      ).pipe(Effect.flip);
      assert.equal(error.operation, "project");
    })
  );
});
