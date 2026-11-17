import { describe, expect, it } from "@effect/vitest";
import {
  CalculationError,
  Cents,
  InputValidationError,
  Money,
  NonNegativeMoney,
} from "@taxkit/core";
import {
  AuAnnualIncomeTaxCalculation,
  AnnualTaxScenarioInputSchema,
} from "@taxkit/rules-au-income-tax";
import {
  AuPayTakeHomeCalculation,
  AuPayTakeHomeWithSacrificeCalculation,
  TakeHomeWithSacrificeScenarioInput,
} from "@taxkit/rules-au-pay";
import { TakeHomePayReportEncoded } from "@taxkit/rules-au-pay/schemas";
import { Function as EffectFunction, Effect, Result, Schema } from "effect";

import { calculateReport, calculateRun, decodeInput } from "../src/effect.js";
import { takeHomeFacts } from "./fixtures.js";

describe("native calculator definitions", () => {
  it.effect(
    "returns a narrowed report and full run from the same definition",
    () =>
      Effect.gen(function* () {
        const report = yield* calculateReport(
          AuPayTakeHomeCalculation,
          takeHomeFacts
        );
        const run = yield* calculateRun(
          AuPayTakeHomeCalculation,
          takeHomeFacts
        );
        expect(report.netPay.cents).toBe(130_100);
        expect(run.report).toStrictEqual(report);
        expect(run.diagnostics).toBeDefined();
      })
  );
  it.effect("executes the annual owning program", () =>
    Effect.gen(function* () {
      const taxableIncome = EffectFunction.pipe(
        Money.fromCents(Cents.make(9_000_000)),
        (money) => NonNegativeMoney.make(money)
      );
      const input = AnnualTaxScenarioInputSchema.make({ taxableIncome });
      const report = yield* calculateReport(
        AuAnnualIncomeTaxCalculation,
        input
      );
      expect(report.liability.cents).toBe(1_958_800);
    })
  );
  it.effect(
    "requires sacrifice explicitly and restores its accounting equation",
    () =>
      Effect.gen(function* () {
        const salarySacrifice = EffectFunction.pipe(
          Money.fromCents(Cents.make(10_000)),
          (money) => NonNegativeMoney.make(money)
        );
        const input = TakeHomeWithSacrificeScenarioInput.make({
          grossPay: takeHomeFacts.grossPay,
          period: takeHomeFacts.period,
          taxFreeThresholdClaimed: takeHomeFacts.taxFreeThresholdClaimed,
          salarySacrifice,
        });
        const report = yield* calculateReport(
          AuPayTakeHomeWithSacrificeCalculation,
          input
        );
        expect(report.salarySacrifice.cents).toBe(10_000);
        expect(report.grossPay.cents).toBe(
          report.netPay.cents +
            report.salarySacrifice.cents +
            report.withholdingsTotal.cents
        );
        const encoded = yield* Schema.encodeEffect(
          AuPayTakeHomeWithSacrificeCalculation.outputSchema
        )(report);
        const restored = yield* Schema.decodeEffect(
          AuPayTakeHomeWithSacrificeCalculation.outputSchema
        )(encoded);
        expect(restored).toStrictEqual(report);
      })
  );
  it.effect("rejects surplus input without leaking values", () =>
    Effect.gen(function* () {
      const encoded = yield* Schema.encodeEffect(
        AuPayTakeHomeCalculation.inputSchema
      )(takeHomeFacts);
      const rejected = yield* decodeInput(AuPayTakeHomeCalculation, {
        ...encoded,
        salarySacrifice: "PRIVATE_SENTINEL",
      }).pipe(Effect.result);
      EffectFunction.pipe(Result.isFailure(rejected), (actual) => {
        expect(actual).toBeTruthy();
      });
      if (Result.isFailure(rejected)) {
        expect(rejected.failure.message).toBe("Invalid calculator input.");
        const codec = Schema.toCodecJson(
          Schema.Result(
            AuPayTakeHomeCalculation.inputSchema,
            InputValidationError
          )
        );
        expect(yield* Schema.encodeEffect(codec)(rejected)).not.toContain(
          "PRIVATE_SENTINEL"
        );
      }
    })
  );
  it.effect("keeps a definition's calculation failure typed", () =>
    Effect.gen(function* () {
      const failure = new CalculationError({
        message: "Fixture calculation failed.",
        reason: "overflow",
      });
      const result = yield* calculateReport(
        {
          ...AuPayTakeHomeCalculation,
          calculate: () => Effect.fail(failure),
        },
        takeHomeFacts
      ).pipe(Effect.flip);
      expect(result).toBe(failure);
    })
  );
  it.effect(
    "retains accounting checks in its explicit representation codec",
    () =>
      Effect.gen(function* () {
        const report = yield* calculateReport(
          AuPayTakeHomeCalculation,
          takeHomeFacts
        );
        const encoded = yield* Schema.encodeEffect(
          AuPayTakeHomeCalculation.outputSchema
        )(report);
        const bad = {
          ...encoded,
          netPay: { ...encoded.netPay, cents: Cents.make(0) },
        };
        const representation = Schema.decodeResult(TakeHomePayReportEncoded)(
          bad
        );
        const restored = Schema.decodeResult(
          AuPayTakeHomeCalculation.outputSchema
        )(bad);
        EffectFunction.pipe(Result.isFailure(representation), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(Result.isFailure(restored), (actual) => {
          expect(actual).toBeTruthy();
        });
      })
  );
});
