import { Schema } from "effect";

// This transport vocabulary deliberately carries no provider cause, submitted
// values or calculation report. The owning calculator errors stay unchanged.
export class McpToolUnavailable extends Schema.TaggedClass<
  McpToolUnavailable,
  {
    readonly brand: unique symbol;
  }
>()("McpToolUnavailable", {
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
}) {}
export class McpResponseTooLarge extends Schema.TaggedError<
  McpResponseTooLarge,
  {
    readonly brand: unique symbol;
  }
>()("McpResponseTooLarge", {}) {}
