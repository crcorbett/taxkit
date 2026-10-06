import { assert, describe, it } from "@effect/vitest";
import {
  DocsAcceptedSourceDigest,
  DocsNavigation,
  DocsPagePath,
  DocsSourcePath,
  PublicPageAcceptanceRecordV2,
} from "@taxkit/content/schemas";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Array, Effect } from "effect";

import { projectPublicCatalogue } from "./catalogue.policy.js";

const records = Effect.forEach(
  [
    "packages/docs-content/navigation.json",
    "packages/docs-content/content/start/overview.mdx",
  ],
  (targetPath) =>
    Effect.gen(function* () {
      return yield* PublicPageAcceptanceRecordV2.makeEffect({
        observedAt: "2026-10-06T00:00:00Z",
        owner: "test-owner",
        schemaVersion: 2,
        sourceSha256: yield* DocsAcceptedSourceDigest.makeEffect(
          "0".repeat(64)
        ),
        state: "accepted",
        targetPath,
      });
    })
);

describe("accepted public catalogue projection", () => {
  it.effect("rejects an accepted child beneath a draft section", () =>
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
      const acceptedRecords = yield* records;
      const error = yield* projectPublicCatalogue(
        fixture.pages,
        navigation,
        acceptedRecords
      ).pipe(Effect.flip);
      assert.equal(error.operation, "project");
    })
  );
  it.effect("uses matching accepted pages and omits drafts", () =>
    Effect.gen(function* () {
      const fixture = yield* exampleContentCatalogue;
      const navigation = yield* DocsNavigation.makeEffect({
        ...fixture.navigation,
        contentRoot: "packages/docs-content/content",
        status: "published",
      });
      const acceptedRecords = yield* records;
      assert.deepEqual(
        yield* projectPublicCatalogue(
          fixture.pages,
          navigation,
          acceptedRecords
        ),
        fixture
      );
      const drafts = Array.map(fixture.pages, (page) => ({
        ...page,
        frontmatter: { ...page.frontmatter, status: "draft" as const },
      }));
      const empty = yield* projectPublicCatalogue(drafts, navigation, []).pipe(
        Effect.flip
      );
      assert.equal(empty.operation, "no-accepted-pages");
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
        yield* projectPublicCatalogue(pages, navigation, acceptedRecords),
        fixture
      );
    })
  );

  it.effect(
    "rejects missing, duplicate and wrong acceptance targets and draft navigation",
    () =>
      Effect.gen(function* () {
        const fixture = yield* exampleContentCatalogue;
        const navigation = yield* DocsNavigation.makeEffect({
          ...fixture.navigation,
          contentRoot: "packages/docs-content/content",
          status: "published",
        });
        const acceptedRecords = yield* records;
        const wrong = yield* PublicPageAcceptanceRecordV2.makeEffect({
          observedAt: "2026-10-06T00:00:00Z",
          owner: "test-owner",
          schemaVersion: 2,
          sourceSha256: yield* DocsAcceptedSourceDigest.makeEffect(
            "0".repeat(64)
          ),
          state: "accepted",
          targetPath: "other.mdx",
        });
        yield* Effect.forEach(
          [
            [],
            [...acceptedRecords, wrong],
            Array.map(acceptedRecords, () => wrong),
          ],
          (candidate) =>
            projectPublicCatalogue(fixture.pages, navigation, candidate).pipe(
              Effect.flip,
              Effect.tap((error) =>
                Effect.sync(() => assert.equal(error.operation, "project"))
              )
            )
        );
        const draftNavigation = yield* DocsNavigation.makeEffect({
          ...navigation,
          status: "draft",
        });
        const error = yield* projectPublicCatalogue(
          fixture.pages,
          draftNavigation,
          acceptedRecords
        ).pipe(Effect.flip);
        assert.equal(error.operation, "project");
      })
  );
});
