import { Link } from "@tanstack/react-router";
import type { DocsSearchResult, DocsSearchTerm } from "@taxkit/content/schemas";
import { Array } from "effect";

import { requestDocsNavigationFocus } from "./components";

export const DocsSearchForm = ({
  term,
}: {
  readonly term: DocsSearchTerm | "";
}) => (
  <search>
    <form action="/search" className="docs-search-form" method="GET">
      <label htmlFor="docs-search-term">Search words</label>
      <div className="docs-search-controls">
        <input
          autoComplete="off"
          defaultValue={term}
          id="docs-search-term"
          key={term}
          maxLength={100}
          name="term"
          type="search"
        />
        <button type="submit">Search documentation</button>
      </div>
      <p>Search the guides, API reference and integration examples.</p>
    </form>
  </search>
);

export const DocsSearchResults = ({
  results,
  term,
}: {
  readonly results: readonly DocsSearchResult[];
  readonly term: DocsSearchTerm | "";
}) => {
  if (term === "") {
    return <p>Enter a few words to find a documentation page.</p>;
  }
  if (results.length === 0) {
    return (
      <section aria-live="polite">
        <h2>No matching pages</h2>
        <p>
          Try fewer words or choose a page from the documentation navigation.
        </p>
      </section>
    );
  }
  return (
    <section aria-label="Documentation search results">
      <h2>
        {results.length} matching {results.length === 1 ? "page" : "pages"}
      </h2>
      <ol className="docs-search-results">
        {Array.map(results, (result) => (
          <li key={result.path}>
            <h3>
              <Link
                onClick={requestDocsNavigationFocus}
                params={{ _splat: result.path.slice(1) }}
                to="/$"
              >
                {result.title}
              </Link>
            </h3>
            <p>{result.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};
