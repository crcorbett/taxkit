import { assert, describe, it } from "@effect/vitest";
import { Array, Effect, Layer, Ref, Schema } from "effect";

import { exampleContentCatalogue } from "../src/__testing__/fixtures.js";
import { ContentServiceLive } from "../src/live.layer.js";
import {
  DocsPagePath,
  DocsPublicCatalogue,
  DocsSearchTerm,
} from "../src/schemas.js";
import { ContentCatalogue, ContentService } from "../src/service.js";
import { makeContentTest } from "../src/test.layer.js";

describe("accepted content service", () => {
  it.effect(
    "returns the injected pages and navigation; missing pages remain a typed failure",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        const setup = yield* makeContentTest(catalogue);
        const path = yield* DocsPagePath.makeEffect("/start/overview");
        const missingPath = yield* DocsPagePath.makeEffect("/missing");
        yield* Effect.gen(function* () {
          const content = yield* ContentService;
          assert.deepEqual(yield* content.listPages(), catalogue.pages);
          assert.deepEqual(
            yield* content.getNavigation(),
            catalogue.navigation
          );
          assert.strictEqual(
            (yield* content.getPage(path)).frontmatter.title,
            "Start here"
          );
          const missing = yield* content.getPage(missingPath).pipe(Effect.flip);
          assert.strictEqual(missing._tag, "DocsPageNotFoundError");
          assert.strictEqual(missing.path, missingPath);
        }).pipe(Effect.provide(setup.layer));
        assert.deepEqual(yield* Ref.get(setup.observations.requestedPages), [
          path,
          missingPath,
        ]);
      })
  );

  it.effect(
    "matches title, description and processed text without case sensitivity",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        const setup = yield* makeContentTest(catalogue);
        const titleTerm = yield* DocsSearchTerm.makeEffect("START HERE");
        const descriptionTerm =
          yield* DocsSearchTerm.makeEffect("PUBLIC GUIDE");
        const markdownTerm = yield* DocsSearchTerm.makeEffect(
          "SUPPORTED CALCULATOR"
        );
        const absentTerm = yield* DocsSearchTerm.makeEffect("absent word");
        yield* Effect.gen(function* () {
          const content = yield* ContentService;
          yield* Effect.forEach(
            [titleTerm, descriptionTerm, markdownTerm],
            (term) =>
              content.searchPages(term).pipe(
                Effect.tap((results) =>
                  Effect.sync(() => {
                    assert.strictEqual(results.length, 1);
                    assert.deepEqual(
                      Array.map(results, (result) => result.excerpt),
                      [
                        "# Start here The supported calculator returns checked results.",
                      ]
                    );
                  })
                )
              )
          );
          assert.deepEqual(yield* content.searchPages(absentTerm), []);
        }).pipe(Effect.provide(setup.layer));
        assert.deepEqual(yield* Ref.get(setup.observations.searchTerms), [
          titleTerm,
          descriptionTerm,
          markdownTerm,
          absentTerm,
        ]);
      })
  );

  it.effect(
    "bounds search to the first twenty catalogue pages and 240 characters",
    () =>
      Effect.gen(function* () {
        const pages = Array.map(Array.range(1, 25), (number) => ({
          frontmatter: {
            description: "Accepted guide.",
            status: "published",
            title: `Page ${number}`,
          },
          markdown: "match ".repeat(100),
          path: `/page-${number}`,
          slugs: [`page-${number}`],
          source: `content/page-${number}.mdx`,
        }));
        const catalogue = yield* Schema.decodeUnknownEffect(
          DocsPublicCatalogue
        )({
          navigation: {
            primaryNavigation: Array.map(pages, (page) => ({
              pageType: "guide",
              pages: [],
              path: page.path,
              primaryReader: "New contributor",
              source: page.source,
              title: page.frontmatter.title,
            })),
          },
          pages,
          schemaVersion: 1,
        });
        const term = yield* DocsSearchTerm.makeEffect("MATCH");
        const results = yield* Effect.gen(function* () {
          const content = yield* ContentService;
          return yield* content.searchPages(term);
        }).pipe(
          Effect.provide(
            ContentServiceLive.pipe(
              Layer.provide(Layer.succeed(ContentCatalogue, catalogue))
            )
          )
        );
        assert.strictEqual(results.length, 20);
        assert.deepEqual(
          Array.map(results, (result) => result.path),
          Array.map(Array.take(pages, 20), (page) => page.path)
        );
        assert.isTrue(
          Array.every(results, (result) => result.excerpt.length === 240)
        );
      })
  );
});
