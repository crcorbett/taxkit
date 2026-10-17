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

// API binding/configuration fails independently of public Website settings.
export class WebsiteApiConfigError extends Schema.TaggedError<WebsiteApiConfigError>()(
  "WebsiteApiConfigError",
  { message: Schema.tag("TaxKit API settings are missing or invalid.") }
) {}

export class WebsiteDocsPageMismatch extends Schema.TaggedError<WebsiteDocsPageMismatch>()(
  "WebsiteDocsPageMismatch",
  {
    message: Schema.tag(
      "The documentation reply did not match the requested page."
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
  WebsiteApiConfigError,
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
