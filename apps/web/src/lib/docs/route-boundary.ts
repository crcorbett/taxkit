import { Result, Schema } from "effect";

import { WebsiteDocsPageTransport } from "../schemas";
import { DocsRouteTransportError } from "./errors";

// The direct route and its head callback are the first consumers of the plain
// native server-function representation. Children receive only checked values.
export const docsPageRouteBoundary = {
  restore: (encoded: typeof Schema.Unknown.Type) =>
    Schema.decodeUnknownResult(WebsiteDocsPageTransport)(encoded).pipe(
      Result.mapError(() => new DocsRouteTransportError()),
      Result.flatMap((result) => result)
    ),
};
