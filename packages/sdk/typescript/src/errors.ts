import { CalculatorServiceError } from "@whattax/calculators/schemas";
import type { CalculatorServiceError as CalculatorServiceErrorType } from "@whattax/calculators/schemas";
import { Array, Cause, Data, Option, Schema } from "effect";

export class WhatTaxSchemaDecodeError extends Schema.TaggedErrorClass<WhatTaxSchemaDecodeError>()(
  "WhatTaxSchemaDecodeError",
  {
    message: Schema.String,
  }
) {}

export class WhatTaxUnexpectedError extends Schema.TaggedErrorClass<WhatTaxUnexpectedError>()(
  "WhatTaxUnexpectedError",
  {
    message: Schema.String,
  }
) {}

export const WhatTaxCalculationErrorDetail = Schema.Union([
  CalculatorServiceError,
  WhatTaxSchemaDecodeError,
  WhatTaxUnexpectedError,
]);

export type WhatTaxCalculationErrorDetail =
  typeof WhatTaxCalculationErrorDetail.Type;

export class WhatTaxCalculationError extends Schema.TaggedErrorClass<WhatTaxCalculationError>()(
  "WhatTaxCalculationError",
  {
    error: WhatTaxCalculationErrorDetail,
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
  cause: Cause.Cause<CalculatorServiceErrorType | Schema.SchemaError>
): WhatTaxCalculationError => {
  const message = Cause.pretty(cause);

  return new WhatTaxCalculationError({
    error: Array.findFirst(cause.reasons, Cause.isFailReason).pipe(
      Option.match({
        onNone: () => new WhatTaxUnexpectedError({ message }),
        onSome: (failure) =>
          Schema.isSchemaError(failure.error)
            ? new WhatTaxSchemaDecodeError({ message })
            : failure.error,
      })
    ),
    message,
  });
};
