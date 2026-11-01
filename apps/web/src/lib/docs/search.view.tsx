import { Link } from "@tanstack/react-router";
import type { DocsSearchResult, DocsSearchTerm } from "@taxkit/content/schemas";
import { Match, Function as EffectFunction, Array } from "effect";

import { requestDocsNavigationFocus } from "./components";

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
        {results.length} matching{" "}
        {Match.value(results.length).pipe(
          Match.when(1, (): "page" => "page"),
          Match.orElse((): "pages" => "pages")
        )}
      </h2>
      <ol className="docs-search-results">
        {EffectFunction.pipe(
          results,
          Array.map((result) => (
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
          ))
        )}
      </ol>
    </section>
  );
};
