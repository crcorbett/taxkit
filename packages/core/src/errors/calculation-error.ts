import { Schema } from "effect";

/**
 * A domain error raised when a tax calculation cannot be completed.
 *
 * @since 0.1.0
 */
export class CalculationError extends Schema.TaggedErrorClass<CalculationError>()(
  "CalculationError",
  {
    cause: Schema.optional(Schema.Unknown),
    message: Schema.String,
  }
) {}
