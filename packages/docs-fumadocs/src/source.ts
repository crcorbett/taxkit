import { Effect, Option } from "effect";
import type { Folder, Item, Root } from "fumadocs-core/page-tree";

import {
  FumadocsPageNotFoundError,
  FumadocsSourceLoaderError,
} from "./schemas.js";

export interface FumadocsSourceLoader<Page, Meta> {
  readonly getPage: (
    slugs: readonly string[] | undefined,
    language?: string | undefined
  ) => Page | undefined;
  readonly getPages: (language?: string | undefined) => readonly Page[];
  readonly getPageTree: (locale?: string | undefined) => Root;
  readonly getNodeMeta: (
    node: Folder | Root,
    language?: string | undefined
  ) => Meta | undefined;
  readonly getNodePage: (
    node: Item,
    language?: string | undefined
  ) => Page | undefined;
}

export const loadFumadocsPage = <Page, Meta>(
  loader: FumadocsSourceLoader<Page, Meta>,
  slugs: readonly string[] | undefined,
  language?: string | undefined
): Effect.Effect<Page, FumadocsPageNotFoundError | FumadocsSourceLoaderError> =>
  Effect.try({
    catch: (cause) => new FumadocsSourceLoaderError({ cause }),
    try: () => loader.getPage(slugs, language),
  }).pipe(
    Effect.flatMap((page) =>
      Option.fromUndefinedOr(page).pipe(
        Option.match({
          onNone: () =>
            Effect.fail(
              new FumadocsPageNotFoundError({
                language,
                slugs: Option.fromUndefinedOr(slugs).pipe(
                  Option.getOrElse(() => [])
                ),
              })
            ),
          onSome: Effect.succeed,
        })
      )
    )
  );

export const loadFumadocsPages = <Page, Meta>(
  loader: FumadocsSourceLoader<Page, Meta>,
  language?: string | undefined
): Effect.Effect<readonly Page[], FumadocsSourceLoaderError> =>
  Effect.try({
    catch: (cause) => new FumadocsSourceLoaderError({ cause }),
    try: () => loader.getPages(language),
  });

export const loadFumadocsPageTree = <Page, Meta>(
  loader: FumadocsSourceLoader<Page, Meta>,
  language?: string | undefined
): Effect.Effect<Root, FumadocsSourceLoaderError> =>
  Effect.try({
    catch: (cause) => new FumadocsSourceLoaderError({ cause }),
    try: () => loader.getPageTree(language),
  });

export const loadFumadocsNodePage = <Page, Meta>(
  loader: FumadocsSourceLoader<Page, Meta>,
  node: Item,
  language?: string | undefined
): Effect.Effect<Page, FumadocsPageNotFoundError | FumadocsSourceLoaderError> =>
  Effect.try({
    catch: (cause) => new FumadocsSourceLoaderError({ cause }),
    try: () => loader.getNodePage(node, language),
  }).pipe(
    Effect.flatMap((page) =>
      Option.fromUndefinedOr(page).pipe(
        Option.match({
          onNone: () =>
            Effect.fail(
              new FumadocsPageNotFoundError({
                language,
                slugs: [],
              })
            ),
          onSome: Effect.succeed,
        })
      )
    )
  );
