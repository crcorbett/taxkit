import { createServerFn } from "@tanstack/react-start";
import { DocsPagePath } from "@whattax/docs-content/schemas";
import { DocsContentService } from "@whattax/docs-content/service";
import { Effect, Schema } from "effect";

import type { RouteLoaderContext } from "#/lib/route-runtime";

const DocsPageLoaderInput = Schema.Struct({
  splat: Schema.String,
});

const normalizePath = (splat: string) =>
  Schema.decodeUnknownEffect(DocsPagePath)(`/${splat}`);

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
    })
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
        const path = yield* normalizePath(data.splat);
        const navigation = yield* content.getNavigation();
        const page = yield* content.getPage(path);

        return {
          navigation,
          page,
        };
      })
    );
  });

export const loadDocsHome = async () => await loadDocsHomeData();

export const loadDocsPage = async (
  loaderContext: RouteLoaderContext & {
    readonly params: {
      readonly _splat: string;
    };
  }
) =>
  await loadDocsPageData({
    data: {
      splat: loaderContext.params._splat,
    },
  });
