import { docsCollection } from "@whattax/docs-content/client";
import type { DocsSourcePath } from "@whattax/docs-content/schemas";
import { Effect } from "effect";
import type { ReactNode } from "react";

import { DocsContentPreloadError } from "#/lib/docs/errors";

import { mdxComponents } from "./components";

const docsContentLoader = docsCollection.createClientLoader({
  component({ default: MDX }) {
    return <MDX components={mdxComponents} />;
  },
});

const docsClientPath = (source: DocsSourcePath) =>
  source.replace(/^content\//u, "");

export const preloadDocsContent = (
  source: DocsSourcePath
): Effect.Effect<void, DocsContentPreloadError> =>
  Effect.tryPromise({
    catch: (cause) =>
      new DocsContentPreloadError({
        message: String(cause),
        path: source,
      }),
    try: () => docsContentLoader.preload(docsClientPath(source)),
  }).pipe(Effect.asVoid);

export const MdxDocument = ({
  source,
}: {
  readonly source: DocsSourcePath;
}): ReactNode => docsContentLoader.useContent(docsClientPath(source));
