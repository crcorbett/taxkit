import { createFileRoute } from "@tanstack/react-router";
import { Option, Result } from "effect";

import { DocsHeading } from "#/lib/docs/components";
import { docsMetadata } from "#/lib/docs/metadata.egress";
import {
  DocsPageNotFound,
  DocsPageUnavailable,
  DocsNavigation,
} from "#/lib/docs/page.view";
import { DocsReadingBodyView } from "#/lib/docs/reading-body.view";
import { loadDocsPage } from "#/lib/loaders";
import type { WebsiteDocsPageView } from "#/lib/schemas";

const docsHead = (loaderData: WebsiteDocsPageView | undefined) =>
  Option.fromNullishOr(loaderData).pipe(
    Option.flatMap(({ page, publicationOrigin }) =>
      Result.getSuccess(docsMetadata(page, new URL(publicationOrigin)))
    ),
    Option.getOrElse(() => ({
      meta: [{ title: "Documentation | TaxKit" }],
    }))
  );

export const Route = createFileRoute("/$")({
  component: function DocumentationRoute() {
    const { navigation, page, publicationOrigin } = Route.useLoaderData();
    return (
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <DocsNavigation
            currentPath={Option.some(page.path)}
            navigation={navigation}
          />
        </aside>
        <article className="docs-article">
          <DocsHeading>{page.frontmatter.title}</DocsHeading>
          <DocsReadingBodyView body={page.body} />
          <p className="docs-markdown-link">
            <a href={new URL(`${page.path}.md`, publicationOrigin).href}>
              Read this page as Markdown
            </a>
          </p>
        </article>
      </div>
    );
  },
  errorComponent: DocsPageUnavailable,
  // An explicit parameter type keeps loader inference independent of head.
  head: ({
    loaderData,
  }: Readonly<{ loaderData?: WebsiteDocsPageView | undefined }>) =>
    docsHead(loaderData),
  loader: ({ params, context, abortController }) =>
    loadDocsPage({
      context,
      path: `/${params._splat}`,
      signal: abortController.signal,
    }),
  notFoundComponent: DocsPageNotFound,
  pendingComponent: () => (
    <section aria-busy="true" aria-live="polite" className="docs-state">
      <h1>Loading documentation</h1>
      <p>The requested page is being loaded.</p>
    </section>
  ),
  pendingMs: 150,
});
