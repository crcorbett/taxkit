import { Schema } from "effect";

export class DocsPresentationUnavailable extends Schema.TaggedError<DocsPresentationUnavailable>()(
  "DocsPresentationUnavailable",
  {
    message: Schema.tag(
      "The documentation page could not be displayed. Please try again."
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
