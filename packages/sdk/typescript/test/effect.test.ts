import { describe, expect, it } from "@effect/vitest";
import {
  CalculationEngine,
  CalculationEngineLive,
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
import {
  Function as EffectFunction,
  Effect,
  Exit,
  Layer,
  Result,
  Schema,
} from "effect";

import {
  calculateReport,
  calculateRun,
  decodeInput,
  TaxKitLive,
} from "../src/effect.js";
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
      }).pipe(Effect.provide(TaxKitLive))
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
    }).pipe(Effect.provide(TaxKitLive))
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
      }).pipe(Effect.provide(TaxKitLive))
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
  it.effect("substitutes the actual engine through native Layer.mock", () =>
    Effect.gen(function* () {
      const result = yield* calculateReport(
        AuPayTakeHomeCalculation,
        takeHomeFacts
      ).pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(result), (actual) => {
        expect(actual).toBeTruthy();
      });
    }).pipe(
      Effect.provide(
        Layer.mock(CalculationEngine, {
          run: Effect.fn("CalculationEngine.run")(() =>
            Effect.die("Fixture defect")
          ),
        })
      )
    )
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
      }).pipe(Effect.provide(CalculationEngineLive))
  );
});
