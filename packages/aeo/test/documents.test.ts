import { assert, describe, it } from "@effect/vitest";
import { TaxKitApi } from "@taxkit/api-http/api";
import { DocsApiPath } from "@taxkit/api-http/routes";
import {
  DocsPublicationOrigin,
  DocsPublicCatalogue,
  PublicHttpOrigin,
} from "@taxkit/content/schemas";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Array, Effect, Option, Record, Schema } from "effect";
import { OpenApi } from "effect/http-api";

import { exampleOrigins } from "../src/__testing__/fixtures.js";
import { llmsFullTxt, llmsTxt, sitemapXml } from "../src/documents.egress.js";
import { robotsTxt } from "../src/robots.egress.js";

describe("answer-engine documents", () => {
  it.effect("derive every document from accepted pages and stage origins", () =>
    Effect.gen(function* () {
      const { pages } = yield* exampleContentCatalogue;
      const origins = yield* exampleOrigins;
      const sitemap = sitemapXml({ pages, ...origins });
      assert.include(
        sitemap,
        "<loc>https://website.example.com/start/overview</loc>"
      );
      assert.notInclude(sitemap, "lastmod");
      assert.notInclude(sitemap, "/search");
      const robots = robotsTxt(origins.publicationOrigin);
      assert.include(
        robots,
        "Sitemap: https://website.example.com/sitemap.xml"
      );
      assert.include(
        robots,
        "User-agent: GPTBot\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\nAllow: /"
      );
      assert.notInclude(robots, "Disallow");
      const index = llmsTxt({ pages, ...origins });
      assert.notInclude(index, "start/overview.mdx");
      const full = llmsFullTxt({ pages, ...origins });
      assert.include(
        full,
        "Canonical page: https://website.example.com/start/overview"
      );
      yield* Effect.forEach(pages, (page) =>
        Effect.sync(() => {
          assert.include(full, page.markdown);
        })
      );
    })
  );

  it.effect("link every page to a declared native GET Markdown route", () =>
    Effect.gen(function* () {
      const { pages } = yield* exampleContentCatalogue;
      const origins = yield* exampleOrigins;
      const links = Array.fromIterable(
        llmsTxt({ pages, ...origins }).matchAll(
          /\]\((?<address>https?:\/\/[^)]+)\)/gu
        )
      );
      assert.equal(links.length, pages.length);
      yield* Effect.forEach(Array.zip(links, pages), ([match, page]) =>
        Effect.gen(function* () {
          const address = yield* Schema.decodeUnknownEffect(
            Schema.URLFromString
          )(yield* Effect.fromOption(Array.get(match, 1)));
          assert.equal(address.origin, origins.apiOrigin.origin);
          assert.isTrue(Schema.is(DocsApiPath)(address.pathname));
          assert.isTrue(
            Record.get(OpenApi.fromApi(TaxKitApi).paths, address.pathname).pipe(
              Option.flatMap((path) => Option.fromNullishOr(path.get)),
              Option.isSome
            )
          );
          assert.equal(address.searchParams.get("path"), page.path);
        })
      );
    })
  );

  it.effect("escape Markdown labels under another stage's origins", () =>
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
      const index = llmsTxt({
        apiOrigin: yield* Schema.decodeEffect(PublicHttpOrigin)(
          "http://127.0.0.1:4001"
        ),
        pages: catalogue.pages,
        publicationOrigin: yield* Schema.decodeEffect(DocsPublicationOrigin)(
          "http://127.0.0.1:4000"
        ),
      });
      assert.include(
        index,
        "[\\[Start\\] \\\\ guide](http://127.0.0.1:4001/api/v1/docs/markdown?path=%2Fstart%2Foverview): First line. Second line."
      );
    })
  );
});
