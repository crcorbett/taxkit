import { createFileRoute } from "@tanstack/react-router";
import type {
  DocsContentPage,
  DocsNavigation,
} from "@whattax/docs-content/schemas";
import { Array, Result, pipe } from "effect";

import { loadDocsHome } from "#/lib/docs/loaders";
import { docsHomeRouteBoundary } from "#/lib/docs/route-boundary";

const DocsHomeFailure = () => (
  <section className="docs-error" data-testid="loader-error">
    <h1>Docs are unavailable</h1>
    <p>The documentation source could not be loaded.</p>
  </section>
);

const DocsHomeContent = ({
  navigation,
  pages,
}: Readonly<{
  navigation: DocsNavigation;
  pages: readonly DocsContentPage[];
}>) => (
  <section className="docs-home">
    <div className="docs-home__intro">
      <p className="docs-kicker">WhatTax docs</p>
      <h1>Open-source tax engine, API and SDK documentation</h1>
      <p>
        Start with the integration path, then move through SDK, API, guides,
        concepts, contribution notes and reference material.
      </p>
    </div>
    <nav aria-label="Primary documentation" className="docs-section-list">
      {pipe(
        navigation.primaryNavigation,
        Array.map((section) => (
          <a
            className="docs-section-card"
            href={section.path}
            key={section.path}
          >
            <span>{section.title}</span>
            <small>{section.primaryReader}</small>
          </a>
        ))
      )}
    </nav>
    <p className="docs-count">{pages.length} documentation pages loaded.</p>
  </section>
);

export const Route = createFileRoute("/")({
  component() {
    const loaderData = Route.useLoaderData();
    const routeResult = docsHomeRouteBoundary.restore(loaderData);

    return Result.match(routeResult, {
      onFailure: () => <DocsHomeFailure />,
      onSuccess: ({ navigation, pages }) => (
        <DocsHomeContent navigation={navigation} pages={pages} />
      ),
    });
  },
  loader: loadDocsHome,
});
