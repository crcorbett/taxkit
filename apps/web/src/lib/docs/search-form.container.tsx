import { useAtom, useAtomSet } from "@effect/atom-react";
import { useRouter } from "@tanstack/react-router";
import type { DocsSearchTerm } from "@taxkit/content/schemas";
import { Function as EffectFunction, Option } from "effect";
import * as Atom from "effect/reactivity/Atom";
import { Search } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";

import { docsHeadingFocusAtom } from "./focus.atoms";

// A draft per submitted search term. Each mounted form starts from its own
// term; the registry discards the draft once the form unmounts.
const docsSearchDraftAtom = Atom.family((term: DocsSearchTerm | "") =>
  Atom.make<string>(term)
);

export const DocsSearchForm = ({
  term,
}: Readonly<{ term: DocsSearchTerm | "" }>) => {
  const draft = docsSearchDraftAtom(term);
  const [words, setWords] = useAtom(draft);
  const requestHeadingFocus = useAtomSet(docsHeadingFocusAtom);
  const router = useRouter();
  return (
    <search>
      <form
        action="/search"
        className="docs-search-form"
        method="GET"
        onSubmit={(event) => {
          event.preventDefault();
          const href = `/search?${new URLSearchParams({ term: words })}`;
          EffectFunction.pipe(href, Option.some, requestHeadingFocus);
          // Native history emits the navigation; Router owns asynchronous loaders,
          // cancellation and errors. The ordinary GET action also works without JS.
          router.history.push(href);
        }}
      >
        <Field>
          <FieldLabel htmlFor="docs-search-term">Search words</FieldLabel>
          <div className="docs-search-controls">
            <Input
              aria-describedby="docs-search-description"
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
            <Button size="lg" type="submit">
              <Search aria-hidden="true" size={16} />
              <span>Search documentation</span>
            </Button>
          </div>
          <FieldDescription id="docs-search-description">
            Search the guides, API reference and integration examples.
          </FieldDescription>
        </Field>
      </form>
    </search>
  );
};
