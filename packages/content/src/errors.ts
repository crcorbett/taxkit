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
export class DocsPageUnavailable extends Schema.TaggedError<DocsPageUnavailable>()(
  "DocsPageUnavailable",
  { message: Schema.Literal("The documentation page was not found.") }
) {}

export class DocsSearchUnavailable extends Schema.TaggedError<DocsSearchUnavailable>()(
  "DocsSearchUnavailable",
  {
    message: Schema.Literal("Documentation search is temporarily unavailable."),
  }
) {}

export class DocsPageNotFoundError extends Schema.TaggedError<DocsPageNotFoundError>()(
  "DocsPageNotFoundError",
  {
    path: DocsPagePath,
  }
) {}

export class DocsSlugNotFoundError extends Schema.TaggedError<DocsSlugNotFoundError>()(
  "DocsSlugNotFoundError",
  {
    slug: DocsPageSlug,
  }
) {}

export class DocsSourceError extends Schema.TaggedError<DocsSourceError>()(
  "DocsSourceError",
  {
    message: DocsNonEmptyText,
    operation: DocsSourceOperation,
    source: Schema.optional(DocsSourcePath),
  }
) {}

// The highlighter refused the code or returned tokens Content could not read.
// No source text or provider cause is kept.
export class DocsCodeHighlightError extends Schema.TaggedError<DocsCodeHighlightError>()(
  "DocsCodeHighlightError",
  {
    language: DocsCodeLanguage,
    reason: Schema.Literals(["highlight", "tokens"]),
  }
) {}

// The diagram renderer refused the Mermaid source or returned an unusable SVG.
export class DocsDiagramRenderError extends Schema.TaggedError<DocsDiagramRenderError>()(
  "DocsDiagramRenderError",
  { reason: Schema.Literals(["render", "svg"]) }
) {}

// A share image could not be produced. No page text or provider cause is kept.
export class DocsImageRenderError extends Schema.TaggedError<DocsImageRenderError>()(
  "DocsImageRenderError",
  { reason: Schema.Literals(["font", "render", "output", "missing"]) }
) {}

// A published page's head metadata could not be built from its checked values.
export class DocsMetadataError extends Schema.TaggedError<DocsMetadataError>()(
  "DocsMetadataError",
  { reason: Schema.Literal("invalid-metadata") }
) {}
