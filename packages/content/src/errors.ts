import { Schema } from "effect";

import {
  DocsCodeLanguage,
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
export class DocsPageUnavailable extends Schema.TaggedError<
  DocsPageUnavailable,
  { readonly brand: unique symbol }
>()("DocsPageUnavailable", {
  message: Schema.Literal("The documentation page was not found."),
}) {}

export class DocsSearchUnavailable extends Schema.TaggedError<
  DocsSearchUnavailable,
  { readonly brand: unique symbol }
>()("DocsSearchUnavailable", {
  message: Schema.Literal("Documentation search is temporarily unavailable."),
}) {}

export class DocsPageNotFoundError extends Schema.TaggedError<
  DocsPageNotFoundError,
  { readonly brand: unique symbol }
>()("DocsPageNotFoundError", {
  path: DocsPagePath,
}) {}

export class DocsSlugNotFoundError extends Schema.TaggedError<
  DocsSlugNotFoundError,
  { readonly brand: unique symbol }
>()("DocsSlugNotFoundError", {
  slug: DocsPageSlug,
}) {}

export class DocsSourceError extends Schema.TaggedError<
  DocsSourceError,
  { readonly brand: unique symbol }
>()("DocsSourceError", {
  message: DocsNonEmptyText,
  operation: DocsSourceOperation,
  source: Schema.optional(DocsSourcePath),
}) {}

// The highlighter refused the code or returned tokens Content could not read.
// No source text or provider cause is kept.
export class DocsCodeHighlightError extends Schema.TaggedError<
  DocsCodeHighlightError,
  { readonly brand: unique symbol }
>()("DocsCodeHighlightError", {
  language: DocsCodeLanguage,
  reason: Schema.Literals(["highlight", "tokens"]),
}) {}

// The diagram renderer refused the Mermaid source or returned an unusable SVG.
export class DocsDiagramRenderError extends Schema.TaggedError<
  DocsDiagramRenderError,
  { readonly brand: unique symbol }
>()("DocsDiagramRenderError", { reason: Schema.Literals(["render", "svg"]) }) {}

// A share image could not be produced. No page text or provider cause is kept.
export class DocsImageRenderError extends Schema.TaggedError<
  DocsImageRenderError,
  { readonly brand: unique symbol }
>()("DocsImageRenderError", {
  reason: Schema.Literals(["font", "render", "output", "missing"]),
}) {}

// A published page's head metadata could not be built from its checked values.
export class DocsMetadataError extends Schema.TaggedError<
  DocsMetadataError,
  { readonly brand: unique symbol }
>()("DocsMetadataError", { reason: Schema.Literal("invalid-metadata") }) {}
