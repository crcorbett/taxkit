import { describe, expect, it } from "@effect/vitest";
import { InputValidationError, CalculationError, CalculationEngine, CalculationEngineLive, Cents, Money, NonNegativeMoney } from "@taxkit/core";
import { AuPayTakeHomeCalculation, AuPayTakeHomeWithSacrificeCalculation, TakeHomeWithSacrificeScenarioInput } from "@taxkit/rules-au-pay";
import { AuAnnualIncomeTaxCalculation, AnnualTaxScenarioInputSchema } from "@taxkit/rules-au-income-tax";
import { Effect, Layer, Result, Schema } from "effect";
import { calculateReport, calculateRun, decodeInput, TaxKitLive } from "../src/effect.js";
import { takeHomeFacts } from "./fixtures.js";

describe("native calculator definitions", () => {
  it.effect("returns a narrowed report and full run from the same definition", () => Effect.gen(function* () {
    const report = yield* calculateReport(AuPayTakeHomeCalculation, takeHomeFacts);
    const run = yield* calculateRun(AuPayTakeHomeCalculation, takeHomeFacts);
    expect(report.netPay.cents).toBe(130_100);
    expect(run.report).toStrictEqual(report);
    expect(run.diagnostics).toBeDefined();
  }).pipe(Effect.provide(TaxKitLive)));
  it.effect("executes the annual owning program", () => Effect.gen(function* () {
    const report = yield* calculateReport(AuAnnualIncomeTaxCalculation, AnnualTaxScenarioInputSchema.make({ taxableIncome: NonNegativeMoney.make(Money.fromCents(Cents.make(9_000_000))) }));
    expect(report.liability.cents).toBe(1_778_800);
  }).pipe(Effect.provide(TaxKitLive)));
  it.effect("requires sacrifice explicitly and restores its accounting equation", () => Effect.gen(function* () {
    const input = TakeHomeWithSacrificeScenarioInput.make({ ...takeHomeFacts, salarySacrifice: NonNegativeMoney.make(Money.fromCents(Cents.make(10_000))) });
    const report = yield* calculateReport(AuPayTakeHomeWithSacrificeCalculation, input);
    expect(report.salarySacrifice.cents).toBe(10_000);
    expect(report.grossPay.cents).toBe(report.netPay.cents + report.salarySacrifice.cents + report.withholdingsTotal.cents);
    const encoded = yield* Schema.encodeEffect(AuPayTakeHomeWithSacrificeCalculation.outputSchema)(report);
    const restored = yield* Schema.decodeEffect(AuPayTakeHomeWithSacrificeCalculation.outputSchema)(encoded);
    expect(restored).toStrictEqual(report);
  }).pipe(Effect.provide(TaxKitLive)));
  it.effect("rejects nested and top-level surplus input without leaking values", () => Effect.gen(function* () {
    const encoded = yield* Schema.encodeEffect(AuPayTakeHomeCalculation.inputSchema)(takeHomeFacts);
    const rejected = yield* decodeInput(AuPayTakeHomeCalculation, { ...encoded, salarySacrifice: "PRIVATE_SENTINEL" }).pipe(Effect.result);
    expect(Result.isFailure(rejected)).toBe(true);
    if (Result.isFailure(rejected)) {
      expect(rejected.failure._tag).toBe("InputValidationError");
      expect(yield* Schema.encodeEffect(Schema.toCodecJson(Schema.Result(AuPayTakeHomeCalculation.inputSchema, InputValidationError)))(rejected)).not.toContain("PRIVATE_SENTINEL");
    }
  }));
  it.effect("substitutes the actual engine service without private callbacks", () => Effect.gen(function* () {
    const failure = yield* calculateReport(AuPayTakeHomeCalculation, takeHomeFacts).pipe(Effect.flip);
    expect(failure.message).toBe("Fixture calculation failure");
  }).pipe(Effect.provide(Layer.mock(CalculationEngine, { run: () => Effect.fail(new CalculationError({ message: "Fixture calculation failure" })) }))));
  it.effect("retains aggregate checks on both type and representation codecs", () => Effect.gen(function* () {
    const report = yield* calculateReport(AuPayTakeHomeCalculation, takeHomeFacts);
    const encoded = yield* Schema.encodeEffect(AuPayTakeHomeCalculation.outputSchema)(report);
    expect(Result.isFailure(Schema.decodeResult(Schema.toEncoded(AuPayTakeHomeCalculation.outputSchema))({ ...encoded, netPay: { ...encoded.netPay, cents: Cents.make(0) } }))).toBe(true);
    expect(Result.isFailure(Schema.decodeResult(AuPayTakeHomeCalculation.outputSchema)({ ...encoded, netPay: { ...encoded.netPay, cents: Cents.make(0) } }))).toBe(true);
  }).pipe(Effect.provide(CalculationEngineLive)));
});
