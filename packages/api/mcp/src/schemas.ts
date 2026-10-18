import {
  DocsPublicPagePath,
  DocsSearchResult,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import { ByteSize, Duration, Schema } from "effect";

export const McpResponseLimit = ByteSize.mebibytes(2);
export const McpResponseDeadline = Duration.seconds(10);
export const McpDocsSearchRequest = Schema.Struct({ term: DocsSearchTerm });
export const McpDocsReadRequest = Schema.Struct({ path: DocsPublicPagePath });
export const McpDocsSearchResponse = Schema.Struct({
  results: Schema.Array(DocsSearchResult),
});

// This transport vocabulary deliberately carries no provider cause, submitted
// values or calculation report. The owning calculator errors stay unchanged.
export class McpToolUnavailable extends Schema.TaggedClass<McpToolUnavailable>()(
  "McpToolUnavailable",
  {
    code: Schema.Literals([
      "invalid-calculation",
      "rate-limited",
      "capacity-exceeded",
      "operation-timeout",
      "service-unavailable",
    ]),
    message: Schema.tag("The tool could not complete this request."),
    retry: Schema.Literals([
      "check-input-before-retrying",
      "wait-then-try-manually",
      "try-again-manually",
    ]),
  }
) {}

export class McpResponseTooLarge extends Schema.TaggedError<McpResponseTooLarge>()(
  "McpResponseTooLarge",
  {}
) {}
