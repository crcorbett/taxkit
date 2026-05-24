import type {
  CalculatorId,
  CalculatorJurisdiction,
  CalculatorTaxYear,
  PublicCalculationFacts,
  PublicCalculatorError,
  PublicCalculationReport,
} from "@whattax/calculators/schemas";
import { PublicCalculatorService } from "@whattax/calculators/service";
import type { PublicCalculatorServiceShape } from "@whattax/calculators/service";
import { Effect } from "effect";
import type { Context, Schema } from "effect";

import type {
  AnyWhatTaxModule,
  CalculationInput,
  ModuleCalculation,
  SdkCalculation,
} from "./types.js";

export type {
  AnySdkCalculation,
  AnyWhatTaxModule,
  CalculationInput,
  CalculationOutput,
  ModuleCalculation,
  SdkCalculation,
  SdkCalculationDefinition,
  WhatTaxModule,
} from "./types.js";
export { defineSdkCalculation, defineWhatTaxModule } from "./types.js";

export type WhatTaxEffectRequirements = Context.Service.Identifier<
  typeof PublicCalculatorService
>;

const publicCalculatorService: Effect.Effect<
  PublicCalculatorServiceShape,
  never,
  WhatTaxEffectRequirements
> = Effect.service(PublicCalculatorService);

export const calculate = <
  const Id extends CalculatorId,
  const Jurisdiction extends CalculatorJurisdiction,
  const TaxYear extends CalculatorTaxYear,
  const InputSchema extends Schema.Schema<PublicCalculationFacts>,
  const OutputSchema extends Schema.Decoder<PublicCalculationReport, never>,
>(
  calculation: SdkCalculation<
    Id,
    Jurisdiction,
    TaxYear,
    InputSchema,
    OutputSchema
  >,
  input: InputSchema["Type"]
): Effect.Effect<
  OutputSchema["Type"],
  PublicCalculatorError | Schema.SchemaError,
  WhatTaxEffectRequirements
> =>
  publicCalculatorService.pipe(
    Effect.flatMap((service) => {
      const { calculatorId, decodeOutput, jurisdiction, taxYear } = calculation;

      return service
        .calculate({
          calculatorId,
          payload: {
            facts: input,
            jurisdiction,
            taxYear,
          },
        })
        .pipe(Effect.flatMap((response) => decodeOutput(response.report)));
    })
  );

export const createEffectClient = <
  const Modules extends readonly AnyWhatTaxModule[],
>(
  ..._modules: Modules
) => ({
  calculations: {
    calculate: <const Calculation extends ModuleCalculation<Modules>>(
      calculation: Calculation,
      input: CalculationInput<Calculation>
    ) => calculate(calculation, input),
  },
});
