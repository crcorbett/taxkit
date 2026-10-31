import { Array, Effect, Layer, pipe } from "effect";

import { DocsPageNotFoundError, DocsSourceError } from "./errors.js";
import { DocsSearchExcerpt } from "./schemas.js";
import type {
  DocsPagePath,
  DocsSearchResult,
  DocsSearchTerm,
} from "./schemas.js";
import { ContentCatalogue, ContentService } from "./service.js";

export const ContentServiceLive = Layer.effect(
  ContentService,
  Effect.gen(function* () {
    const catalogue = yield* ContentCatalogue;
    return ContentService.of({
      getNavigation: Effect.fn("ContentService.getNavigation")(() =>
        Effect.succeed(catalogue.navigation)
      ),
      getPage: Effect.fn("ContentService.getPage")((path: DocsPagePath) =>
        Array.findFirst(catalogue.pages, (page) => page.path === path).pipe(
          Effect.fromOption,
          Effect.mapError(() => new DocsPageNotFoundError({ path }))
        )
      ),
      listPages: Effect.fn("ContentService.listPages")(() =>
        Effect.succeed(catalogue.pages)
      ),
      searchPages: Effect.fn("ContentService.searchPages")(
        (term: DocsSearchTerm) =>
          Effect.forEach(
            pipe(
              catalogue.pages,
              Array.filter((page) =>
                `${page.frontmatter.title}\n${page.frontmatter.description}\n${page.markdown}`
                  .toLowerCase()
                  .includes(term.toLowerCase())
              ),
              Array.take(20)
            ),
            (page) =>
              DocsSearchExcerpt.makeEffect(
                page.markdown.replaceAll(/\s+/gu, " ").trim().slice(0, 240)
              ).pipe(
                Effect.map(
                  (excerpt) =>
                    ({
                      description: page.frontmatter.description,
                      excerpt,
                      path: page.path,
                      title: page.frontmatter.title,
                    }) satisfies DocsSearchResult
                )
              )
          ).pipe(
            Effect.mapError(
              () =>
                new DocsSourceError({
                  message: "The docs search result could not be prepared.",
                  operation: "searchPages",
                })
            )
          )
      ),
    });
  })
);
