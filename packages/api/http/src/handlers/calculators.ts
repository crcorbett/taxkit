import { PublicCalculatorService } from "@taxkit/calculators";
import type { CalculatorId } from "@taxkit/calculators";
import {
  AuAnnualIncomeTaxCalculation,
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
} from "@taxkit/sdk/au/effect";
import { calculateRunRequest as calculateSdkRunRequest } from "@taxkit/sdk/effect";
import type { AnySdkCalculation } from "@taxkit/sdk/effect";
import { Array, Effect, HashMap, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { TaxKitApi } from "../api.js";
import { CalculatorApiErrorEnvelopeData } from "../groups/calculators.js";

const SdkCalculations = [
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
  AuAnnualIncomeTaxCalculation,
] as const;

const sdkCalculationsById = HashMap.fromIterable(
  Array.map(
    SdkCalculations,
    (calculation): readonly [CalculatorId, AnySdkCalculation] => [
      calculation.calculatorId,
      calculation,
    ]
  )
);

const sdkCalculationFor = (calculatorId: CalculatorId): AnySdkCalculation =>
  sdkCalculationsById.pipe(
    HashMap.get(calculatorId),
    Option.getOrThrowWith(
      () => new Error(`Missing SDK calculation for ${calculatorId}`)
    )
  );

export const CalculatorApiHandlerLive = HttpApiBuilder.group(
  TaxKitApi,
  "calculatorApi",
  (handlers) =>
    Effect.succeed(
      handlers
        .handle("getJurisdictions", () =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.listJurisdictions();
          })
        )
        .handle("getTaxYears", ({ query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.listTaxYears(query);
          })
        )
        .handle("listCalculators", ({ query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.listCalculators(query);
          })
        )
        .handle("getCalculator", ({ params, query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.getCalculator({
              calculatorId: params.calculatorId,
              ...query,
            });
          }).pipe(
            Effect.mapError(
              (error) =>
                new CalculatorApiErrorEnvelopeData({
                  error,
                })
            )
          )
        )
        .handle("getCalculatorSchema", ({ params, query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.getCalculatorSchema({
              calculatorId: params.calculatorId,
              ...query,
            });
          }).pipe(
            Effect.mapError(
              (error) =>
                new CalculatorApiErrorEnvelopeData({
                  error,
                })
            )
          )
        )
        .handle("getCalculatorGraph", ({ params, query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.getCalculatorGraph({
              calculatorId: params.calculatorId,
              ...query,
            });
          }).pipe(
            Effect.mapError(
              (error) =>
                new CalculatorApiErrorEnvelopeData({
                  error,
                })
            )
          )
        )
        .handle("calculate", ({ params, payload, query }) =>
          Effect.gen(function* () {
            const sdkCalculation = sdkCalculationFor(params.calculatorId);
            return yield* calculateSdkRunRequest(sdkCalculation, {
              payload,
              ...query,
            }).pipe(Effect.catchIf(Schema.isSchemaError, Effect.die));
          }).pipe(
            Effect.mapError(
              (error) =>
                new CalculatorApiErrorEnvelopeData({
                  error,
                })
            )
          )
        )
        .handle("listFacts", ({ query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.listFacts(query);
          })
        )
        .handle("listRules", ({ query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.listRules(query);
          })
        )
    )
);
