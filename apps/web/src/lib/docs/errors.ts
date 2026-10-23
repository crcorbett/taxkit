import { Schema } from "effect";

export class DocsSearchInputError extends Schema.TaggedError<DocsSearchInputError>()(
  "DocsSearchInputError",
  {
    message: Schema.tag(
      "Enter up to 100 characters to search the documentation."
    ),
  }
) {}
