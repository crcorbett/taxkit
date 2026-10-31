import { Effect, Schema } from "effect";

/**
 * A domain error raised when a tax calculation cannot be completed.
 *
 * @since 0.1.0
 */
export class CalculationError extends Schema.TaggedError<
  CalculationError,
  { readonly brand: unique symbol }
>()("CalculationError", {
  // Legacy diagnostic data remains opaque; its codec preserves key identity.
  cause: Schema.OptionFromOptionalKey(
    Schema.OptionFromUndefinedOr(Schema.Unknown)
  ).pipe(Schema.withConstructorDefault(Effect.succeedNone)),
  message: Schema.String,
}) {}
