import type { PublicCalculatorError } from "@whattax/calculators/schemas";
import { Cause, Data, Schema } from "effect";

export class WhatTaxCalculationError extends Schema.TaggedErrorClass<WhatTaxCalculationError>()(
  "WhatTaxCalculationError",
  {
    cause: Schema.Unknown,
    message: Schema.String,
  }
) {}

export type WhatTaxError = WhatTaxCalculationError;

export class WhatTaxSuccess<Value> extends Data.TaggedClass("WhatTaxSuccess")<{
  readonly value: Value;
}> {}

export class WhatTaxFailure extends Data.TaggedClass("WhatTaxFailure")<{
  readonly error: WhatTaxError;
}> {}

export type WhatTaxSafeResult<Value> = WhatTaxFailure | WhatTaxSuccess<Value>;

export const toWhatTaxCalculationError = (
  cause: Cause.Cause<PublicCalculatorError | Schema.SchemaError>
): WhatTaxCalculationError =>
  new WhatTaxCalculationError({
    cause,
    message: Cause.pretty(cause),
  });
