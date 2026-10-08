import { Schema } from "effect";

export class DocsPresentationUnavailable extends Schema.TaggedError<DocsPresentationUnavailable>()(
  "DocsPresentationUnavailable",
  {
    message: Schema.tag(
      "The documentation page could not be displayed. Please try again."
    ),
  }
) {}

export class DocsSearchInputError extends Schema.TaggedError<DocsSearchInputError>()(
  "DocsSearchInputError",
  {
    message: Schema.tag(
      "Enter up to 100 characters to search the documentation."
    ),
  }
) {}

export class DocsRouteTransportError extends Schema.TaggedError<DocsRouteTransportError>()(
  "DocsRouteTransportError",
  {
    message: Schema.tag(
      "The documentation page could not be read. Please reload it to try again."
    ),
  }
) {}
