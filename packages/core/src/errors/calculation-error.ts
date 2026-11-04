import { Schema } from "effect";

/**
 * A domain error raised when a tax calculation cannot be completed.
 *
 * @since 0.1.0
 */
export class CalculationError extends Schema.TaggedError<
  CalculationError,
  { readonly brand: unique symbol }
>()("CalculationError", {
  message: Schema.String,
}) {}
