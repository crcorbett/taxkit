import { Schema } from "effect";

export class DocumentationError extends Schema.TaggedError<
  DocumentationError,
  { readonly brand: unique symbol }
>()("DocumentationError", { findings: Schema.Array(Schema.String) }) {}

export class DocumentationInventoryError extends Schema.TaggedError<
  DocumentationInventoryError,
  { readonly brand: unique symbol }
>()("DocumentationInventoryError", {
  exitCode: Schema.optional(Schema.Int),
  operation: Schema.Literals(["list-documents", "decode-documents"]),
}) {}
