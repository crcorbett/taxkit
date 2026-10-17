import { assert, describe, it } from "@effect/vitest";
import { DocsSourceError } from "@taxkit/content/errors";
import { DocsPublicCatalogue } from "@taxkit/content/schemas";
import { ContentCatalogue } from "@taxkit/content/service";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Array, Effect, Layer, Ref, Schema } from "effect";

import { exampleDiscoverySettings } from "../src/__testing__/fixtures.js";
import { ContentDiscoveryLive } from "../src/live.layer.js";
import { DocsDiscoveryPath, DocsDiscoverySettings } from "../src/schemas.js";
import { ContentDiscovery, ContentDiscoverySettings } from "../src/service.js";
import { makeContentDiscoveryTest } from "../src/test.layer.js";

describe("publication discovery service", () => {
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
        const layer = ContentDiscoveryLive.pipe(
          Layer.provide(
            Layer.succeed(ContentDiscoverySettings)(
              Ref.update(observed, (count) => count + 1).pipe(
                Effect.as(settings)
              )
            )
          ),
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
            ContentDiscoveryLive.pipe(
              Layer.provide(
                Layer.succeed(ContentDiscoverySettings)(Effect.fail(expected))
              ),
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
          publicationOrigin: "http://127.0.0.1:4000",
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
});
