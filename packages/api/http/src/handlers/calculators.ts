import { PublicCalculatorService } from "@taxkit/calculators";
import type { CalculatorMetadataError } from "@taxkit/calculators";
import { Effect, Match } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { TaxKitApi } from "../api.js";
import { CalculatorApiErrorEnvelopeData } from "../groups/calculators.js";

const calculatorApiMetadataFailure = (error: CalculatorMetadataError) =>
  Match.value(error).pipe(
    Match.tag(
      "CalculatorOperationTimedOut",
      (failure) => new CalculatorApiErrorEnvelopeData({ error: failure })
    ),
    Match.orElse(
      (failure) => new CalculatorApiErrorEnvelopeData({ error: failure })
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
          }).pipe(
            Effect.mapError(
              (error) => new CalculatorApiErrorEnvelopeData({ error })
            )
          )
        )
        .handle("getTaxYears", ({ query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.listTaxYears(query);
          }).pipe(
            Effect.mapError(
              (error) => new CalculatorApiErrorEnvelopeData({ error })
            )
          )
        )
        .handle("listCalculators", ({ query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.listCalculators(query);
          }).pipe(
            Effect.mapError(
              (error) => new CalculatorApiErrorEnvelopeData({ error })
            )
          )
        )
        .handle("getCalculator", ({ params, query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.getCalculator({
              calculatorId: params.calculatorId,
              ...query,
            });
          }).pipe(Effect.mapError(calculatorApiMetadataFailure))
        )
        .handle("getCalculatorSchema", ({ params, query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.getCalculatorSchema({
              calculatorId: params.calculatorId,
              ...query,
            });
          }).pipe(Effect.mapError(calculatorApiMetadataFailure))
        )
        .handle("getCalculatorGraph", ({ params, query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.getCalculatorGraph({
              calculatorId: params.calculatorId,
              ...query,
            });
          }).pipe(Effect.mapError(calculatorApiMetadataFailure))
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
            Effect.mapError((error) =>
              Match.value(error).pipe(
                Match.tag(
                  "CalculatorRateLimited",
                  (failure) =>
                    new CalculatorApiErrorEnvelopeData({ error: failure })
                ),
                Match.tag(
                  "CalculatorAdmissionUnavailable",
                  (failure) =>
                    new CalculatorApiErrorEnvelopeData({ error: failure })
                ),
                Match.tag(
                  "CalculatorCapacityExceeded",
                  (failure) =>
                    new CalculatorApiErrorEnvelopeData({ error: failure })
                ),
                Match.tag(
                  "CalculatorOperationTimedOut",
                  (failure) =>
                    new CalculatorApiErrorEnvelopeData({ error: failure })
                ),
                Match.orElse(
                  (failure) =>
                    new CalculatorApiErrorEnvelopeData({ error: failure })
                )
              )
            )
          )
        )
        .handle("listFacts", ({ query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.listFacts(query);
          }).pipe(
            Effect.mapError(
              (error) => new CalculatorApiErrorEnvelopeData({ error })
            )
          )
        )
        .handle("listRules", ({ query }) =>
          Effect.gen(function* () {
            const service = yield* PublicCalculatorService;
            return yield* service.listRules(query);
          }).pipe(
            Effect.mapError(
              (error) => new CalculatorApiErrorEnvelopeData({ error })
            )
          )
        )
    )
);
