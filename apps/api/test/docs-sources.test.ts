import repository from "@content/docs/repository.json" with { type: "json" };
import { docsSources } from "@content/docs/sources";
import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import type { DocsBlock, DocsInline } from "@taxkit/content/schemas";
import { ContentCatalogue, DocsOgImages } from "@taxkit/content/service";
import { Array, Effect, FileSystem, Layer, Match, Order } from "effect";

import { DocsCatalogueBuildLive } from "../scripts/docs-catalogue.layer.js";
import { ApiContentLive } from "../src/content.boundary.js";

const contentRoot = "../../content/docs";
const blobPrefix = `${repository.repositoryUrl}/blob/`;

// Wording the public docs never use: marketing claims, retired API names and
// private product details.
const textPolicy = [
  /\b(?:easy|simple|simply|just|seamless|seamlessly|powerful|effortless|beautiful|magical|unlock|leverage|utilise|streamline)\b/iu,
  /\b(?:calculateRequest|createEffectClient|PublicCalculationMetadata|PublicErrorEnvelope|PublicCalculationMetadataGroup|PublicCalculationMetadataHandlerLive)\b/u,
  /\b(?:adad|SaaS|paid|simulation|private downstream product|private product strategy)\b/iu,
] as const;

const requiredText = [
  {
    path: "api/openapi-reference.mdx",
    texts: [
      "/api/docs/openapi.json",
      "/api/v1/calculators/{calculatorId}/calculate",
      "CalculatorRunRequest",
      "__snapshots__/openapi.json",
      "bun run --filter=@taxkit/api-http test:openapi",
    ],
  },
  {
    path: "reference/examples.mdx",
    texts: [
      "../../../packages/docs-examples/src/browser-http.ts",
      "../../../packages/docs-examples/src/effect.ts",
      "../../../packages/docs-examples/src/error-handling.ts",
      "../../../packages/docs-examples/src/node-server.ts",
      "bun run --filter=@taxkit/docs-examples check-examples",
    ],
  },
] as const;

const linkHrefs = (inlines: readonly DocsInline[]): readonly string[] =>
  Array.flatMap(inlines, (inline) =>
    inline.kind === "link" ? [inline.href] : []
  );

const blockHrefs = (block: DocsBlock): readonly string[] =>
  Match.value(block).pipe(
    Match.discriminatorsExhaustive("kind")({
      code: () => [],
      diagram: () => [],
      heading: ({ content }) => linkHrefs(content),
      list: ({ items }) => Array.flatMap(items, linkHrefs),
      paragraph: ({ content }) => linkHrefs(content),
      table: ({ header, rows }) =>
        Array.flatMap([header, ...rows], (row) =>
          Array.flatMap(row, linkHrefs)
        ),
    })
  );

describe("bundled docs sources", () => {
  it.effect("lists every authored MDX file exactly once", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const files = yield* fs.readDirectory(contentRoot, { recursive: true });
      assert.deepEqual(
        Array.sort(
          Array.map(docsSources, (source) => source.path),
          Order.String
        ),
        Array.sort(
          Array.filter(files, (file) => file.endsWith(".mdx")),
          Order.String
        )
      );
    }).pipe(Effect.provide(NodeServices.layer))
  );

  it.effect("keeps the public wording and reference pages complete", () =>
    Effect.gen(function* () {
      yield* Effect.forEach(docsSources, ({ path, text }) =>
        Effect.forEach(textPolicy, (pattern) =>
          Effect.sync(() => {
            assert.notMatch(text, pattern, path);
          })
        )
      );
      yield* Effect.forEach(requiredText, ({ path, texts }) =>
        Array.findFirst(docsSources, (source) => source.path === path).pipe(
          Effect.fromOption,
          Effect.flatMap((page) =>
            Effect.forEach(texts, (text) =>
              Effect.sync(() => {
                assert.include(page.text, text, path);
              })
            )
          )
        )
      );
    })
  );

  it.effect(
    "builds every page with real highlighting and diagrams, and every repository link names a file",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const catalogue = yield* ContentCatalogue;
        assert.strictEqual(catalogue.pages.length, docsSources.length);
        const repositoryFiles = Array.flatMap(catalogue.pages, (page) =>
          Array.flatMap(page.body, (block) =>
            Array.flatMap(blockHrefs(block), (href) =>
              href.startsWith(blobPrefix)
                ? [
                    href
                      .slice(blobPrefix.length)
                      .replace(/^[a-f0-9]{40}\//u, "")
                      .replace(/#.*$/u, ""),
                  ]
                : []
            )
          )
        );
        assert.isAbove(repositoryFiles.length, 0);
        yield* Effect.forEach(Array.dedupe(repositoryFiles), (file) =>
          fs.exists(`../../${file}`).pipe(
            Effect.flatMap((exists) =>
              Effect.sync(() => {
                assert.isTrue(exists, file);
              })
            )
          )
        );
      }).pipe(
        Effect.provide(Layer.merge(DocsCatalogueBuildLive, NodeServices.layer))
      )
  );

  it.effect(
    "bundles the catalogue the authored files build to (run the API build after editing docs)",
    () =>
      Effect.gen(function* () {
        const built = yield* ContentCatalogue.pipe(
          Effect.provide(DocsCatalogueBuildLive)
        );
        const bundled = yield* ContentCatalogue.pipe(
          Effect.provide(ApiContentLive)
        );
        assert.deepEqual(bundled, built);
      })
  );

  it.effect("bundles one checked share image for every published page", () =>
    Effect.gen(function* () {
      const { pages } = yield* ContentCatalogue;
      const images = yield* DocsOgImages;
      const sizes = yield* Effect.forEach(pages, (page) =>
        images.getImage(page.path).pipe(Effect.map((png) => png.byteLength))
      );
      assert.isTrue(Array.every(sizes, (size) => size > 1000));
    }).pipe(Effect.provide(ApiContentLive))
  );
});
