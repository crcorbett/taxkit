import { CalculationError, InputValidationError } from "@taxkit/core/errors";
import { Schema } from "effect";

import { CalculatorContextQuery, CalculatorId } from "./schemas.js";

// The closed expected-failure vocabulary of the calculator package. Every
// error has fixed or bounded safe fields; none carries a provider cause.

/**
 * Public error for a supported request shape that names no catalog entry.
 */
export class UnsupportedCalculatorError extends Schema.TaggedClass<
  UnsupportedCalculatorError,
  {
    readonly brand: unique symbol;
  }
>()("UnsupportedCalculatorError", {
  message: Schema.String,
  requestedCalculator: Schema.String,
}) {}
/**
 * Public error for calculator/context combinations that are not in the catalog.
 */
export class UnsupportedCalculatorContextError extends Schema.TaggedClass<
  UnsupportedCalculatorContextError,
  {
    readonly brand: unique symbol;
  }
>()("UnsupportedCalculatorContextError", {
  context: CalculatorContextQuery,
  message: Schema.String,
  requestedCalculator: CalculatorId,
}) {}
export class CalculatorCapacityExceeded extends Schema.TaggedError<
  CalculatorCapacityExceeded,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorCapacityExceeded", {
  code: Schema.tag("calculation-capacity"),
  message: Schema.tag(
    "The calculators are busy. Try again when you are ready."
  ),
  retry: Schema.tag("try-again-manually"),
}) {}
export class CalculatorOperationTimedOut extends Schema.TaggedError<
  CalculatorOperationTimedOut,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorOperationTimedOut", {
  code: Schema.tag("calculation-timeout"),
  message: Schema.tag(
    "The calculation could not finish within five seconds. Try again when you are ready."
  ),
  retry: Schema.tag("try-again-manually"),
}) {}
export class CalculatorRateLimited extends Schema.TaggedError<
  CalculatorRateLimited,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorRateLimited", {
  code: Schema.tag("rate-limited"),
  message: Schema.tag(
    "Too many calculations were sent. Wait a minute before trying again."
  ),
  retry: Schema.tag("wait-then-try-manually"),
}) {}
export class CalculatorAdmissionUnavailable extends Schema.TaggedError<
  CalculatorAdmissionUnavailable,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorAdmissionUnavailable", {
  code: Schema.tag("calculation-admission-unavailable"),
  message: Schema.tag(
    "The calculation could not be started. Try again when you are ready."
  ),
  retry: Schema.tag("try-again-manually"),
}) {}
export const CalculatorRequestError = Schema.Union([
  InputValidationError,
  CalculationError,
  UnsupportedCalculatorError,
  UnsupportedCalculatorContextError,
]);
export type CalculatorRequestError = typeof CalculatorRequestError.Type;
/** Metadata lookups fail only for a calculator/context outside the catalogue. */
export const CalculatorMetadataError = Schema.Union([
  UnsupportedCalculatorContextError,
]);
export type CalculatorMetadataError = typeof CalculatorMetadataError.Type;
export const CalculatorServiceError = Schema.Union([
  CalculatorRequestError,
  CalculatorRateLimited,
  CalculatorAdmissionUnavailable,
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
]);
export type CalculatorServiceError = typeof CalculatorServiceError.Type;

// The visible field a visitor must correct. Views mark only this field
// invalid and move focus to it.
export const CalculatorFormField = Schema.Literals([
  "grossDollars",
  "period",
  "taxableDollars",
]);
export type CalculatorFormField = typeof CalculatorFormField.Type;
export class CalculatorInputError extends Schema.TaggedError<
  CalculatorInputError,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorInputError", {
  field: CalculatorFormField,
  message: Schema.Literals([
    "Enter a valid pay amount.",
    "Choose a pay period.",
    "Enter a valid annual taxable income.",
  ]),
}) {}
