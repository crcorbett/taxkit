import type {
  CalculatorId,
  CalculatorJurisdiction,
  CalculatorTaxYear,
  PublicCalculationFacts,
  PublicCalculationReport,
} from "@whattax/calculators/schemas";
import { Effect, Exit, Schema } from "effect";

export interface SdkCalculation<
  Id extends CalculatorId,
  Jurisdiction extends CalculatorJurisdiction,
  TaxYear extends CalculatorTaxYear,
  InputSchema extends Schema.Schema<PublicCalculationFacts>,
  OutputSchema extends Schema.Decoder<PublicCalculationReport, never>,
> {
  readonly calculatorId: Id;
  readonly decodeOutput: (
    output: unknown
  ) => Effect.Effect<OutputSchema["Type"], Schema.SchemaError>;
  readonly inputSchema: InputSchema;
  readonly jurisdiction: Jurisdiction;
  readonly outputSchema: OutputSchema;
  readonly taxYear: TaxYear;
}

export interface SdkCalculationDefinition<
  Id extends CalculatorId,
  Jurisdiction extends CalculatorJurisdiction,
  TaxYear extends CalculatorTaxYear,
  InputSchema extends Schema.Schema<PublicCalculationFacts>,
  OutputSchema extends Schema.Decoder<PublicCalculationReport, never>,
> {
  readonly calculatorId: Id;
  readonly inputSchema: InputSchema;
  readonly jurisdiction: Jurisdiction;
  readonly outputSchema: OutputSchema;
  readonly taxYear: TaxYear;
}

export type AnySdkCalculation = SdkCalculation<
  CalculatorId,
  CalculatorJurisdiction,
  CalculatorTaxYear,
  Schema.Schema<PublicCalculationFacts>,
  Schema.Decoder<PublicCalculationReport, never>
>;

export interface WhatTaxModule<
  Id extends string,
  Jurisdiction extends CalculatorJurisdiction,
  TaxYear extends CalculatorTaxYear,
  Calculations extends readonly AnySdkCalculation[],
> {
  readonly calculations: Calculations;
  readonly id: Id;
  readonly jurisdiction: Jurisdiction;
  readonly taxYear: TaxYear;
}

export type AnyWhatTaxModule = WhatTaxModule<
  string,
  CalculatorJurisdiction,
  CalculatorTaxYear,
  readonly AnySdkCalculation[]
>;

export type CalculationInput<Calculation> = Calculation extends {
  readonly inputSchema: infer InputSchema extends Schema.Top;
}
  ? InputSchema["Type"]
  : never;

export type CalculationOutput<Calculation> = Calculation extends {
  readonly outputSchema: infer OutputSchema extends Schema.Top;
}
  ? OutputSchema["Type"]
  : never;

export type ModuleCalculation<Modules extends readonly AnyWhatTaxModule[]> =
  Modules[number]["calculations"][number];

export const defineSdkCalculation = <
  const Id extends CalculatorId,
  const Jurisdiction extends CalculatorJurisdiction,
  const TaxYear extends CalculatorTaxYear,
  const InputSchema extends Schema.Schema<PublicCalculationFacts>,
  const OutputSchema extends Schema.Decoder<PublicCalculationReport, never>,
>(
  calculation: SdkCalculationDefinition<
    Id,
    Jurisdiction,
    TaxYear,
    InputSchema,
    OutputSchema
  >
): SdkCalculation<Id, Jurisdiction, TaxYear, InputSchema, OutputSchema> => ({
  ...calculation,
  decodeOutput: (output) =>
    Schema.decodeUnknownExit(calculation.outputSchema)(output).pipe(
      Exit.match({
        onFailure: (cause) => Effect.failCause(cause),
        onSuccess: Effect.succeed,
      })
    ),
});

export const defineWhatTaxModule = <
  const Id extends string,
  const Jurisdiction extends CalculatorJurisdiction,
  const TaxYear extends CalculatorTaxYear,
  const Calculations extends readonly AnySdkCalculation[],
>(
  module: WhatTaxModule<Id, Jurisdiction, TaxYear, Calculations>
): WhatTaxModule<Id, Jurisdiction, TaxYear, Calculations> => module;
