import {
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
} from "@taxkit/api-http/request-boundary";
import { CalculatorServiceError } from "@taxkit/calculators/schemas";
import { Schema } from "effect";

// The Website's own transport outcomes for the native API clients. Declared
// API failures keep their owning error types; these cover the rest.
export class WebsiteApiUnavailable extends Schema.TaggedError<WebsiteApiUnavailable>()(
  "WebsiteApiUnavailable",
  {
    message: Schema.tag(
      "The TaxKit service could not be reached. Please try again."
    ),
  }
) {}

export class WebsiteApiDeadlineExceeded extends Schema.TaggedError<WebsiteApiDeadlineExceeded>()(
  "WebsiteApiDeadlineExceeded",
  {
    message: Schema.tag(
      "The request could not finish within ten seconds. Try again when you are ready."
    ),
  }
) {}

export class WebsiteApiResponseTooLarge extends Schema.TaggedError<WebsiteApiResponseTooLarge>()(
  "WebsiteApiResponseTooLarge",
  {
    message: Schema.tag(
      "The reply is too large. Reduce the request before trying again."
    ),
  }
) {}

// A reply that does not match the request it answers.
export class WebsiteApiMismatch extends Schema.TaggedError<WebsiteApiMismatch>()(
  "WebsiteApiMismatch",
  {
    message: Schema.tag("The calculation could not finish. Please try again."),
  }
) {}

export const WebsiteApiFailure = Schema.Union([
  WebsiteApiUnavailable,
  WebsiteApiDeadlineExceeded,
  WebsiteApiResponseTooLarge,
  WebsiteApiMismatch,
]);
export type WebsiteApiFailure = typeof WebsiteApiFailure.Type;

// Everything a Website calculation can fail with: the API's declared
// calculator and request-body errors, or the Website's own outcomes above.
export const WebsiteCalculationFailure = Schema.Union([
  CalculatorServiceError,
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
  WebsiteApiFailure,
]);
export type WebsiteCalculationFailure = typeof WebsiteCalculationFailure.Type;

// A page load that could not reach or use the API. TanStack renders the
// route's error component; the server reply carries this status.
export class WebsiteLoadError extends Schema.TaggedError<WebsiteLoadError>()(
  "WebsiteLoadError",
  { status: Schema.Literal(503) }
) {}
