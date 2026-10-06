import { FumadocsSourceLoadError } from "@taxkit/docs-fumadocs/errors";
import type { FumadocsGeneratedCollectionAdapter } from "@taxkit/docs-fumadocs/live";
import { Array, Effect, Option } from "effect";

import { readGeneratedPage } from "./generated-page.boundary.js";
import type { source as generatedSource } from "./server.js";

export const createGeneratedCollectionAdapter = (
  source: typeof generatedSource
): FumadocsGeneratedCollectionAdapter => ({
  getPage: (slugs, locale) =>
    Effect.try({
      catch: () =>
        new FumadocsSourceLoadError({
          message: "The generated page lookup failed.",
          operation: "getPage",
        }),
      try: () => source.getPage(Array.fromIterable(slugs), locale),
    }).pipe(
      Effect.flatMap((page) =>
        Option.fromUndefinedOr(page).pipe(
          Option.match({
            onNone: () => Effect.void,
            onSome: (value) => readGeneratedPage(value, "getPage"),
          })
        )
      )
    ),
  listPages: (locale) =>
    Effect.try({
      catch: () =>
        new FumadocsSourceLoadError({
          message: "The generated page listing failed.",
          operation: "listPages",
        }),
      try: () => source.getPages(locale),
    }).pipe(
      Effect.flatMap((pages) =>
        Effect.forEach(pages, (page) => readGeneratedPage(page, "listPages"), {
          concurrency: "unbounded",
        })
      )
    ),
});
