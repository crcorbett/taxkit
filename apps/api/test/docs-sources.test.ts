import repository from "@content/docs/repository.json" with { type: "json" };
import { docsSources } from "@content/docs/sources";
import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import type { DocsBlock, DocsInline } from "@taxkit/content/schemas";
import { ContentCatalogue, DocsOgImages } from "@taxkit/content/service";
import {
  Function as EffectFunction,
  Array,
  Effect,
  FileSystem,
  Layer,
  Match,
  Order,
  Boolean as EffectBoolean,
} from "effect";

import { DocsCatalogueBuildLive } from "../src/build/docs-catalogue.layer.js";
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
  EffectFunction.pipe(
    inlines,
    Array.flatMap((inline) =>
      Match.value(inline).pipe(
        Match.when({ kind: "link" }, (matchedValue) => [matchedValue.href]),
        Match.orElse(() => [])
      )
    )
  );
const blockHrefs = (block: DocsBlock): readonly string[] =>
  Match.value(block).pipe(
    Match.discriminatorsExhaustive("kind")({
      code: () => [],
      diagram: () => [],
      heading: ({ content }) => linkHrefs(content),
      list: ({ items }) => EffectFunction.pipe(items, Array.flatMap(linkHrefs)),
      paragraph: ({ content }) => linkHrefs(content),
      table: ({ header, rows }) =>
        EffectFunction.pipe(
          [header, ...rows],
          Array.flatMap((row) =>
            EffectFunction.pipe(row, Array.flatMap(linkHrefs))
          )
        ),
    })
  );
describe("bundled docs sources", () => {
  it.effect("lists every authored MDX file exactly once", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const files = yield* fs.readDirectory(contentRoot, { recursive: true });
      assert.deepEqual(
        EffectFunction.pipe(
          docsSources,
          Array.map((source) => source.path),
          Array.sort(Order.String)
        ),
        EffectFunction.pipe(
          files,
          Array.filter((file) => file.endsWith(".mdx")),
          Array.sort(Order.String)
        )
      );
    }).pipe(Effect.provide(NodeServices.layer))
  );
  it.effect("keeps the public wording and reference pages complete", () =>
    Effect.gen(function* () {
      yield* EffectFunction.pipe(
        docsSources,
        Effect.forEach(({ path, text }) =>
          EffectFunction.pipe(
            textPolicy,
            Effect.forEach((pattern) =>
              Effect.sync(() => {
                assert.notMatch(text, pattern, path);
              })
            )
          )
        )
      );
      yield* EffectFunction.pipe(
        requiredText,
        Effect.forEach(({ path, texts }) =>
          EffectFunction.pipe(
            docsSources,
            Array.findFirst((source) => source.path === path)
          ).pipe(
            Effect.fromOption,
            Effect.flatMap((page) =>
              EffectFunction.pipe(
                texts,
                Effect.forEach((text: string) =>
                  Effect.sync(() => {
                    assert.include(page.text, text, path);
                  })
                )
              )
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
        const repositoryFiles = EffectFunction.pipe(
          catalogue.pages,
          Array.flatMap((page) =>
            EffectFunction.pipe(
              page.body,
              Array.flatMap((block) =>
                EffectFunction.pipe(
                  blockHrefs(block),
                  Array.flatMap((href) =>
                    EffectBoolean.match(href.startsWith(blobPrefix), {
                      onFalse: () => [],
                      onTrue: () => [
                        href
                          .slice(blobPrefix.length)
                          .replace(/^[a-f0-9]{40}\//u, "")
                          .replace(/#.*$/u, ""),
                      ],
                    })
                  )
                )
              )
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
      const sizes = yield* EffectFunction.pipe(
        pages,
        Effect.forEach((page) =>
          images.getImage(page.path).pipe(Effect.map((png) => png.byteLength))
        )
      );
      assert.isTrue(
        EffectFunction.pipe(
          sizes,
          Array.every((size) => size > 1000)
        )
      );
    }).pipe(Effect.provide(ApiContentLive))
  );
});
