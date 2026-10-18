import type { FumadocsSourcePage } from "@taxkit/docs-fumadocs/schemas";
import { FumadocsSource } from "@taxkit/docs-fumadocs/service";
import { Effect, Layer, Schema } from "effect";

import { DocsSourceError } from "./errors.js";
import { getNavigation } from "./navigation.js";
import {
  DocsPageFrontmatter,
  DocsPagePath,
  DocsPageSlug,
  DocsSourcePath,
} from "./schemas.js";
import type { DocsContentPage } from "./schemas.js";
import { DocsContentService } from "./service.js";

const contentPageFromSourcePage = (page: FumadocsSourcePage) =>
  Effect.all({
    frontmatter: Schema.decodeUnknownEffect(DocsPageFrontmatter)(
      page.frontmatter
    ),
    path: Schema.decodeUnknownEffect(DocsPagePath)(`/${page.slugs.join("/")}`),
    slugs: Effect.forEach(page.slugs, (slug) =>
      Schema.decodeUnknownEffect(DocsPageSlug)(slug)
    ),
    source: Schema.decodeUnknownEffect(DocsSourcePath)(page.sourcePath),
  }).pipe(
    Effect.map(
      ({ frontmatter, path, slugs, source }) =>
        ({
          frontmatter,
          markdown: page.markdown,
          path,
          slugs,
          source,
        }) satisfies DocsContentPage
    ),
    Effect.mapError(
      () =>
        new DocsSourceError({
          message: "The docs page representation was invalid.",
          operation: "decode",
        })
    )
  );

export const DocsContentServiceLive = Layer.effect(
  DocsContentService,
  Effect.gen(function* () {
    const fumadocs = yield* FumadocsSource;

    return DocsContentService.of({
      getNavigation: () => getNavigation,
      listPages: () =>
        fumadocs.listPages().pipe(
          Effect.flatMap((pages) =>
            Effect.forEach(pages, contentPageFromSourcePage)
          ),
          Effect.catchTag("FumadocsSourceLoadError", () =>
            Effect.fail(
              new DocsSourceError({
                message: "The docs page list could not be loaded.",
                operation: "listPages",
              })
            )
          )
        ),
    });
  })
);
