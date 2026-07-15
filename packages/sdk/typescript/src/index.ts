import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import type {
  CalculatorId,
  CalculatorJurisdiction,
  CalculatorTaxYear,
  CalculatorRunFacts,
  CalculatorRunReport,
} from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import type { PublicCalculatorServiceShape } from "@taxkit/calculators/service";
import { CalculationEngineLive } from "@taxkit/core";
import { Effect, Exit, Layer, ManagedRuntime } from "effect";
import type { Context, Schema } from "effect";
import { pipe } from "effect/Function";

import {
  toTaxKitCalculationError,
  TaxKitFailure,
  TaxKitSuccess,
} from "./errors.js";
import type { TaxKitSafeResult } from "./errors.js";
import type {
  AnyTaxKitModule,
  ModuleCalculation,
  SdkCalculation,
} from "./types.js";

export type {
  AnySdkCalculation,
  AnyTaxKitModule,
  CalculationInput,
  CalculationOutput,
  ModuleCalculation,
  SdkCalculation,
  SdkCalculationDefinition,
  TaxKitModule,
} from "./types.js";
export {
  TaxKitCalculationError,
  TaxKitFailure,
  TaxKitSchemaDecodeError,
  TaxKitSuccess,
  TaxKitUnexpectedError,
} from "./errors.js";
export type {
  TaxKitCalculationErrorDetail,
  TaxKitError,
  TaxKitSafeResult,
} from "./errors.js";

const TaxKitLayer = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

const TaxKitRuntime = ManagedRuntime.make(TaxKitLayer);

type TaxKitRequirements = Context.Service.Identifier<
  typeof PublicCalculatorService
>;

const publicCalculatorService: Effect.Effect<
  PublicCalculatorServiceShape,
  never,
  TaxKitRequirements
> = Effect.service(PublicCalculatorService);

export interface TaxKitClient<Modules extends readonly AnyTaxKitModule[]> {
  readonly calculations: {
    readonly calculate: <
      const Id extends CalculatorId,
      const Jurisdiction extends CalculatorJurisdiction,
      const TaxYear extends CalculatorTaxYear,
      const InputSchema extends Schema.Schema<CalculatorRunFacts>,
      const OutputSchema extends Schema.Decoder<CalculatorRunReport, never>,
      const Calculation extends ModuleCalculation<Modules> &
        SdkCalculation<Id, Jurisdiction, TaxYear, InputSchema, OutputSchema>,
    >(
      calculation: Calculation,
      input: InputSchema["Type"]
    ) => Promise<OutputSchema["Type"]>;
    readonly safe: {
      readonly calculate: <
        const Id extends CalculatorId,
        const Jurisdiction extends CalculatorJurisdiction,
        const TaxYear extends CalculatorTaxYear,
        const InputSchema extends Schema.Schema<CalculatorRunFacts>,
        const OutputSchema extends Schema.Decoder<CalculatorRunReport, never>,
        const Calculation extends ModuleCalculation<Modules> &
          SdkCalculation<Id, Jurisdiction, TaxYear, InputSchema, OutputSchema>,
      >(
        calculation: Calculation,
        input: InputSchema["Type"]
      ) => Promise<TaxKitSafeResult<OutputSchema["Type"]>>;
    };
  };
}

export const calculateSafe = async <
  const Id extends CalculatorId,
  const Jurisdiction extends CalculatorJurisdiction,
  const TaxYear extends CalculatorTaxYear,
  const InputSchema extends Schema.Schema<CalculatorRunFacts>,
  const OutputSchema extends Schema.Decoder<CalculatorRunReport, never>,
>(
  calculation: SdkCalculation<
    Id,
    Jurisdiction,
    TaxYear,
    InputSchema,
    OutputSchema
  >,
  input: InputSchema["Type"]
): Promise<TaxKitSafeResult<OutputSchema["Type"]>> => {
  const exit = await TaxKitRuntime.runPromise(
    publicCalculatorService.pipe(
      Effect.flatMap((service) => {
        const { calculatorId, jurisdiction, taxYear } = calculation;

        return service
          .calculate({
            calculatorId,
            payload: {
              facts: input,
              jurisdiction,
              taxYear,
            },
          })
          .pipe(
            Effect.flatMap((response) =>
              calculation.decodeOutput(response.report)
            )
          );
      }),
      Effect.exit
    )
  );

  return pipe(
    exit,
    Exit.match({
      onFailure: (cause) =>
        new TaxKitFailure({
          error: toTaxKitCalculationError(cause),
        }),
      onSuccess: (value) =>
        new TaxKitSuccess({
          value,
        }),
    })
  );
};

export const calculate = async <
  const Id extends CalculatorId,
  const Jurisdiction extends CalculatorJurisdiction,
  const TaxYear extends CalculatorTaxYear,
  const InputSchema extends Schema.Schema<CalculatorRunFacts>,
  const OutputSchema extends Schema.Decoder<CalculatorRunReport, never>,
>(
  calculation: SdkCalculation<
    Id,
    Jurisdiction,
    TaxYear,
    InputSchema,
    OutputSchema
  >,
  input: InputSchema["Type"]
): Promise<OutputSchema["Type"]> => {
  const result = await calculateSafe(calculation, input);

  return result._tag === "TaxKitSuccess"
    ? result.value
    : Promise.reject(result.error);
};

export const createClient = <const Modules extends readonly AnyTaxKitModule[]>(
  ..._modules: Modules
): TaxKitClient<Modules> => ({
  calculations: {
    calculate: (calculation, input) => calculate(calculation, input),
    safe: {
      calculate: (calculation, input) => calculateSafe(calculation, input),
    },
  },
});

export const TaxKit = {
  calculate,
  createClient,
  safe: {
    calculate: calculateSafe,
  },
} as const;
