import { Result, Schema } from "effect";

import {
  WebsiteDocsSearchTransport,
  WebsiteDocsPageTransport,
} from "../schemas";
import { DocsRouteTransportError } from "./errors";

// Each direct route is the first consumer of its native representation.
// Children receive only checked values after the route matches the Result.
export const docsPageRouteBoundary = {
  restore: (encoded: typeof Schema.Unknown.Type) =>
    Schema.decodeUnknownResult(WebsiteDocsPageTransport)(encoded).pipe(
      Result.mapError(() => new DocsRouteTransportError()),
      Result.flatMap((result) => result)
    ),
};
export const docsSearchRouteBoundary = {
  restore: (encoded: typeof Schema.Unknown.Type) =>
    Schema.decodeUnknownResult(WebsiteDocsSearchTransport)(encoded).pipe(
      Result.mapError(() => new DocsRouteTransportError()),
      Result.flatMap((result) => result)
    ),
};
