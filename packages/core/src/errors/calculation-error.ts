import { Schema } from "effect";

export class CalculationError extends Schema.TaggedErrorClass<CalculationError>()(
  "CalculationError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}
