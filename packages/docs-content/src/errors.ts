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
  "validateContent",
]);
export type DocsSourceOperation = typeof DocsSourceOperation.Type;

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

export class DocsValidationFailedError extends Schema.TaggedError<DocsValidationFailedError>()(
  "DocsValidationFailedError",
  {
    issues: Schema.Array(Schema.String),
  }
) {}
