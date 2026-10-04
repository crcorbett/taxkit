import { PublicCalculatorService } from "@taxkit/calculators";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { TaxKitApi } from "../api.js";
import { CalculatorApiErrorEnvelopeData } from "../groups/calculators.js";

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
            const service = yield* PublicCalculatorService;
            return yield* service.calculate({
              calculatorId: params.calculatorId,
              payload,
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
