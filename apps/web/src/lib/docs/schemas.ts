import type {
  DocsPageMetadata,
  DocsPublicNavigation,
  DocsPublicPage,
  DocsSearchResult,
} from "@taxkit/content/schemas";
import { DocsSearchTerm } from "@taxkit/content/schemas";
import {
  Match,
  Function as EffectFunction,
  Array,
  Data,
  Schema,
  SchemaGetter,
} from "effect";
// A documentation page as its route renders it. Every field is plain public
// data, so TanStack serialises it natively.
export interface WebsiteDocsPageView {
  readonly metadata: DocsPageMetadata;
  readonly navigation: DocsPublicNavigation;
  readonly page: DocsPublicPage;
}
// The search route's two page states. Invalid words are a normal page, not a
// failed load. Variants are plain data, so TanStack serialises them natively.
export type WebsiteDocsSearchView = Data.TaggedEnum<{
  Found: {
    readonly navigation: DocsPublicNavigation;
    readonly results: readonly DocsSearchResult[];
    readonly term: "" | DocsSearchTerm;
  };
  // oxlint-disable-next-line typescript/no-generated-empty-object-type -- Data.TaggedEnum requires an empty payload for a zero-argument variant and adds its own discriminant.
  InvalidSearch: Readonly<Record<never, never>>;
}>;
export const WebsiteDocsSearchView = Data.taggedEnum<WebsiteDocsSearchView>();
export const WebsiteSearchParameters = Schema.Record(
  Schema.String,
  Schema.Array(Schema.String)
);
// Human search words are public page content, never calculation facts. The
// owning term Schema keeps the same 100-character bound as API search.
const WebsiteDocsSearchTerm = Schema.Trim.pipe(
  Schema.decodeTo(Schema.Union([Schema.Literal(""), DocsSearchTerm]))
);
const WebsiteDocsSearchQuery = Schema.Struct({
  term: Schema.optional(WebsiteDocsSearchTerm),
});
// Search uses the original raw address instead of the router's default JSON
// query parser, which would turn words such as 2026 or true into other types.
export const WebsiteDocsSearchLocation = Schema.String.check(
  Schema.isMaxLength(1200),
  Schema.makeFilter((raw) => {
    const query = new URLSearchParams(raw);
    return (
      query.getAll("term").length <= 1 &&
      EffectFunction.pipe(
        Array.fromIterable(query.keys()),
        Array.every((key) => key === "term")
      )
    );
  })
).pipe(
  Schema.decodeTo(WebsiteDocsSearchQuery, {
    decode: SchemaGetter.transform((raw) => ({
      term: new URLSearchParams(raw).get("term") ?? undefined,
    })),
    encode: SchemaGetter.transform((query) =>
      Match.value(query.term).pipe(
        Match.when(undefined, (): "" => ""),
        Match.orElse((matchedValue) =>
          new URLSearchParams({ term: matchedValue }).toString()
        )
      )
    ),
  })
);
