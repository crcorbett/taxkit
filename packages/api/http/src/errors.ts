import { CalculatorServiceError } from "@taxkit/calculators/errors";
import { Schema } from "effect";

// Request bodies the API refuses before calculator decoding.
export class CalculatorRequestBodyTooLarge extends Schema.TaggedError<
  CalculatorRequestBodyTooLarge,
  { readonly brand: unique symbol }
>()("CalculatorRequestBodyTooLarge", {
  code: Schema.tag("request-too-large"),
  message: Schema.tag(
    "This request is too large. Reduce it to 64 KiB or less and try again."
  ),
  retry: Schema.tag("reduce-request"),
}) {}

export class CalculatorRequestBodyTimedOut extends Schema.TaggedError<
  CalculatorRequestBodyTimedOut,
  { readonly brand: unique symbol }
>()("CalculatorRequestBodyTimedOut", {
  code: Schema.tag("request-timeout"),
  message: Schema.tag(
    "This request could not be read within five seconds. Try again when you are ready."
  ),
  retry: Schema.tag("try-again-manually"),
}) {}

// The body reader's private rejection reason, translated to one of the
// errors above at the request boundary.
export class CalculatorRequestBodyRejected extends Schema.TaggedError<
  CalculatorRequestBodyRejected,
  { readonly brand: unique symbol }
>()("CalculatorRequestBodyRejected", {
  reason: Schema.Literals(["size", "deadline"]),
}) {}

// A generated-client call's own transport outcomes. Declared API failures keep
// their owning error types; these cover the rest, with safe fixed messages.
export class ApiUnavailable extends Schema.TaggedError<
  ApiUnavailable,
  { readonly brand: unique symbol }
>()("ApiUnavailable", {
  message: Schema.tag(
    "The TaxKit service could not be reached. Please try again."
  ),
}) {}

export class ApiDeadlineExceeded extends Schema.TaggedError<
  ApiDeadlineExceeded,
  { readonly brand: unique symbol }
>()("ApiDeadlineExceeded", {
  message: Schema.tag(
    "The request could not finish within ten seconds. Try again when you are ready."
  ),
}) {}

export class ApiReplyTooLarge extends Schema.TaggedError<
  ApiReplyTooLarge,
  { readonly brand: unique symbol }
>()("ApiReplyTooLarge", {
  message: Schema.tag(
    "The reply is too large. Reduce the request before trying again."
  ),
}) {}

// A reply that does not answer the request it was sent for.
export class ApiReplyMismatch extends Schema.TaggedError<
  ApiReplyMismatch,
  { readonly brand: unique symbol }
>()("ApiReplyMismatch", {
  message: Schema.tag("The reply did not match the request. Please try again."),
}) {}

export const ApiCallFailure = Schema.Union([
  ApiUnavailable,
  ApiDeadlineExceeded,
  ApiReplyTooLarge,
  ApiReplyMismatch,
]);
export type ApiCallFailure = typeof ApiCallFailure.Type;

// Everything one calculation call can fail with: the API's declared calculator
// and request-body errors, or a transport outcome above.
export const CalculationCallFailure = Schema.Union([
  CalculatorServiceError,
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
  ApiCallFailure,
]);
export type CalculationCallFailure = typeof CalculationCallFailure.Type;
