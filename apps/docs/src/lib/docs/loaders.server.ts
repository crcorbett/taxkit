import "@tanstack/react-start/server-only";
import { notFound } from "@tanstack/react-router";
import { DocsSourceError } from "@taxkit/docs-content/errors";
import { DocsPagePath } from "@taxkit/docs-content/schemas";
import { DocsContentService } from "@taxkit/docs-content/service";
import { Effect, Schema } from "effect";

import { preloadDocsContent } from "#/lib/mdx/client-loader";
import { docsRuntime } from "#/lib/runtime.server";

import { docsHomeRouteBoundary, docsPageRouteBoundary } from "./route-boundary";

const DocsPageLoaderInput = Schema.Struct({
  splat: Schema.String,
});

export const loadDocsHomeServer = () =>
  docsRuntime.runPromise(
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

export const loadDocsPageServer = (data: typeof Schema.Unknown.Type) =>
  docsRuntime.runPromise(
    Schema.decodeUnknownEffect(DocsPageLoaderInput)(data).pipe(
      Effect.mapError(
        () =>
          new DocsSourceError({
            message: "The docs route input was invalid.",
            operation: "decode",
          })
      ),
      Effect.flatMap(({ splat }) =>
        Effect.gen(function* loadDocsPageEffect() {
          const content = yield* DocsContentService;
          const path = yield* Schema.decodeEffect(DocsPagePath)(
            `/${splat}`
          ).pipe(
            Effect.mapError(
              () =>
                new DocsSourceError({
                  message: "The docs page path was invalid.",
                  operation: "decode",
                })
            )
          );
          const navigation = yield* content.getNavigation();
          const page = yield* content.getPage(path);
          yield* preloadDocsContent(page.source);

          return {
            navigation,
            page,
          };
        })
      ),
      Effect.catchTag("DocsPageNotFoundError", () => Effect.die(notFound())),
      docsPageRouteBoundary.encodeExit
    )
  );
