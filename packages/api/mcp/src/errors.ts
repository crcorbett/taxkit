import { Schema } from "effect";

// This transport vocabulary deliberately carries no provider cause, submitted
// values or calculation report. The owning calculator errors stay unchanged.
// Codes say who can act: `invalid-calculation` and `not-found` ask the caller
// to change the request; `rate-limited`, `capacity-exceeded`,
// `operation-timeout` and `service-unavailable` are transient; `server-fault`
// is a reply TaxKit itself got wrong. Engine defects stay native internal
// errors and never become one of these codes.
export class McpToolUnavailable extends Schema.TaggedClass<
  McpToolUnavailable,
  {
    readonly brand: unique symbol;
  }
>()("McpToolUnavailable", {
  code: Schema.Literals([
    "invalid-calculation",
    "not-found",
    "rate-limited",
    "capacity-exceeded",
    "operation-timeout",
    "service-unavailable",
    "server-fault",
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
