import { CalculatorServiceError } from "@taxkit/calculators/schemas";
import type { CalculatorServiceError as CalculatorServiceErrorType } from "@taxkit/calculators/schemas";
import {
  Match,
  Function as EffectFunction,
  Array,
  Cause,
  Data,
  Option,
  Schema,
} from "effect";

const calculationFailureMessage = "TaxKit calculation failed";
const schemaDecodeFailureMessage =
  "TaxKit calculation response failed schema validation";
const unexpectedFailureMessage = "TaxKit calculation failed unexpectedly";
export class TaxKitSchemaDecodeError extends Schema.TaggedError<
  TaxKitSchemaDecodeError,
  {
    readonly brand: unique symbol;
  }
>()("TaxKitSchemaDecodeError", {
  message: Schema.String,
}) {}
export class TaxKitUnexpectedError extends Schema.TaggedError<
  TaxKitUnexpectedError,
  {
    readonly brand: unique symbol;
  }
>()("TaxKitUnexpectedError", {
  message: Schema.String,
}) {}
export class TaxKitClientDisposedError extends Schema.TaggedError<
  TaxKitClientDisposedError,
  {
    readonly brand: unique symbol;
  }
>()("TaxKitClientDisposedError", {
  message: Schema.Literal("TaxKit client is closed"),
}) {}
export class TaxKitClientDisposeError extends Schema.TaggedError<
  TaxKitClientDisposeError,
  {
    readonly brand: unique symbol;
  }
>()("TaxKitClientDisposeError", {
  message: Schema.Literal("TaxKit client could not be closed"),
}) {}
export const TaxKitCalculationErrorDetail = Schema.Union([
  CalculatorServiceError,
  TaxKitClientDisposedError,
  TaxKitSchemaDecodeError,
  TaxKitUnexpectedError,
]);
export type TaxKitCalculationErrorDetail =
  typeof TaxKitCalculationErrorDetail.Type;
export class TaxKitCalculationError extends Schema.TaggedError<
  TaxKitCalculationError,
  {
    readonly brand: unique symbol;
  }
>()("TaxKitCalculationError", {
  error: TaxKitCalculationErrorDetail,
  message: Schema.String,
}) {}
export type TaxKitError = TaxKitCalculationError;
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- Data.Class preserves this payload type in its inherited constructor and fields.
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
    error: EffectFunction.pipe(
      cause.reasons,
      Array.findFirst(Cause.isFailReason)
    ).pipe(
      Option.match({
        onNone: () =>
          new TaxKitUnexpectedError({ message: unexpectedFailureMessage }),
        onSome: (failure) =>
          Match.value(failure.error).pipe(
            Match.when(
              Schema.isSchemaError,
              () =>
                new TaxKitSchemaDecodeError({
                  message: schemaDecodeFailureMessage,
                })
            ),
            Match.orElse((matchedValue) => matchedValue)
          ),
      })
    ),
    message: calculationFailureMessage,
  });
