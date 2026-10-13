import { Schema } from "effect";

export {
  DocsPageNotFoundError,
  DocsSlugNotFoundError,
  DocsSourceError,
  DocsSourceOperation,
} from "@taxkit/content/errors";

export class DocsValidationFailedError extends Schema.TaggedError<DocsValidationFailedError>()(
  "DocsValidationFailedError",
  {
    issues: Schema.Array(Schema.String),
  }
) {}

export class DocsCatalogueBuildError extends Schema.TaggedError<DocsCatalogueBuildError>()(
  "DocsCatalogueBuildError",
  {
    operation: Schema.Literals([
      "no-published-pages",
      "project",
      "encode",
      "write",
    ]),
  }
) {}
