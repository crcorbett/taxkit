import { CalculatorServiceError } from "@taxkit/calculators/schemas";
import { Schema } from "effect";

import {
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
} from "./request-boundary.js";

// A generated-client call's own transport outcomes. Declared API failures keep
// their owning error types; these cover the rest, with safe fixed messages.
export class ApiUnavailable extends Schema.TaggedError<ApiUnavailable>()(
  "ApiUnavailable",
  {
    message: Schema.tag(
      "The TaxKit service could not be reached. Please try again."
    ),
  }
) {}

export class ApiDeadlineExceeded extends Schema.TaggedError<ApiDeadlineExceeded>()(
  "ApiDeadlineExceeded",
  {
    message: Schema.tag(
      "The request could not finish within ten seconds. Try again when you are ready."
    ),
  }
) {}

export class ApiReplyTooLarge extends Schema.TaggedError<ApiReplyTooLarge>()(
  "ApiReplyTooLarge",
  {
    message: Schema.tag(
      "The reply is too large. Reduce the request before trying again."
    ),
  }
) {}

// A reply that does not answer the request it was sent for.
export class ApiReplyMismatch extends Schema.TaggedError<ApiReplyMismatch>()(
  "ApiReplyMismatch",
  {
    message: Schema.tag(
      "The reply did not match the request. Please try again."
    ),
  }
) {}

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
