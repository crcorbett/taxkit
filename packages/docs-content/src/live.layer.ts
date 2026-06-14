import {
  loadFumadocsPage,
  loadFumadocsPages,
} from "@whattax/docs-fumadocs/source";
import type { FumadocsSourceLoader } from "@whattax/docs-fumadocs/source";
import {
  Array as EffectArray,
  Effect,
  Layer,
  Match,
  Option,
  Schema,
} from "effect";

import { DocsPageNotFoundError, DocsSourceError } from "./errors.js";
import { DocsPagePath, DocsPageSlug, DocsSourcePath } from "./schemas.js";
import type { DocsContentPage } from "./schemas.js";
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
  Schema.decodeUnknownEffect(DocsPagePath)(`/${slugs.join("/")}`);

const sourcePathFromPage = (page: DocsSourcePage) => {
  const firstSlug = Option.fromUndefinedOr(page.slugs[0]).pipe(
    Option.getOrThrowWith(() => new Error("Docs source page slugs are empty"))
  );
  const sourcePath = Match.value(page.slugs.length).pipe(
    Match.when(1, () => `content/${firstSlug}/index.mdx`),
    Match.orElse(() => `content/${page.slugs.join("/")}.mdx`)
  );

  return Schema.decodeUnknownEffect(DocsSourcePath)(sourcePath);
};

const slugsFromPage = (page: DocsSourcePage) =>
  Effect.forEach(page.slugs, (slug) =>
    Schema.decodeUnknownEffect(DocsPageSlug)(slug)
  );

const slugsFromPath = (path: DocsPagePath) =>
  EffectArray.filter(path.split("/"), (segment) => segment.length > 0);

const contentPageFromSourcePage = (
  page: DocsSourcePage
): Effect.Effect<DocsContentPage, never> =>
  Effect.gen(function* () {
    const markdown = yield* Effect.promise<string>(() =>
      page.data.getText("processed")
    );
    const path = yield* pagePathFromSlugs(page.slugs).pipe(Effect.orDie);
    const slugs = yield* slugsFromPage(page).pipe(Effect.orDie);
    const sourcePath = yield* sourcePathFromPage(page).pipe(Effect.orDie);

    return {
      frontmatter: page.data,
      markdown,
      path,
      slugs,
      source: sourcePath,
    } satisfies DocsContentPage;
  });

const renderableContentPageFromSourcePage = (
  page: DocsSourcePage
): Effect.Effect<DocsRenderableContentPage, never> =>
  Effect.gen(function* () {
    const contentPage = yield* contentPageFromSourcePage(page);
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
      loadFumadocsPage(docsSourceLoader, slugsFromPath(path)).pipe(
        Effect.flatMap(contentPageFromSourcePage),
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
      loadFumadocsPage(docsSourceLoader, slugsFromPath(path)).pipe(
        Effect.flatMap(renderableContentPageFromSourcePage),
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
      loadFumadocsPages(docsSourceLoader).pipe(
        Effect.flatMap((pages) =>
          Effect.forEach(pages, contentPageFromSourcePage)
        ),
        Effect.catchTag("FumadocsSourceLoaderError", (error) =>
          Effect.fail(new DocsSourceError({ cause: error.cause }))
        )
      ),
    listRenderablePages: () =>
      loadFumadocsPages(docsSourceLoader).pipe(
        Effect.flatMap((pages) =>
          Effect.forEach(pages, renderableContentPageFromSourcePage)
        ),
        Effect.catchTag("FumadocsSourceLoaderError", (error) =>
          Effect.fail(new DocsSourceError({ cause: error.cause }))
        )
      ),
    validateContent: () => validateContent,
  })
);
