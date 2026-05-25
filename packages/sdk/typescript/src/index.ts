import { PublicCalculatorServiceLive } from "@whattax/calculators/live";
import type {
  CalculatorId,
  CalculatorJurisdiction,
  CalculatorTaxYear,
  CalculatorRunFacts,
  CalculatorRunReport,
} from "@whattax/calculators/schemas";
import { PublicCalculatorService } from "@whattax/calculators/service";
import type { PublicCalculatorServiceShape } from "@whattax/calculators/service";
import { CalculationEngineLive } from "@whattax/core";
import { Effect, Exit, Layer, ManagedRuntime } from "effect";
import type { Context, Schema } from "effect";
import { pipe } from "effect/Function";

import {
  toWhatTaxCalculationError,
  WhatTaxFailure,
  WhatTaxSuccess,
} from "./errors.js";
import type { WhatTaxSafeResult } from "./errors.js";
import type {
  AnyWhatTaxModule,
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
export {
  WhatTaxCalculationError,
  WhatTaxFailure,
  WhatTaxSchemaDecodeError,
  WhatTaxSuccess,
  WhatTaxUnexpectedError,
} from "./errors.js";
export type {
  WhatTaxCalculationErrorDetail,
  WhatTaxError,
  WhatTaxSafeResult,
} from "./errors.js";

const WhatTaxLayer = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

const WhatTaxRuntime = ManagedRuntime.make(WhatTaxLayer);

type WhatTaxRequirements = Context.Service.Identifier<
  typeof PublicCalculatorService
>;

const publicCalculatorService: Effect.Effect<
  PublicCalculatorServiceShape,
  never,
  WhatTaxRequirements
> = Effect.service(PublicCalculatorService);

export interface WhatTaxClient<Modules extends readonly AnyWhatTaxModule[]> {
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
      ) => Promise<WhatTaxSafeResult<OutputSchema["Type"]>>;
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
): Promise<WhatTaxSafeResult<OutputSchema["Type"]>> => {
  const exit = await WhatTaxRuntime.runPromise(
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
        new WhatTaxFailure({
          error: toWhatTaxCalculationError(cause),
        }),
      onSuccess: (value) =>
        new WhatTaxSuccess({
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

  return result._tag === "WhatTaxSuccess"
    ? result.value
    : Promise.reject(result.error);
};

export const createClient = <const Modules extends readonly AnyWhatTaxModule[]>(
  ..._modules: Modules
): WhatTaxClient<Modules> => ({
  calculations: {
    calculate: (calculation, input) => calculate(calculation, input),
    safe: {
      calculate: (calculation, input) => calculateSafe(calculation, input),
    },
  },
});

export const WhatTax = {
  calculate,
  createClient,
  safe: {
    calculate: calculateSafe,
  },
} as const;
