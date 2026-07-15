import {
  loadFumadocsPage,
  loadFumadocsPages,
} from "@taxkit/docs-fumadocs/source";
import type { FumadocsSourceLoader } from "@taxkit/docs-fumadocs/source";
import { Array as EffectArray, Effect, Layer, Option, Schema } from "effect";

import { DocsPageNotFoundError, DocsSourceError } from "./errors.js";
import { DocsPagePath, DocsPageSlug } from "./schemas.js";
import type {
  DocsContentPage,
  DocsNavigation,
  DocsNavigationLeaf,
} from "./schemas.js";
import { source } from "./server.js";
import { DocsContentService } from "./service.js";
import type { DocsRenderableContentPage } from "./service.js";
import { getNavigation, validateContent } from "./validation/policy.js";

type DocsSource = typeof source;
type DocsSourcePage = ReturnType<DocsSource["getPages"]>[number];
type DocsSourceMeta = NonNullable<ReturnType<DocsSource["getNodeMeta"]>>;

const mutableSlugsFromReadonly = (slugs: readonly string[] | undefined) =>
  Option.fromUndefinedOr(slugs).pipe(
    Option.match({
      onNone: () => Option.none<string[]>().pipe(Option.getOrUndefined),
      onSome: (value) => globalThis.Array.from(value),
    })
  );

const docsSourceLoader: FumadocsSourceLoader<DocsSourcePage, DocsSourceMeta> = {
  getNodeMeta: (node, language) => source.getNodeMeta(node, language),
  getNodePage: (node, language) => source.getNodePage(node, language),
  getPage: (slugs, language) =>
    source.getPage(mutableSlugsFromReadonly(slugs), language),
  getPageTree: (language) => source.getPageTree(language),
  getPages: (language) => source.getPages(language),
};

const pagePathFromSlugs = (slugs: readonly string[]) =>
  Schema.decodeUnknownEffect(DocsPagePath)(`/${slugs.join("/")}`).pipe(
    Effect.mapError((cause) => new DocsSourceError({ cause }))
  );

const navigationLeaves = (navigation: DocsNavigation) =>
  EffectArray.flatMap(navigation.primaryNavigation, (section) => [
    section,
    ...Option.fromNullishOr(section.pages).pipe(
      Option.getOrElse(() => EffectArray.empty<DocsNavigationLeaf>())
    ),
  ]);

const sourcePathFromNavigation = (
  navigation: DocsNavigation,
  path: DocsPagePath
) =>
  EffectArray.findFirst(
    navigationLeaves(navigation),
    (leaf) => leaf.path === path
  ).pipe(
    Option.match({
      onNone: () =>
        Effect.fail(
          new DocsSourceError({
            cause: new Error(`Docs navigation source missing for ${path}`),
          })
        ),
      onSome: (leaf) => Effect.succeed(leaf.source),
    })
  );

const slugsFromPage = (page: DocsSourcePage) =>
  Effect.forEach(page.slugs, (slug) =>
    Schema.decodeUnknownEffect(DocsPageSlug)(slug)
  ).pipe(Effect.mapError((cause) => new DocsSourceError({ cause })));

const slugsFromPath = (path: DocsPagePath) =>
  EffectArray.filter(path.split("/"), (segment) => segment.length > 0);

const contentPageFromSourcePage = (
  navigation: DocsNavigation,
  page: DocsSourcePage
): Effect.Effect<DocsContentPage, DocsSourceError> =>
  Effect.gen(function* () {
    const markdown = yield* Effect.promise<string>(() =>
      page.data.getText("processed")
    );
    const path = yield* pagePathFromSlugs(page.slugs);
    const slugs = yield* slugsFromPage(page);
    const sourcePath = yield* sourcePathFromNavigation(navigation, path);

    return {
      frontmatter: page.data,
      markdown,
      path,
      slugs,
      source: sourcePath,
    } satisfies DocsContentPage;
  });

const renderableContentPageFromSourcePage = (
  navigation: DocsNavigation,
  page: DocsSourcePage
): Effect.Effect<DocsRenderableContentPage, DocsSourceError> =>
  Effect.gen(function* () {
    const contentPage = yield* contentPageFromSourcePage(navigation, page);
    const body = yield* Effect.promise(() => page.data.load());

    return {
      ...contentPage,
      body: body.body,
      structuredData: body.structuredData,
      toc: body.toc,
    } satisfies DocsRenderableContentPage;
  });

export const DocsContentServiceLive = Layer.succeed(
  DocsContentService,
  DocsContentService.of({
    getNavigation: () => getNavigation,
    getPage: (path) =>
      Effect.gen(function* () {
        const navigation = yield* getNavigation;
        const page = yield* loadFumadocsPage(
          docsSourceLoader,
          slugsFromPath(path)
        );
        return yield* contentPageFromSourcePage(navigation, page);
      }).pipe(
        Effect.catchTag("FumadocsPageNotFoundError", () =>
          Effect.fail(
            new DocsPageNotFoundError({
              path,
            })
          )
        ),
        Effect.catchTag("FumadocsSourceLoaderError", (error) =>
          Effect.fail(new DocsSourceError({ cause: error.cause }))
        )
      ),
    getRenderablePage: (path) =>
      Effect.gen(function* () {
        const navigation = yield* getNavigation;
        const page = yield* loadFumadocsPage(
          docsSourceLoader,
          slugsFromPath(path)
        );
        return yield* renderableContentPageFromSourcePage(navigation, page);
      }).pipe(
        Effect.catchTag("FumadocsPageNotFoundError", () =>
          Effect.fail(
            new DocsPageNotFoundError({
              path,
            })
          )
        ),
        Effect.catchTag("FumadocsSourceLoaderError", (error) =>
          Effect.fail(new DocsSourceError({ cause: error.cause }))
        )
      ),
    listPages: () =>
      Effect.all({
        navigation: getNavigation,
        pages: loadFumadocsPages(docsSourceLoader),
      }).pipe(
        Effect.flatMap((pages) =>
          Effect.forEach(pages.pages, (page) =>
            contentPageFromSourcePage(pages.navigation, page)
          )
        ),
        Effect.catchTag("FumadocsSourceLoaderError", (error) =>
          Effect.fail(new DocsSourceError({ cause: error.cause }))
        )
      ),
    listRenderablePages: () =>
      Effect.all({
        navigation: getNavigation,
        pages: loadFumadocsPages(docsSourceLoader),
      }).pipe(
        Effect.flatMap((pages) =>
          Effect.forEach(pages.pages, (page) =>
            renderableContentPageFromSourcePage(pages.navigation, page)
          )
        ),
        Effect.catchTag("FumadocsSourceLoaderError", (error) =>
          Effect.fail(new DocsSourceError({ cause: error.cause }))
        )
      ),
    validateContent: () => validateContent,
  })
);
