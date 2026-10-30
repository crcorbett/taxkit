import { describe, expect, it } from "@effect/vitest";
import { CalculationEngine, CalculationEngineLive } from "@taxkit/core/engine";
import { Money, Cents, moneyEquals } from "@taxkit/core/primitives";
import { TraceNode } from "@taxkit/core/trace";
import {
  AuTakeHomePay2024_25_Live,
  AuTakeHomePay2025_26_Live,
  CalculateTakeHomePay,
  GrossPay,
  NetPayRuleId,
  PaygWithholdingComponentId,
  PaygWithholdingRuleId,
  PayWithholdingsLedgerRuleId,
  TakeHomePayReport,
  TakeHomeScenario,
  TakeHomeScenarioInputSchema,
  TakeHomeScenarioLive,
  TaxablePayRuleId,
} from "@taxkit/rules-au-pay";
import type { TakeHomeScenarioInput } from "@taxkit/rules-au-pay";
import { expectAt } from "@taxkit/testing";
import {
  Function as EffectFunction,
  Array as EffectArray,
  Effect,
  Exit,
  Layer,
  Schema,
} from "effect";

const runScenario = (
  pack: typeof AuTakeHomePay2025_26_Live,
  input: TakeHomeScenarioInput
) =>
  Effect.gen(function* () {
    const engine = yield* CalculationEngine;
    const result = yield* engine.run({
      calculation: CalculateTakeHomePay,
      layer: pack.pipe(
        Layer.provideMerge(TakeHomeScenarioLive),
        Layer.provide(Layer.succeed(TakeHomeScenario)(input))
      ),
    });
    return result.report;
  }).pipe(Effect.provide(CalculationEngineLive));
const weekly1500 = new GrossPay({
  amount: new Money({ cents: Cents.make(150_000), currency: "AUD" }),
  period: "weekly",
});
describe("AU take-home pay calculator (2025-26 rule pack)", () => {
  // Schedule 1: monthly earnings ending in 33 cents are increased by one
  // cent before conversion to weekly earnings. Neighbours do not change.
  it.effect.each([
    { gross: 260_432, tax: 20_800 },
    { gross: 260_433, tax: 21_200 },
    { gross: 260_434, tax: 21_200 },
  ])("applies monthly earnings adjustment for $gross cents", ({ gross, tax }) =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: new GrossPay({
          amount: new Money({ cents: Cents.make(gross), currency: "AUD" }),
          period: "monthly",
        }),
        taxFreeThresholdClaimed: true,
      });
      expect(report.withholdingsTotal.cents).toBe(tax);
      expect(report.netPay.cents + tax).toBe(gross);
    })
  );
  // Independent exact-decimal Schedule 1 oracles around half-dollar boundaries.
  it.effect.each([
    { claimed: true, gross: 101_400, tax: 14_700 },
    { claimed: true, gross: 101_500, tax: 14_800 },
    { claimed: true, gross: 129_300, tax: 23_700 },
    { claimed: true, gross: 267_800, tax: 68_600 },
    { claimed: true, gross: 369_500, tax: 108_600 },
    { claimed: false, gross: 46_900, tax: 8900 },
    { claimed: false, gross: 225_400, tax: 65_600 },
    { claimed: false, gross: 330_700, tax: 106_700 },
  ])(
    "rounds the complete formula once for $gross cents, threshold $claimed",
    ({ gross, claimed, tax }) =>
      Effect.gen(function* () {
        const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
          grossPay: new GrossPay({
            amount: new Money({ cents: Cents.make(gross), currency: "AUD" }),
            period: "weekly",
          }),
          taxFreeThresholdClaimed: claimed,
        });
        expect(report.withholdingsTotal.cents).toBe(tax);
        expect(report.netPay.cents + tax).toBe(gross);
      })
  );
  it.effect("golden case: $1500 weekly, TFN claimed", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });
      expect({
        length: moneyEquals(
          report.withholdingsTotal,
          new Money({ cents: Cents.make(30_400), currency: "AUD" })
        ),
        length2: moneyEquals(
          report.netPay,
          new Money({ cents: Cents.make(119_600), currency: "AUD" })
        ),
        reportIdentity: {
          reportPeriod: report.period,
          reportRulePackVersion: report.rulePackVersion,
        },
      }).toStrictEqual({
        length: true,
        length2: true,
        reportIdentity: {
          reportPeriod: "weekly",
          reportRulePackVersion: "rules-au-pay/1.0.2",
        },
      });
    })
  );
  it.effect(
    "trace tree shape: NetPay -> Ledger -> PAYG component -> TaxablePay",
    () =>
      Effect.gen(function* () {
        const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
          grossPay: weekly1500,
          taxFreeThresholdClaimed: true,
        });
        const ledgerTrace = expectAt(report.trace.children, 0);
        const paygTrace = expectAt(ledgerTrace.children, 0);
        const taxableTrace = expectAt(paygTrace.children, 0);
        const encodedPayg = yield* Schema.encodeEffect(TraceNode)(paygTrace);
        const components = EffectFunction.pipe(
          report.withholdings.components,
          EffectArray.map(({ id, status, effect }) => ({ id, status, effect }))
        );
        expect({
          rules: [
            report.trace.ruleId,
            ledgerTrace.ruleId,
            paygTrace.ruleId,
            taxableTrace.ruleId,
          ],
          childCounts: [
            report.trace.children.length,
            ledgerTrace.children.length,
          ],
          rounding: encodedPayg.rounding,
          sources: EffectFunction.pipe(
            paygTrace.sources,
            EffectArray.map((source) => source.kind)
          ),
          components,
        }).toStrictEqual({
          rules: [
            NetPayRuleId,
            PayWithholdingsLedgerRuleId,
            PaygWithholdingRuleId,
            TaxablePayRuleId,
          ],
          childCounts: [1, 1],
          rounding: "ato-withholding-rounding",
          sources: ["ato-publication"],
          components: [
            {
              id: PaygWithholdingComponentId,
              status: "active",
              effect: "additive",
            },
          ],
        });
      })
  );
  it.effect(
    "trace and ledger snapshot: PAYG-only explanation order and sources",
    () =>
      Effect.gen(function* () {
        const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
          grossPay: weekly1500,
          taxFreeThresholdClaimed: true,
        });
        const encodedTrace = yield* Schema.encodeEffect(TraceNode)(
          report.trace
        );
        expect({
          explanationOrder: EffectFunction.pipe(
            encodedTrace.children,
            EffectArray.map((child) => ({
              children: EffectFunction.pipe(
                child.children,
                EffectArray.map((grandchild) => ({
                  children: EffectFunction.pipe(
                    grandchild.children,
                    EffectArray.map((leaf) => leaf.ruleId)
                  ),
                  rounding: grandchild.rounding,
                  ruleId: grandchild.ruleId,
                  sourceKinds: EffectFunction.pipe(
                    grandchild.sources,
                    EffectArray.map((source) => source.kind)
                  ),
                }))
              ),
              ruleId: child.ruleId,
            }))
          ),
          ledger: EffectFunction.pipe(
            report.withholdings.components,
            EffectArray.map((component) => ({
              cents: component.amount.cents,
              effect: component.effect,
              id: component.id,
              status: component.status,
            }))
          ),
          root: report.trace.ruleId,
        }).toStrictEqual({
          explanationOrder: [
            {
              children: [
                {
                  children: [TaxablePayRuleId],
                  rounding: "ato-withholding-rounding",
                  ruleId: PaygWithholdingRuleId,
                  sourceKinds: ["ato-publication"],
                },
              ],
              ruleId: PayWithholdingsLedgerRuleId,
            },
          ],
          ledger: [
            {
              cents: 30_400,
              effect: "additive",
              id: PaygWithholdingComponentId,
              status: "active",
            },
          ],
          root: NetPayRuleId,
        });
      })
  );
  it.effect("determinism: two runs produce identical traces", () =>
    Effect.gen(function* () {
      const a = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });
      const b = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });
      const first = yield* Schema.encodeEffect(
        Schema.fromJsonString(TakeHomePayReport)
      )(a);
      const second = yield* Schema.encodeEffect(
        Schema.fromJsonString(TakeHomePayReport)
      )(b);
      expect(first).toBe(second);
    })
  );
  it.effect("zero withholding under tax-free threshold", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: new GrossPay({
          amount: new Money({ cents: Cents.make(30_000), currency: "AUD" }),
          period: "weekly",
        }),
        taxFreeThresholdClaimed: true,
      });
      expect({
        length: moneyEquals(
          report.withholdingsTotal,
          new Money({ cents: Cents.make(0), currency: "AUD" })
        ),
        length2: moneyEquals(
          report.netPay,
          new Money({ cents: Cents.make(30_000), currency: "AUD" })
        ),
      }).toStrictEqual({
        length: true,
        length2: true,
      });
    })
  );
  it.effect("Scale 1 applies when the tax-free threshold is not claimed", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: false,
      });
      expect({
        length: moneyEquals(
          report.withholdingsTotal,
          new Money({ cents: Cents.make(41_500), currency: "AUD" })
        ),
        length2: moneyEquals(
          report.netPay,
          new Money({ cents: Cents.make(108_500), currency: "AUD" })
        ),
      }).toStrictEqual({
        length: true,
        length2: true,
      });
      const ledgerTrace = expectAt(report.trace.children, 0);
      const paygTrace = expectAt(ledgerTrace.children, 0);
      expect(paygTrace.inputs).toMatchObject({ scale: "scale1" });
    })
  );
  it.effect("scenario input Schema rejects malformed input", () =>
    Effect.gen(function* () {
      const exit = yield* Schema.decodeUnknownEffect(
        TakeHomeScenarioInputSchema
      )({
        grossPay: weekly1500,
        taxFreeThresholdClaimed: "yes",
      }).pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
        expect(actual).toBeTruthy();
      });
    })
  );
  it.effect("fortnightly period: weekly-equivalent formula", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: new GrossPay({
          amount: new Money({ cents: Cents.make(300_000), currency: "AUD" }),
          period: "fortnightly",
        }),
        taxFreeThresholdClaimed: true,
      });
      expect({
        length: moneyEquals(
          report.withholdingsTotal,
          new Money({ cents: Cents.make(60_800), currency: "AUD" })
        ),
        length2: moneyEquals(
          report.netPay,
          new Money({ cents: Cents.make(239_200), currency: "AUD" })
        ),
      }).toStrictEqual({
        length: true,
        length2: true,
      });
    })
  );
  it.effect(
    "monthly period: rounds the converted monthly withholding to dollars",
    () =>
      Effect.gen(function* () {
        const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
          grossPay: new GrossPay({
            amount: new Money({ cents: Cents.make(650_000), currency: "AUD" }),
            period: "monthly",
          }),
          taxFreeThresholdClaimed: true,
        });
        expect({
          length: moneyEquals(
            report.withholdingsTotal,
            new Money({ cents: Cents.make(131_700), currency: "AUD" })
          ),
          length2: moneyEquals(
            report.netPay,
            new Money({ cents: Cents.make(518_300), currency: "AUD" })
          ),
        }).toStrictEqual({
          length: true,
          length2: true,
        });
      })
  );
});
describe("AU take-home pay calculator (2024-25 rule pack)", () => {
  it.effect(
    "uses the official Schedule 1 coefficients for the 2024-25 pack",
    () =>
      Effect.gen(function* () {
        const report = yield* runScenario(AuTakeHomePay2024_25_Live, {
          grossPay: weekly1500,
          taxFreeThresholdClaimed: true,
        });
        expect({
          length: moneyEquals(
            report.withholdingsTotal,
            new Money({ cents: Cents.make(30_400), currency: "AUD" })
          ),
          length2: moneyEquals(
            report.netPay,
            new Money({ cents: Cents.make(119_600), currency: "AUD" })
          ),
        }).toStrictEqual({
          length: true,
          length2: true,
        });
      })
  );
});
