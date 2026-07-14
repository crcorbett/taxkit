import { createServerFn } from "@tanstack/react-start";
import { DocsSourceError } from "@whattax/docs-content/errors";
import { DocsPagePath } from "@whattax/docs-content/schemas";
import { DocsContentService } from "@whattax/docs-content/service";
import { Effect, Schema } from "effect";

import { preloadDocsContent } from "#/lib/mdx/client-loader";
import type { RouteLoaderContext } from "#/lib/route-runtime";

import { docsHomeRouteBoundary, docsPageRouteBoundary } from "./route-boundary";

const DocsPageLoaderInput = Schema.Struct({
  splat: Schema.String,
});

const loadDocsHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const { docsRuntime } = await import("#/lib/runtime.server");

  return await docsRuntime.runPromise(
    Effect.gen(function* loadDocsHomeEffect() {
      const content = yield* DocsContentService;
      const navigation = yield* content.getNavigation();
      const pages = yield* content.listPages();

      return {
        navigation,
        pages,
      };
    }).pipe(docsHomeRouteBoundary.encodeExit)
  );
});

const loadDocsPageData = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    Schema.decodeUnknownSync(DocsPageLoaderInput)(input)
  )
  .handler(async ({ data }) => {
    const { docsRuntime } = await import("#/lib/runtime.server");

    return await docsRuntime.runPromise(
      Effect.gen(function* loadDocsPageEffect() {
        const content = yield* DocsContentService;
        const path = yield* Schema.decodeUnknownEffect(DocsPagePath)(
          `/${data.splat}`
        ).pipe(Effect.mapError((cause) => new DocsSourceError({ cause })));
        const navigation = yield* content.getNavigation();
        const page = yield* content.getRenderablePage(path);
        yield* preloadDocsContent(page.source);

        return {
          navigation,
          page,
        };
      }).pipe(docsPageRouteBoundary.encodeExit)
    );
  });

export const loadDocsHome = () => loadDocsHomeData();

export const loadDocsPage = (
  loaderContext: RouteLoaderContext & {
    readonly params: {
      readonly _splat: string;
    };
  }
) =>
  loadDocsPageData({
    data: {
      splat: loaderContext.params._splat,
    },
  });
