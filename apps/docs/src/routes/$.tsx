import { createFileRoute } from "@tanstack/react-router";
import { Option } from "effect";

import { loadDocsPage } from "#/lib/docs/loaders";
import { MdxDocument } from "#/lib/mdx/components";

export const Route = createFileRoute("/$")({
  component() {
    const { navigation, page } = Route.useLoaderData();

    return (
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
          <MdxDocument markdown={page.markdown} />
        </article>
      </div>
    );
  },
  loader: loadDocsPage,
});
