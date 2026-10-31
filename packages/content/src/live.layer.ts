import navigationRepresentation from "@content/docs/navigation.json" with { type: "json" };
import repositoryRepresentation from "@content/docs/repository.json" with { type: "json" };
import {
  Match,
  Function as EffectFunction,
  Array,
  Effect,
  HashMap,
  HashSet,
  Layer,
  Result,
  Schema,
} from "effect";

import { DocsPageNotFoundError, DocsSourceError } from "./errors.js";
import { readingMarkdown } from "./reading-markdown.egress.js";
import {
  DocsNavigation,
  DocsPageSlug,
  DocsPublicCatalogue,
  DocsRepositoryProfile,
  DocsSearchExcerpt,
} from "./schemas.js";
import type {
  DocsPagePath,
  DocsSearchResult,
  DocsSearchTerm,
} from "./schemas.js";
import {
  ContentCatalogue,
  ContentService,
  DocsPageReader,
  DocsSources,
} from "./service.js";

const catalogueFailure = (message: string) =>
  new DocsSourceError({ message, operation: "buildCatalogue" });
// The one public catalogue, built once from the bundled MDX files. The
// navigation decides each page's address and order; frontmatter decides
// whether it is published. Any unreadable page fails the Layer.
export const ContentCatalogueLive = Layer.effect(
  ContentCatalogue,
  Effect.gen(function* () {
    const sources = yield* DocsSources;
    const reader = yield* DocsPageReader;
    const navigation = yield* Schema.decodeUnknownEffect(DocsNavigation)(
      navigationRepresentation
    ).pipe(
      Effect.mapError(() => catalogueFailure("The docs navigation is invalid."))
    );
    const repository = yield* Schema.decodeEffect(DocsRepositoryProfile)(
      repositoryRepresentation
    ).pipe(
      Effect.mapError(() =>
        catalogueFailure("The docs repository profile is invalid.")
      )
    );
    const leaves = EffectFunction.pipe(
      navigation.primaryNavigation,
      Array.flatMap((item) => [item, ...(item.pages ?? [])])
    );
    const addresses = HashMap.fromIterable(
      EffectFunction.pipe(
        leaves,
        Array.map((leaf) => [leaf.source, leaf.path] as const)
      )
    );
    if (
      sources.length !== leaves.length ||
      !EffectFunction.pipe(
        sources,
        Array.every((source) => HashMap.has(addresses, source.path))
      )
    ) {
      return yield* catalogueFailure(
        "The bundled MDX files must match the navigation."
      );
    }
    const pages = yield* EffectFunction.pipe(
      leaves,
      Effect.forEach((leaf) =>
        Effect.gen(function* () {
          const source = yield* EffectFunction.pipe(
            sources,
            Array.findFirst((candidate) => candidate.path === leaf.source)
          ).pipe(
            Effect.fromOption,
            Effect.mapError(() =>
              catalogueFailure(
                "The bundled MDX files must match the navigation."
              )
            )
          );
          const page = yield* reader.read({
            source,
            links: {
              pages: addresses,
              repository,
              source: leaf.source,
            },
          });
          const slugs = yield* Effect.forEach(
            EffectFunction.pipe(
              leaf.path.split("/"),
              Array.filter((segment) => segment !== "")
            ),
            (segment) => DocsPageSlug.makeEffect(segment)
          ).pipe(
            Effect.mapError(() =>
              catalogueFailure("A navigation address is invalid.")
            )
          );
          return {
            ...page,
            markdown: readingMarkdown({
              body: page.body,
              title: page.frontmatter.title,
            }),
            path: leaf.path,
            slugs,
            source: leaf.source,
          };
        })
      )
    );
    const published = HashSet.fromIterable(
      EffectFunction.pipe(
        pages,
        Array.flatMap((page) =>
          Match.value(page.frontmatter).pipe(
            Match.when({ status: "published" }, () => [page.path]),
            Match.orElse(() => [])
          )
        )
      )
    );
    // A published child needs its published section page; it is never
    // silently dropped because its parent is still a draft.
    if (
      navigation.status !== "published" ||
      EffectFunction.pipe(
        navigation.primaryNavigation,
        Array.some(
          (item) =>
            !HashSet.has(published, item.path) &&
            EffectFunction.pipe(
              item.pages ?? [],
              Array.some((child) => HashSet.has(published, child.path))
            )
        )
      )
    ) {
      return yield* catalogueFailure(
        "Published pages need published navigation and section pages."
      );
    }
    return yield* DocsPublicCatalogue.makeEffect({
      navigation: {
        primaryNavigation: EffectFunction.pipe(
          navigation.primaryNavigation,
          Array.filter((item) => HashSet.has(published, item.path)),
          Array.map((item) => ({
            ...item,
            pages: EffectFunction.pipe(
              item.pages ?? [],
              Array.filter((child) => HashSet.has(published, child.path))
            ),
          }))
        ),
      },
      pages: Array.filterMap(pages, (page) =>
        Match.value(page.frontmatter).pipe(
          Match.when({ status: "published" }, (matchedValue) =>
            Result.succeed({
              ...page,
              frontmatter: {
                ...matchedValue,
                status: "published" as const,
              },
            })
          ),
          Match.orElse(() => Result.failVoid)
        )
      ),
      schemaVersion: 1,
    }).pipe(
      Effect.mapError(() =>
        catalogueFailure("The public docs catalogue is invalid.")
      )
    );
  })
);
export const ContentServiceLive = Layer.effect(
  ContentService,
  Effect.gen(function* () {
    const catalogue = yield* ContentCatalogue;
    return ContentService.of({
      getNavigation: Effect.fn("ContentService.getNavigation")(() =>
        Effect.succeed(catalogue.navigation)
      ),
      getPage: Effect.fn("ContentService.getPage")((path: DocsPagePath) =>
        EffectFunction.pipe(
          catalogue.pages,
          Array.findFirst((page) => page.path === path)
        ).pipe(
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
            EffectFunction.pipe(
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
