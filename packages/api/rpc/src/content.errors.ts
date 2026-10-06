import {
  DocsDiscoveryUnavailable,
  DocsPageUnavailable,
  DocsSearchUnavailable,
} from "@taxkit/content/errors";
import { Schema } from "effect";

export {
  DocsDiscoveryUnavailable,
  DocsPageUnavailable,
  DocsSearchUnavailable,
} from "@taxkit/content/errors";

export class DocsRpcVersionMismatch extends Schema.TaggedError<DocsRpcVersionMismatch>()(
  "DocsRpcVersionMismatch",
  {}
) {}

export class DocsRpcUnavailable extends Schema.TaggedError<DocsRpcUnavailable>()(
  "DocsRpcUnavailable",
  { message: Schema.tag("Documentation is temporarily unavailable.") }
) {}

export class DocsRpcInvalidResponse extends Schema.TaggedError<DocsRpcInvalidResponse>()(
  "DocsRpcInvalidResponse",
  { message: Schema.tag("The documentation reply could not be read.") }
) {}

export class DocsRpcDeadlineExceeded extends Schema.TaggedError<DocsRpcDeadlineExceeded>()(
  "DocsRpcDeadlineExceeded",
  {
    message: Schema.tag(
      "The documentation reply did not finish within ten seconds."
    ),
  }
) {}

export class DocsRpcResponseTooLarge extends Schema.TaggedError<DocsRpcResponseTooLarge>()(
  "DocsRpcResponseTooLarge",
  { message: Schema.tag("The documentation reply is too large.") }
) {}

export const DocsRpcExpectedError = Schema.Union([
  DocsDiscoveryUnavailable,
  DocsPageUnavailable,
  DocsSearchUnavailable,
  DocsRpcVersionMismatch,
]);

export const DocsRpcClientError = Schema.Union([
  DocsRpcExpectedError,
  DocsRpcUnavailable,
  DocsRpcInvalidResponse,
  DocsRpcDeadlineExceeded,
  DocsRpcResponseTooLarge,
]);
export type DocsRpcClientError = typeof DocsRpcClientError.Type;
