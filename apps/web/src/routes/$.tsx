import { createFileRoute } from "@tanstack/react-router";
import { Option } from "effect";

import { DocsHeading } from "#/lib/docs/components";
import {
  DocsPageNotFound,
  DocsPageUnavailable,
  DocsNavigation,
} from "#/lib/docs/page.view";
import { DocsReadingBodyView } from "#/lib/docs/reading-body.view";
import { loadDocsPage } from "#/lib/loaders";
import type { WebsiteDocsPageView } from "#/lib/schemas";
import { docsHead } from "#/lib/seo/head";

export const Route = createFileRoute("/$")({
  component: function DocumentationRoute() {
    const { metadata, navigation, page } = Route.useLoaderData();
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
            <a href={metadata.markdown}>Read this page as Markdown</a>
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
    Option.fromNullishOr(loaderData).pipe(
      Option.map(({ metadata }) => docsHead(metadata)),
      Option.getOrElse(() => ({
        meta: [{ title: "Documentation | TaxKit" }],
      }))
    ),
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
