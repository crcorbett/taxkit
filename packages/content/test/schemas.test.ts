import { assert, describe, it } from "@effect/vitest";
import { Array, Effect, Result, Schema } from "effect";

import { exampleContentCatalogue } from "../src/__testing__/fixtures.js";
import {
  DocsDiscoveryDocument,
  DocsDiscoverySettings,
  DocsPublicCatalogue,
  DocsPublicPage,
  DocsSearchTerm,
} from "../src/schemas.js";

describe("public catalogue ingress", () => {
  it.effect(
    "rejects mismatched discovery media types and oversized bodies",
    () =>
      Effect.gen(function* () {
        yield* Effect.forEach(
          [
            {
              body: "<urlset/>",
              contentType: "text/plain",
              path: "/sitemap.xml",
            },
            {
              body: "# TaxKit",
              contentType: "application/xml",
              path: "/llms.txt",
            },
            { body: "private", contentType: "text/plain", path: "/private" },
            {
              body: "x".repeat(300_001),
              contentType: "text/plain",
              path: "/llms-full.txt",
            },
          ],
          (value) =>
            Schema.decodeUnknownEffect(DocsDiscoveryDocument)(value).pipe(
              Effect.flip,
              Effect.tap((error) =>
                Effect.sync(() => assert.equal(error._tag, "SchemaError"))
              )
            )
        );
      })
  );
  it.effect(
    "admits HTTPS and exact local origins while rejecting address decorations",
    () =>
      Effect.gen(function* () {
        yield* Effect.forEach(
          [
            "https://website.example.com",
            "http://localhost:4000",
            "http://127.0.0.1:4000",
          ],
          (websiteOrigin) =>
            Schema.decodeEffect(DocsDiscoverySettings)({
              apiOrigin: "https://api.example.com",
              websiteOrigin,
            })
        );
        yield* Effect.forEach(
          [
            "http://website.example.com",
            "https://website.example.com/path",
            "https://website.example.com?private=1",
            "https://user:secret@website.example.com",
            "https://website.example.com/#private",
          ],
          (websiteOrigin) =>
            Schema.decodeEffect(DocsDiscoverySettings)({
              apiOrigin: "https://api.example.com",
              websiteOrigin,
            }).pipe(Effect.flip)
        );
      })
  );
  it.effect("round-trips the one accepted wire version", () =>
    Effect.gen(function* () {
      const catalogue = yield* exampleContentCatalogue;
      const wire = yield* Schema.encodeEffect(DocsPublicCatalogue)(catalogue);
      assert.deepEqual(
        yield* Schema.decodeUnknownEffect(DocsPublicCatalogue)(wire),
        catalogue
      );
    })
  );

  it.effect(
    "rejects drafts, mismatched addresses and unrelated source files",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        yield* Effect.forEach(catalogue.pages, (page) =>
          Effect.forEach(
            [
              {
                ...page,
                frontmatter: { ...page.frontmatter, status: "draft" },
              },
              { ...page, path: "/other/page" },
              { ...page, path: "/start/../overview" },
              { ...page, source: "private/person.mdx" },
              { ...page, slugs: [] },
            ],
            (raw) =>
              Schema.decodeUnknownEffect(DocsPublicPage)(raw).pipe(
                Effect.result,
                Effect.tap((result) =>
                  Effect.sync(() => assert.isTrue(Result.isFailure(result)))
                )
              )
          )
        );
      })
  );

  it.effect(
    "rejects duplicate pages, stray navigation, wrong titles and unknown versions",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        yield* Effect.forEach(
          [
            { ...catalogue, pages: [...catalogue.pages, ...catalogue.pages] },
            { ...catalogue, navigation: { primaryNavigation: [] } },
            { ...catalogue, pages: [] },
            {
              ...catalogue,
              navigation: {
                primaryNavigation: [
                  ...catalogue.navigation.primaryNavigation,
                  ...catalogue.navigation.primaryNavigation,
                ],
              },
            },
            {
              ...catalogue,
              navigation: {
                primaryNavigation: Array.map(
                  catalogue.navigation.primaryNavigation,
                  (item) => ({ ...item, title: "Wrong title" })
                ),
              },
            },
            { ...catalogue, schemaVersion: 2 },
          ],
          (raw) =>
            Schema.decodeUnknownEffect(DocsPublicCatalogue)(raw).pipe(
              Effect.result,
              Effect.tap((result) =>
                Effect.sync(() => assert.isTrue(Result.isFailure(result)))
              )
            )
        );
      })
  );

  it.effect(
    "requires a nonempty, trimmed search term of at most 100 characters",
    () =>
      Effect.gen(function* () {
        yield* Effect.forEach(["", " ", " term ", "x".repeat(101)], (raw) =>
          DocsSearchTerm.makeEffect(raw).pipe(
            Effect.result,
            Effect.tap((result) =>
              Effect.sync(() => assert.isTrue(Result.isFailure(result)))
            )
          )
        );
      })
  );
});
