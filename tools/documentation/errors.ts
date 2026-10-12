import { Schema } from "effect";

export class DocumentationError extends Schema.TaggedError<DocumentationError>()(
  "DocumentationError",
  { findings: Schema.Array(Schema.String) }
) {}
