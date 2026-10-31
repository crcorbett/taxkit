import { Schema } from "effect";

import {
  DocsNonEmptyText,
  DocsPagePath,
  DocsPageSlug,
  DocsSourcePath,
} from "./schemas.js";

export const DocsSourceOperation = Schema.Literals([
  "buildCatalogue",
  "decode",
  "getDiscoveryDocument",
  "getNavigation",
  "getPage",
  "listPages",
  "parse",
  "read",
  "searchPages",
  "validateContent",
]);
export type DocsSourceOperation = typeof DocsSourceOperation.Type;

// Public transports share these fixed failures; internal source errors retain
// their checked diagnostic fields only inside the content application.
export class DocsPageUnavailable extends Schema.TaggedError<DocsPageUnavailable, { readonly brand: unique symbol }>()(
  "DocsPageUnavailable",
  { message: Schema.Literal("The documentation page was not found.") }
) {}

export class DocsSearchUnavailable extends Schema.TaggedError<DocsSearchUnavailable, { readonly brand: unique symbol }>()(
  "DocsSearchUnavailable",
  {
    message: Schema.Literal("Documentation search is temporarily unavailable."),
  }
) {}

export class DocsPageNotFoundError extends Schema.TaggedError<DocsPageNotFoundError, { readonly brand: unique symbol }>()(
  "DocsPageNotFoundError",
  {
    path: DocsPagePath,
  }
) {}

export class DocsSlugNotFoundError extends Schema.TaggedError<DocsSlugNotFoundError, { readonly brand: unique symbol }>()(
  "DocsSlugNotFoundError",
  {
    slug: DocsPageSlug,
  }
) {}

export class DocsSourceError extends Schema.TaggedError<DocsSourceError, { readonly brand: unique symbol }>()(
  "DocsSourceError",
  {
    message: DocsNonEmptyText,
    operation: DocsSourceOperation,
    source: Schema.optional(DocsSourcePath),
  }
) {}

// Authoring failures always name the file and a matchable reason. Provider
// reasons survive translation, but source text and raw exceptions never do.
export class DocsPageReadError extends Schema.TaggedError<DocsPageReadError, { readonly brand: unique symbol }>()(
  "DocsPageReadError",
  {
    message: DocsNonEmptyText,
    reason: Schema.Literals([
      "frontmatter",
      "syntax",
      "title",
      "link",
      "code-language",
      "code-metadata",
      "code-highlight",
      "code-tokens",
      "diagram-title",
      "diagram-source",
      "diagram-render",
      "diagram-svg",
      "heading",
      "body",
    ]),
    source: DocsSourcePath,
  }
) {}

// A share image could not be produced. No page text or provider cause is kept.
export class DocsImageRenderError extends Schema.TaggedError<DocsImageRenderError, { readonly brand: unique symbol }>()(
  "DocsImageRenderError",
  { reason: Schema.Literals(["font", "render", "output", "missing"]) }
) {}

// A published page's head metadata could not be built from its checked values.
export class DocsMetadataError extends Schema.TaggedError<DocsMetadataError, { readonly brand: unique symbol }>()(
  "DocsMetadataError",
  { reason: Schema.Literal("invalid-metadata") }
) {}
