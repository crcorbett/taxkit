import {
  PublicCalculatorService,
  PublicCalculationResponseData,
} from "@whattax/calculators";
import type { CalculatorId } from "@whattax/calculators";
import { CalculationDiagnostics } from "@whattax/core";
import {
  AuAnnualIncomeTaxCalculation,
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
} from "@whattax/sdk/au/effect";
import { calculateRequest as calculateSdkRequest } from "@whattax/sdk/effect";
import type { AnySdkCalculation } from "@whattax/sdk/effect";
import { Array, Effect, HashMap, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { WhatTaxApi } from "../api.js";
import { PublicErrorEnvelopeData } from "../groups/calculators.js";

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

export const PublicCalculationMetadataHandlerLive = HttpApiBuilder.group(
  WhatTaxApi,
  "publicCalculationMetadata",
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
                new PublicErrorEnvelopeData({
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
                new PublicErrorEnvelopeData({
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
                new PublicErrorEnvelopeData({
                  error,
                })
            )
          )
        )
        .handle("calculate", ({ params, payload, query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            const sdkCalculation = sdkCalculationFor(params.calculatorId);
            const report = yield* calculateSdkRequest(sdkCalculation, {
              payload,
              ...query,
            }).pipe(Effect.catchIf(Schema.isSchemaError, Effect.die));
            const calculator = yield* service.getCalculator({
              calculatorId: params.calculatorId,
              help: query.help,
              jurisdiction: payload.jurisdiction,
              taxYear: payload.taxYear,
            });
            const graph = yield* service.getCalculatorGraph({
              calculatorId: params.calculatorId,
              jurisdiction: payload.jurisdiction,
              taxYear: payload.taxYear,
            });

            return new PublicCalculationResponseData({
              calculator,
              diagnostics: new CalculationDiagnostics({
                graphIssues: graph.validationIssues,
              }),
              report,
            });
          }).pipe(
            Effect.mapError(
              (error) =>
                new PublicErrorEnvelopeData({
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
