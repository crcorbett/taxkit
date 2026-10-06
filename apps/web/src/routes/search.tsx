import { createFileRoute } from "@tanstack/react-router";
import { Match, Option, Result } from "effect";

import { DocsHeading } from "#/lib/docs/components";
import { DocsNavigation } from "#/lib/docs/page.view";
import { docsSearchRouteBoundary } from "#/lib/docs/route-boundary";
import { readDocsSearchLocation } from "#/lib/docs/search-location.boundary";
import { DocsSearchForm, DocsSearchResults } from "#/lib/docs/search.view";

const SearchUnavailable = () => (
  <section className="docs-state" role="alert">
    <DocsHeading>Search documentation</DocsHeading>
    <p>
      Documentation search could not load. Please reload this page to try again.
    </p>
    <DocsSearchForm term="" />
    <a href="/start/quickstart">Open the Quickstart</a>
  </section>
);

export const Route = createFileRoute("/search")({
  component: function DocumentationSearchRoute() {
    const restored = docsSearchRouteBoundary.restore(Route.useLoaderData());
    return Result.match(restored, {
      onFailure: (error) => (
        <section className="docs-state" role="alert">
          <DocsHeading>Search documentation</DocsHeading>
          <p>
            {Match.value(error).pipe(
              Match.tag(
                "DocsSearchInputError",
                () => "Enter up to 100 characters to search the documentation."
              ),
              Match.orElse(
                () =>
                  "Documentation search could not load. Please reload this page to try again."
              )
            )}
          </p>
          <DocsSearchForm term="" />
          <a href="/start/quickstart">Open the Quickstart</a>
        </section>
      ),
      onSuccess: ({ navigation, results, term }) => (
        <div className="docs-layout">
          <aside className="docs-sidebar">
            <DocsNavigation
              currentPath={Option.none()}
              navigation={navigation}
            />
          </aside>
          <article className="docs-article">
            <DocsHeading>Search documentation</DocsHeading>
            <DocsSearchForm term={term} />
            <DocsSearchResults results={results} term={term} />
          </article>
        </div>
      ),
    });
  },
  errorComponent: SearchUnavailable,
  head: () => ({
    meta: [
      { title: "Search documentation | TaxKit" },
      { content: "noindex, follow", name: "robots" },
      {
        content: "Find a TaxKit guide, API reference or integration example.",
        name: "description",
      },
    ],
  }),
  loader: ({ location, context, abortController }) =>
    context.loadDocsSearch({
      query: readDocsSearchLocation(location.searchStr),
      signal: abortController.signal,
    }),
  pendingComponent: () => (
    <section aria-busy="true" aria-live="polite" className="docs-state">
      <h1>Searching documentation</h1>
      <p>Matching pages are being loaded.</p>
    </section>
  ),
  pendingMs: 150,
  // Each original address supplies its own words. Do not reuse a cached result
  // from a previous query or let the framework's JSON query parser change it.
  shouldReload: true,
});
