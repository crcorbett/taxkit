import { Array, HashSet, Record, Result, Schema } from "effect";

import { WebsiteDocsSearchLocation, WebsiteSearchParameters } from "../schemas";
import { DocsSearchInputError } from "./errors";

// The Website has literal human query text. The framework's default JSON
// parser changes scientific numbers and quoted words, and its encoder changes
// duplicate keys. Preserve the native URL pairs through both host callbacks.
export const websiteSearchParameters = {
  parse: (raw: string): typeof WebsiteSearchParameters.Type => {
    const query = new URLSearchParams(raw);
    return Record.fromEntries(
      Array.map(
        Array.fromIterable(HashSet.fromIterable(query.keys())),
        (key) => [key, query.getAll(key)]
      )
    );
  },
  stringify: (input: typeof Schema.Unknown.Type) =>
    Schema.decodeUnknownResult(WebsiteSearchParameters)(input).pipe(
      Result.match({
        onFailure: () => "?invalid-search=1",
        onSuccess: (query) => {
          const encoded = new URLSearchParams(
            Array.flatMap(Record.toEntries(query), ([key, values]) =>
              Array.map(values, (value) => [key, value])
            )
          ).toString();
          return encoded === "" ? "" : `?${encoded}`;
        },
      })
    ),
};

// The route's original address is representation ingress, separate from
// restoration of a later encoded loader reply.
export const readDocsSearchLocation = (encoded: typeof Schema.Unknown.Type) =>
  Schema.decodeUnknownResult(WebsiteDocsSearchLocation)(encoded).pipe(
    Result.mapError(() => new DocsSearchInputError())
  );
