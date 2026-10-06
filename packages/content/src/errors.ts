import { Schema } from "effect";

import {
  DocsNonEmptyText,
  DocsPagePath,
  DocsPageSlug,
  DocsSourcePath,
} from "./schemas.js";

export const DocsSourceOperation = Schema.Literals([
  "decode",
  "getNavigation",
  "getPage",
  "listPages",
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
