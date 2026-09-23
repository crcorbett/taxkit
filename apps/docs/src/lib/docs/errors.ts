import { DocsSourcePath } from "@taxkit/docs-content/schemas";
import { Schema } from "effect";

export class DocsContentPreloadError extends Schema.TaggedError<DocsContentPreloadError>()(
  "DocsContentPreloadError",
  {
    message: Schema.String,
    path: DocsSourcePath,
  }
) {}

export class DocsRouteTransportError extends Schema.TaggedError<DocsRouteTransportError>()(
  "DocsRouteTransportError",
  {
    message: Schema.String,
  }
) {}
