import { createFileRoute } from "@tanstack/react-router";
import { MdxTheme } from "@taxkit/mdx-react/theme";
import { Match, Option } from "effect";

import { DocsHeader } from "#/lib/docs/chrome.view";
import { DocsHeading } from "#/lib/docs/components";
import { DocsNavigation } from "#/lib/docs/page.view";
import { DocsSearchForm } from "#/lib/docs/search-form.container";
import { readDocsSearchTerm } from "#/lib/docs/search-location.ingress";
import { DocsSearchResults } from "#/lib/docs/search.view";
import { DocsState } from "#/lib/docs/state.view";
import { loadDocsSearch } from "#/lib/pages/loaders";

const SearchUnavailable = () => (
  <DocsState title="Search documentation">
    <p role="alert">
      Documentation search could not load. Please reload this page to try again.
    </p>
    <DocsSearchForm term="" />
  </DocsState>
);

export const Route = createFileRoute("/search")({
  component: DocumentationSearchRoute,
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
  // Router must distinguish the preserved query pairs in its match cache.
  // Validation still reads the original address once in the loader below.
  loaderDeps: ({ search }) => search,
  loader: ({ location, context, abortController }) =>
    loadDocsSearch({
      context,
      query: readDocsSearchTerm(location.searchStr),
      signal: abortController.signal,
    }),
  // Refresh a restored query through its own match and preserve human words.
  shouldReload: true,
});

function DocumentationSearchRoute() {
  return Match.value(Route.useLoaderData()).pipe(
    Match.tag("InvalidSearch", () => (
      <DocsState title="Search documentation">
        <p role="alert">
          Enter up to 100 characters to search the documentation.
        </p>
        <DocsSearchForm term="" />
      </DocsState>
    )),
    Match.tag("Found", ({ navigation, results, term, theme }) => (
      <MdxTheme className="docs-reader" theme={theme}>
        <DocsHeader currentPath={Option.none()} navigation={navigation} />
        <div className="docs-layout docs-search-layout">
          <aside className="docs-sidebar">
            <DocsNavigation
              currentPath={Option.none()}
              navigation={navigation}
            />
          </aside>
          <article className="docs-article">
            <div className="docs-breadcrumbs">Documentation</div>
            <DocsHeading>Search documentation</DocsHeading>
            <p className="docs-search-description">
              Find the right guide, reference or integration example.
            </p>
            <DocsSearchForm key={term} term={term} />
            <DocsSearchResults results={results} term={term} />
          </article>
        </div>
      </MdxTheme>
    )),
    Match.exhaustive
  );
}
