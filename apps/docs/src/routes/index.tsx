import { createFileRoute } from "@tanstack/react-router";

import { loadDocsHome } from "#/lib/docs/loaders";
import { docsHomeRouteBoundary } from "#/lib/docs/route-boundary";

export const Route = createFileRoute("/")({
  component() {
    const loaderData = Route.useLoaderData();

    return docsHomeRouteBoundary.match(loaderData, {
      onFailure: () => (
        <section className="docs-error" data-testid="loader-error">
          <h1>Docs are unavailable</h1>
          <p>The documentation source could not be loaded.</p>
        </section>
      ),
      onSuccess: ({ navigation, pages }) => (
        <section className="docs-home">
          <div className="docs-home__intro">
            <p className="docs-kicker">WhatTax docs</p>
            <h1>Open-source tax engine, API and SDK documentation</h1>
            <p>
              Start with the integration path, then move through SDK, API,
              guides, concepts, contribution notes and reference material.
            </p>
          </div>
          <nav aria-label="Primary documentation" className="docs-section-list">
            {navigation.primaryNavigation.map((section) => (
              <a
                className="docs-section-card"
                href={section.path}
                key={section.path}
              >
                <span>{section.title}</span>
                <small>{section.primaryReader}</small>
              </a>
            ))}
          </nav>
          <p className="docs-count">
            {pages.length} documentation pages loaded.
          </p>
        </section>
      ),
    });
  },
  loader: loadDocsHome,
});
