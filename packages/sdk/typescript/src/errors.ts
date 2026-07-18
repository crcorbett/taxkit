import { CalculatorServiceError } from "@taxkit/calculators/schemas";
import type { CalculatorServiceError as CalculatorServiceErrorType } from "@taxkit/calculators/schemas";
import { Array, Cause, Data, Option, Schema } from "effect";

const calculationFailureMessage = "TaxKit calculation failed";
const schemaDecodeFailureMessage =
  "TaxKit calculation response failed schema validation";
const unexpectedFailureMessage = "TaxKit calculation failed unexpectedly";

export class TaxKitSchemaDecodeError extends Schema.TaggedErrorClass<TaxKitSchemaDecodeError>()(
  "TaxKitSchemaDecodeError",
  {
    message: Schema.String,
  }
) {}

export class TaxKitUnexpectedError extends Schema.TaggedErrorClass<TaxKitUnexpectedError>()(
  "TaxKitUnexpectedError",
  {
    message: Schema.String,
  }
) {}

export const TaxKitCalculationErrorDetail = Schema.Union([
  CalculatorServiceError,
  TaxKitSchemaDecodeError,
  TaxKitUnexpectedError,
]);

export type TaxKitCalculationErrorDetail =
  typeof TaxKitCalculationErrorDetail.Type;

export class TaxKitCalculationError extends Schema.TaggedErrorClass<TaxKitCalculationError>()(
  "TaxKitCalculationError",
  {
    error: TaxKitCalculationErrorDetail,
    message: Schema.String,
  }
) {}

export type TaxKitError = TaxKitCalculationError;

export class TaxKitSuccess<Value> extends Data.TaggedClass("TaxKitSuccess")<{
  readonly value: Value;
}> {}

export class TaxKitFailure extends Data.TaggedClass("TaxKitFailure")<{
  readonly error: TaxKitError;
}> {}

export type TaxKitSafeResult<Value> = TaxKitFailure | TaxKitSuccess<Value>;

export const toTaxKitCalculationError = (
  cause: Cause.Cause<CalculatorServiceErrorType | Schema.SchemaError>
): TaxKitCalculationError =>
  new TaxKitCalculationError({
    error: Array.findFirst(cause.reasons, Cause.isFailReason).pipe(
      Option.match({
        onNone: () =>
          new TaxKitUnexpectedError({ message: unexpectedFailureMessage }),
        onSome: (failure) =>
          Schema.isSchemaError(failure.error)
            ? new TaxKitSchemaDecodeError({
                message: schemaDecodeFailureMessage,
              })
            : failure.error,
      })
    ),
    message: calculationFailureMessage,
  });
