import { docsCollection } from "@whattax/docs-content/client";
import { Effect } from "effect";
import type { ReactNode } from "react";

import { DocsContentPreloadError } from "#/lib/docs/route-boundary";

import { mdxComponents } from "./components";

const docsContentLoader = docsCollection.createClientLoader({
  component({ default: MDX }) {
    return <MDX components={mdxComponents} />;
  },
});

const docsClientPath = (source: string) => source.replace(/^content\//u, "");

export const preloadDocsContent = (
  source: string
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
  readonly source: string;
}): ReactNode => docsContentLoader.useContent(docsClientPath(source));
