import { createFileRoute } from "@tanstack/react-router";
import { Result } from "effect";

import { MdxDocument } from "#/lib/docs/mdx.boundary";
import {
  DocsPageNotFound,
  DocsPageUnavailable,
  DocsNavigation,
} from "#/lib/docs/page.view";
import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

export const Route = createFileRoute("/$")({
  component: function DocumentationRoute() {
    // This route alone restores the plain server-function representation.
    const loaderData = Route.useLoaderData();
    const restored = docsPageRouteBoundary.restore(loaderData);
    return Result.match(restored, {
      onFailure: () => <DocsPageUnavailable />,
      onSuccess: ({ navigation, page, settings }) => (
        <div className="docs-layout">
          <aside className="docs-sidebar">
            <DocsNavigation currentPath={page.path} navigation={navigation} />
          </aside>
          <article className="docs-article">
            <MdxDocument page={page} />
            <p className="docs-markdown-link">
              <a
                href={
                  new URL(
                    `/api/v1/docs/markdown?path=${encodeURIComponent(page.path)}`,
                    settings.apiOrigin
                  ).href
                }
              >
                Read this page as Markdown
              </a>
            </p>
          </article>
        </div>
      ),
    });
  },
  errorComponent: DocsPageUnavailable,
  head: ({ loaderData }) => {
    const restored = docsPageRouteBoundary.restore(loaderData);
    return Result.match(restored, {
      onFailure: () => ({ meta: [{ title: "Documentation | TaxKit" }] }),
      onSuccess: ({ page, settings }) => ({
        links: [
          {
            href: new URL(page.path, settings.websiteOrigin).href,
            rel: "canonical",
          },
        ],
        meta: [
          { title: `${page.frontmatter.title} | TaxKit` },
          { content: page.frontmatter.description, name: "description" },
        ],
      }),
    });
  },
  loader: ({ params, context, abortController }) =>
    context.loadDocsPage({
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
