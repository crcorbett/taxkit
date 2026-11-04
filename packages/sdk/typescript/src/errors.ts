import { CalculationError, InputValidationError } from "@taxkit/core";
import { Schema } from "effect";

export { InputValidationError } from "@taxkit/core";
export class TaxKitUnexpectedError extends Schema.TaggedError<
  TaxKitUnexpectedError,
  { readonly brand: unique symbol }
>()("TaxKitUnexpectedError", {
  message: Schema.tag("TaxKit calculation failed unexpectedly"),
}) {}
export class TaxKitClientDisposedError extends Schema.TaggedError<
  TaxKitClientDisposedError,
  { readonly brand: unique symbol }
>()("TaxKitClientDisposedError", {
  message: Schema.tag("TaxKit client is closed"),
}) {}
export class TaxKitClientDisposeError extends Schema.TaggedError<
  TaxKitClientDisposeError,
  { readonly brand: unique symbol }
>()("TaxKitClientDisposeError", {
  message: Schema.tag("TaxKit client could not be closed"),
}) {}
export const TaxKitError = Schema.Union([
  CalculationError,
  InputValidationError,
  TaxKitUnexpectedError,
  TaxKitClientDisposedError,
]);
export type TaxKitError = typeof TaxKitError.Type;
