import { createFileRoute } from "@tanstack/react-router";
import { Match, Option } from "effect";

import { loadDocsPage } from "#/lib/docs/loaders";
import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";
import { MdxDocument } from "#/lib/mdx/components";

export const Route = createFileRoute("/$")({
  component() {
    const loaderData = Route.useLoaderData();

    return docsPageRouteBoundary.match(loaderData, {
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tags({
            DocsContentPreloadError: (preloadError) => (
              <section className="docs-error" data-testid="loader-error">
                <h1>Docs page is unavailable</h1>
                <p>{preloadError.message}</p>
              </section>
            ),
            DocsPageNotFoundError: () => (
              <section className="docs-error" data-testid="loader-error">
                <h1>Docs page not found</h1>
                <p>The requested documentation page does not exist.</p>
              </section>
            ),
            DocsSourceError: () => (
              <section className="docs-error" data-testid="loader-error">
                <h1>Docs page is unavailable</h1>
                <p>The documentation source could not be loaded.</p>
              </section>
            ),
          }),
          Match.exhaustive
        ),
      onSuccess: ({ navigation, page }) => (
        <div className="docs-page-layout">
          <aside className="docs-nav">
            <a className="docs-nav__home" href="/">
              WhatTax Docs
            </a>
            {navigation.primaryNavigation.map((section) => (
              <section className="docs-nav__section" key={section.path}>
                <a className="docs-nav__section-link" href={section.path}>
                  {section.title}
                </a>
                {Option.fromNullishOr(section.pages).pipe(
                  Option.match({
                    onNone: () => null,
                    onSome: (items) => (
                      <div className="docs-nav__links">
                        {items.map((item) => (
                          <a
                            className="docs-nav__link"
                            data-active={item.path === page.path}
                            href={item.path}
                            key={item.path}
                          >
                            {item.title}
                          </a>
                        ))}
                      </div>
                    ),
                  })
                )}
              </section>
            ))}
          </aside>
          <article className="docs-article">
            <div className="docs-article__meta">
              <span>{page.frontmatter.status}</span>
              <span>{page.source}</span>
            </div>
            <MdxDocument source={page.source} />
          </article>
        </div>
      ),
    });
  },
  loader: loadDocsPage,
});
