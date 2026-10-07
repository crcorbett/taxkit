import { Option, Schema } from "effect";
import { Headers } from "effect/http";

import { CollectionPolicy, CollectionPolicyHeader } from "./schemas.js";

// A missing flag keeps direct API clients compatible. Malformed or denied
// flags refuse collection, and native Do Not Track takes precedence.
export const collectionPolicyFromHeaders = (
  headers: Headers.Headers
): CollectionPolicy =>
  Option.contains(Headers.get(headers, "dnt"), "1")
    ? "deny"
    : Headers.get(headers, CollectionPolicyHeader).pipe(
        Option.match({
          onNone: () => "allow",
          onSome: (value) =>
            Schema.decodeUnknownOption(CollectionPolicy)(value).pipe(
              Option.getOrElse(() => "deny" as const)
            ),
        })
      );
