import type {
  CalculatorId,
  CalculatorJurisdiction,
  CalculatorTaxYear,
  CalculatorRunRequest,
  CalculatorRunFacts,
  CalculatorServiceError,
  CalculatorRunReport,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
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

export type SdkCalculatorRunPayload<Input> = Omit<
  CalculatorRunRequest,
  "facts"
> & {
  readonly facts: Input;
};

export type SdkCalculatorRunServiceRequest<Input> = Omit<
  CalculatorRunServiceRequest,
  "calculatorId" | "payload"
> & {
  readonly payload: SdkCalculatorRunPayload<Input>;
};

export type SdkCalculatorRunResponse<Report> = Omit<
  CalculatorRunResponse,
  "report"
> & {
  readonly report: Report;
};

export const calculateRunRequest = <
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
  request: SdkCalculatorRunServiceRequest<InputSchema["Type"]>
): Effect.Effect<
  SdkCalculatorRunResponse<OutputSchema["Type"]>,
  CalculatorServiceError | Schema.SchemaError,
  WhatTaxEffectRequirements
> =>
  publicCalculatorService.pipe(
    Effect.flatMap((service) => {
      const { calculatorId, decodeOutput } = calculation;

      return service
        .calculate({
          calculatorId,
          ...request,
        })
        .pipe(
          Effect.flatMap((response) =>
            decodeOutput(response.report).pipe(
              Effect.map(
                (report): SdkCalculatorRunResponse<OutputSchema["Type"]> => ({
                  ...response,
                  report,
                })
              )
            )
          )
        );
    })
  );

export const calculateReportRequest = <
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
  request: SdkCalculatorRunServiceRequest<InputSchema["Type"]>
): Effect.Effect<
  OutputSchema["Type"],
  CalculatorServiceError | Schema.SchemaError,
  WhatTaxEffectRequirements
> =>
  calculateRunRequest(calculation, request).pipe(
    Effect.map((run) => run.report)
  );

export const calculateReport = <
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
): Effect.Effect<
  OutputSchema["Type"],
  CalculatorServiceError | Schema.SchemaError,
  WhatTaxEffectRequirements
> =>
  calculateReportRequest(calculation, {
    payload: {
      facts: input,
      jurisdiction: calculation.jurisdiction,
      taxYear: calculation.taxYear,
    },
  });

export const createClient = <const Modules extends readonly AnyWhatTaxModule[]>(
  ..._modules: Modules
) => ({
  calculations: {
    calculateReport: <const Calculation extends ModuleCalculation<Modules>>(
      calculation: Calculation,
      input: CalculationInput<Calculation>
    ) => calculateReport(calculation, input),
  },
});
