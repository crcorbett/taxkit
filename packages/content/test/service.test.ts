import { assert, describe, it } from "@effect/vitest";
import { Array, Effect, Layer, Ref, Schema } from "effect";

import {
  exampleContentCatalogue,
  exampleDiscoverySettings,
} from "../src/__testing__/fixtures.js";
import { DocsSourceError } from "../src/errors.js";
import { ContentDiscoveryLive, ContentServiceLive } from "../src/live.layer.js";
import {
  DocsDiscoveryPath,
  DocsDiscoverySettings,
  DocsPagePath,
  DocsPublicCatalogue,
  DocsSearchTerm,
} from "../src/schemas.js";
import {
  ContentCatalogue,
  ContentDiscovery,
  ContentService,
} from "../src/service.js";
import {
  makeContentDiscoveryTest,
  makeContentTest,
} from "../src/test.layer.js";

describe("accepted content service", () => {
  it.effect(
    "derives discovery from accepted pages and checked stage addresses",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        const settings = yield* exampleDiscoverySettings;
        const setup = yield* makeContentDiscoveryTest(catalogue, settings);
        yield* Effect.gen(function* () {
          const discovery = yield* ContentDiscovery;
          const sitemap = yield* discovery.getDocument("/sitemap.xml");
          assert.equal(sitemap.contentType, "application/xml");
          assert.include(
            sitemap.body,
            "<loc>https://website.example.com/start/overview</loc>"
          );
          assert.notInclude(sitemap.body, "lastmod");
          assert.notInclude(sitemap.body, "/search");
          const robots = yield* discovery.getDocument("/robots.txt");
          assert.include(
            robots.body,
            "Sitemap: https://website.example.com/sitemap.xml"
          );
          assert.notInclude(robots.body, "Disallow: /search");
          const index = yield* discovery.getDocument("/llms.txt");
          assert.include(
            index.body,
            "[Start here](https://api.example.com/api/v1/docs/markdown?path=%2Fstart%2Foverview)"
          );
          assert.notInclude(index.body, "content/start/overview.mdx");
          const full = yield* discovery.getDocument("/llms-full.txt");
          assert.include(
            full.body,
            "Canonical page: https://website.example.com/start/overview"
          );
          yield* Effect.forEach(catalogue.pages, (page) =>
            Effect.sync(() => assert.include(full.body, page.markdown))
          );
        }).pipe(Effect.provide(setup.layer));
        assert.deepEqual(
          yield* Ref.get(setup.observations.requestedDocuments),
          DocsDiscoveryPath.literals
        );
      })
  );

  it.effect(
    "keeps deferred settings lazy and reads one configured address set",
    () =>
      Effect.gen(function* () {
        const observed = yield* Ref.make(0);
        const settings = yield* exampleDiscoverySettings;
        const layer = ContentDiscoveryLive(
          Ref.update(observed, (count) => count + 1).pipe(Effect.as(settings))
        ).pipe(
          Layer.provide(Layer.effect(ContentCatalogue, exampleContentCatalogue))
        );
        yield* Effect.gen(function* () {
          const discovery = yield* ContentDiscovery;
          assert.equal(yield* Ref.get(observed), 0);
          yield* Effect.forEach(
            DocsDiscoveryPath.literals,
            discovery.getDocument
          );
          assert.equal(yield* Ref.get(observed), 1);
        }).pipe(Effect.provide(layer));
      })
  );

  it.effect(
    "keeps unavailable stage settings in the named failure channel",
    () =>
      Effect.gen(function* () {
        const expected = new DocsSourceError({
          message: "Settings unavailable.",
          operation: "getDiscoveryDocument",
        });
        const result = yield* ContentDiscovery.pipe(
          Effect.flatMap((service) => service.getDocument("/sitemap.xml")),
          Effect.flip,
          Effect.provide(
            ContentDiscoveryLive(Effect.fail(expected)).pipe(
              Layer.provide(
                Layer.effect(ContentCatalogue, exampleContentCatalogue)
              )
            )
          )
        );
        assert.deepEqual(result, expected);
      })
  );

  it.effect(
    "escapes Markdown labels and preserves processed bodies under a different stage",
    () =>
      Effect.gen(function* () {
        const original = yield* exampleContentCatalogue;
        const catalogue = yield* DocsPublicCatalogue.makeEffect({
          ...original,
          navigation: {
            primaryNavigation: Array.map(
              original.navigation.primaryNavigation,
              (page) => ({ ...page, title: "[Start] \\ guide" })
            ),
          },
          pages: Array.map(original.pages, (page) => ({
            ...page,
            frontmatter: {
              ...page.frontmatter,
              description: "First line.\nSecond line.",
              title: "[Start] \\ guide",
            },
          })),
        });
        const settings = yield* Schema.decodeEffect(DocsDiscoverySettings)({
          apiOrigin: "http://127.0.0.1:4001",
          websiteOrigin: "http://127.0.0.1:4000",
        });
        const setup = yield* makeContentDiscoveryTest(catalogue, settings);
        const index = yield* ContentDiscovery.pipe(
          Effect.flatMap((service) => service.getDocument("/llms.txt")),
          Effect.provide(setup.layer)
        );
        assert.include(
          index.body,
          "[\\[Start\\] \\\\ guide](http://127.0.0.1:4001/api/v1/docs/markdown?path=%2Fstart%2Foverview): First line. Second line."
        );
        assert.notInclude(index.body, "example.com");
      })
  );
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
