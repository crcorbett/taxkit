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
} from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import type { PublicCalculatorServiceShape } from "@taxkit/calculators/service";
import { Effect } from "effect";
import type { Context, Schema } from "effect";

import type {
  AnyTaxKitModule,
  CalculationInput,
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
export { defineSdkCalculation, defineTaxKitModule } from "./types.js";

export type TaxKitEffectRequirements = Context.Service.Identifier<
  typeof PublicCalculatorService
>;

const publicCalculatorService: Effect.Effect<
  PublicCalculatorServiceShape,
  never,
  TaxKitEffectRequirements
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
  TaxKitEffectRequirements
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
  TaxKitEffectRequirements
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
  TaxKitEffectRequirements
> =>
  calculateReportRequest(calculation, {
    payload: {
      facts: input,
      jurisdiction: calculation.jurisdiction,
      taxYear: calculation.taxYear,
    },
  });

export const createClient = <const Modules extends readonly AnyTaxKitModule[]>(
  ..._modules: Modules
) => ({
  calculations: {
    calculateReport: <const Calculation extends ModuleCalculation<Modules>>(
      calculation: Calculation,
      input: CalculationInput<Calculation>
    ) => calculateReport(calculation, input),
  },
});
