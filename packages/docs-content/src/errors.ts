import { Schema } from "effect";

import { DocsPagePath, DocsPageSlug, DocsSourcePath } from "./schemas.js";

export class DocsPageNotFoundError extends Schema.TaggedErrorClass<DocsPageNotFoundError>()(
  "DocsPageNotFoundError",
  {
    path: DocsPagePath,
  }
) {}

export class DocsSlugNotFoundError extends Schema.TaggedErrorClass<DocsSlugNotFoundError>()(
  "DocsSlugNotFoundError",
  {
    slug: DocsPageSlug,
  }
) {}

export class DocsSourceError extends Schema.TaggedErrorClass<DocsSourceError>()(
  "DocsSourceError",
  {
    cause: Schema.Defect(),
    source: Schema.optional(DocsSourcePath),
  }
) {}

export class DocsValidationFailedError extends Schema.TaggedErrorClass<DocsValidationFailedError>()(
  "DocsValidationFailedError",
  {
    issues: Schema.Array(Schema.String),
  }
) {}
