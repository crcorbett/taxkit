import { docsCollection } from "@whattax/docs-content/client";
import { Picture, Pre } from "@whattax/docs-fumadocs/render";
import { Effect, Option } from "effect";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { DocsContentPreloadError } from "#/lib/docs/route-boundary";

const normalizeHref = (href: string | undefined) =>
  Option.fromUndefinedOr(href).pipe(
    Option.map((value) => value.replace(/\.mdx(?:#.*)?$/u, "")),
    Option.getOrUndefined
  );

const mdxComponents = {
  a: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a href={normalizeHref(href)} {...props}>
      {children}
    </a>
  ),
  img: Picture,
  pre: Pre,
};

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
