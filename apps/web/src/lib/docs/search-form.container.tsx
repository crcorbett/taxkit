import { useRouter } from "@tanstack/react-router";
import type { DocsSearchTerm } from "@taxkit/content/schemas";
import { Search } from "lucide-react";
import { useState } from "react";

import { requestDocsHeadingFocus } from "./components";

export const DocsSearchForm = ({
  term,
}: Readonly<{ term: DocsSearchTerm | "" }>) => {
  const [words, setWords] = useState<string>(term);
  const router = useRouter();
  return (
    <search>
      <form
        action="/search"
        className="docs-search-form"
        method="GET"
        onSubmit={(event) => {
          event.preventDefault();
          requestDocsHeadingFocus();
          // Native history emits the navigation; Router owns asynchronous loaders,
          // cancellation and errors. The ordinary GET action also works without JS.
          router.history.push(
            `/search?${new URLSearchParams({ term: words })}`
          );
        }}
      >
        <label htmlFor="docs-search-term">Search words</label>
        <div className="docs-search-controls">
          <input
            autoComplete="off"
            id="docs-search-term"
            maxLength={100}
            name="term"
            onChange={(event) => {
              setWords(event.currentTarget.value);
            }}
            placeholder="Try money, annual income tax, or Effect"
            type="search"
            value={words}
          />
          <button type="submit">
            <Search aria-hidden="true" size={16} />
            <span>Search documentation</span>
          </button>
        </div>
        <p>Search the guides, API reference and integration examples.</p>
      </form>
    </search>
  );
};
