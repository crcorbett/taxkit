import { assert, it } from "@effect/vitest";
import {
  ContentCatalogue,
  DocsOgImages,
  DocsPageRenderer,
} from "@taxkit/content/service";
import { DocsOgImagesTest } from "@taxkit/content/test";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Array, Effect, Layer, Record, Ref } from "effect";

import { renderDocsImageArchive } from "../src/image-archive.js";

it.effect("renders one image per published page, one page at a time", () =>
  Effect.gen(function* () {
    const catalogue = yield* exampleContentCatalogue;
    const first = yield* Array.head(catalogue.pages).pipe(Effect.fromOption);
    const sample = yield* DocsOgImages.pipe(
      Effect.flatMap((images) => images.getImage(first.path)),
      Effect.provide(DocsOgImagesTest)
    );
    const titles = yield* Ref.make<readonly string[]>([]);
    const archive = yield* renderDocsImageArchive.pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.succeed(ContentCatalogue, catalogue),
          Layer.succeed(DocsPageRenderer)({
            renderPage: (image) =>
              Ref.update(titles, Array.append(image.title)).pipe(
                Effect.as(sample)
              ),
          })
        )
      )
    );
    assert.deepStrictEqual(
      Record.keys(archive),
      Array.map(catalogue.pages, (page) => page.path)
    );
    assert.deepStrictEqual(
      yield* Ref.get(titles),
      Array.map(catalogue.pages, (page) => page.frontmatter.title)
    );
  })
);
