import { docsOgImage } from "@taxkit/content/publication";
import type { DocsImageArchive } from "@taxkit/content/schemas";
import { ContentCatalogue, DocsPageRenderer } from "@taxkit/content/service";
import { Effect, Record, Function as EffectFunction } from "effect";
// Every published page's share image, rendered once at build time from the
// checked catalogue, one page at a time.
export const renderDocsImageArchive = Effect.gen(function* () {
  const { pages } = yield* ContentCatalogue;
  const renderer = yield* DocsPageRenderer;
  const entries = yield* EffectFunction.pipe(
    pages,
    Effect.forEach((page) =>
      renderer
        .renderPage(docsOgImage(page))
        .pipe(Effect.map((bytes) => [page.path, bytes] as const))
    )
  );
  return Record.fromEntries(entries) satisfies DocsImageArchive;
}).pipe(Effect.withSpan("DocsImages.renderArchive"));
