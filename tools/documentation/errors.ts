import { Schema } from "effect";

export class DocumentationError extends Schema.TaggedError<
  DocumentationError,
  { readonly brand: unique symbol }
>()("DocumentationError", { findings: Schema.Array(Schema.String) }) {}
