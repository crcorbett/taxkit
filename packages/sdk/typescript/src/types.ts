import type {
  CalculatorId,
  CalculatorJurisdiction,
  CalculatorTaxYear,
  CalculatorRunFacts,
  CalculatorRunReport,
} from "@taxkit/calculators/schemas";
import { Schema } from "effect";
import type { Effect } from "effect";

export interface SdkCalculation<
  Id extends CalculatorId,
  Jurisdiction extends CalculatorJurisdiction,
  TaxYear extends CalculatorTaxYear,
  InputSchema extends Schema.Schema<CalculatorRunFacts>,
  OutputSchema extends Schema.Decoder<CalculatorRunReport, never>,
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
  InputSchema extends Schema.Schema<CalculatorRunFacts>,
  OutputSchema extends Schema.Decoder<CalculatorRunReport, never>,
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
  Schema.Schema<CalculatorRunFacts>,
  Schema.Decoder<CalculatorRunReport, never>
>;

export interface TaxKitModule<
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

export type AnyTaxKitModule = TaxKitModule<
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

export type ModuleCalculation<Modules extends readonly AnyTaxKitModule[]> =
  Modules[number]["calculations"][number];

export const defineSdkCalculation = <
  const Id extends CalculatorId,
  const Jurisdiction extends CalculatorJurisdiction,
  const TaxYear extends CalculatorTaxYear,
  const InputSchema extends Schema.Schema<CalculatorRunFacts>,
  const OutputSchema extends Schema.Decoder<CalculatorRunReport, never>,
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
  decodeOutput: Schema.decodeUnknownEffect(calculation.outputSchema),
});

export const defineTaxKitModule = <
  const Id extends string,
  const Jurisdiction extends CalculatorJurisdiction,
  const TaxYear extends CalculatorTaxYear,
  const Calculations extends readonly AnySdkCalculation[],
>(
  module: TaxKitModule<Id, Jurisdiction, TaxYear, Calculations>
): TaxKitModule<Id, Jurisdiction, TaxYear, Calculations> => module;
