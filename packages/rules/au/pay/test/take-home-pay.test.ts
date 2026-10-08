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
  TakeHomeScenarioLive,
  TakeHomeScenarioLiveFromInput,
  TaxablePayRuleId,
} from "@taxkit/rules-au-pay";
import type { TakeHomeScenarioInput } from "@taxkit/rules-au-pay";
import { expectAt } from "@taxkit/testing";
import { Array as EffectArray, Effect, Exit, Layer, Schema } from "effect";

const runScenario = (
  pack: typeof AuTakeHomePay2025_26_Live,
  input: TakeHomeScenarioInput
) =>
  Effect.gen(function* () {
    const engine = yield* CalculationEngine;
    const result = yield* engine.run({
      calculation: CalculateTakeHomePay,
      layer: pack.pipe(
        Layer.provideMerge(TakeHomeScenarioLiveFromInput(input))
      ),
    });

    return result.report;
  }).pipe(Effect.provide(CalculationEngineLive));

const weekly1500 = new GrossPay({
  amount: new Money({ cents: Cents.make(150_000), currency: "AUD" }),
  period: "weekly",
});

describe("AU take-home pay calculator (2025-26 rule pack)", () => {
  it.effect("golden case: $1500 weekly, TFN claimed", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });

      // x = 1_500.99
      // bracket: a=0.32, b=176.5769 -> round(0.32*1500.99 - 176.5769) = 304
      // net = 1_500 - 304 = 1_196
      expect(
        moneyEquals(
          report.withholdingsTotal,
          new Money({ cents: Cents.make(30_400), currency: "AUD" })
        )
      ).toBe(true);
      expect(
        moneyEquals(
          report.netPay,
          new Money({ cents: Cents.make(119_600), currency: "AUD" })
        )
      ).toBe(true);
      expect(report.period).toBe("weekly");
      expect(report.rulePackVersion).toBe("rules-au-pay/1.0.0");
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

        expect(report.trace.ruleId).toBe(NetPayRuleId);
        expect(report.trace.children.length).toBe(1);

        const ledgerTrace = expectAt(report.trace.children, 0);
        expect(ledgerTrace.ruleId).toBe(PayWithholdingsLedgerRuleId);
        expect(ledgerTrace.children.length).toBe(1);

        const paygTrace = expectAt(ledgerTrace.children, 0);
        expect(paygTrace.ruleId).toBe(PaygWithholdingRuleId);
        const encodedPayg = yield* Schema.encodeEffect(TraceNode)(paygTrace);
        expect(encodedPayg.rounding).toBe("ato-withholding-rounding");
        expect(paygTrace.sources.length).toBe(1);
        expect(expectAt(paygTrace.sources, 0).kind).toBe("ato-publication");

        const taxableTrace = expectAt(paygTrace.children, 0);
        expect(taxableTrace.ruleId).toBe(TaxablePayRuleId);

        // ledger surfaces the active PAYG component
        expect(report.withholdings.components.length).toBe(1);
        expect(expectAt(report.withholdings.components, 0).id).toBe(
          PaygWithholdingComponentId
        );
        expect(expectAt(report.withholdings.components, 0).status).toBe(
          "active"
        );
        expect(expectAt(report.withholdings.components, 0).effect).toBe(
          "additive"
        );
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
          explanationOrder: EffectArray.map(encodedTrace.children, (child) => ({
            children: EffectArray.map(child.children, (grandchild) => ({
              children: EffectArray.map(
                grandchild.children,
                (leaf) => leaf.ruleId
              ),
              rounding: grandchild.rounding,
              ruleId: grandchild.ruleId,
              sourceKinds: EffectArray.map(
                grandchild.sources,
                (source) => source.kind
              ),
            })),
            ruleId: child.ruleId,
          })),
          ledger: EffectArray.map(
            report.withholdings.components,
            (component) => ({
              cents: component.amount.cents,
              effect: component.effect,
              id: component.id,
              status: component.status,
            })
          ),
          root: report.trace.ruleId,
        }).toEqual({
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

      expect(
        moneyEquals(
          report.withholdingsTotal,
          new Money({ cents: Cents.make(0), currency: "AUD" })
        )
      ).toBe(true);
      expect(
        moneyEquals(
          report.netPay,
          new Money({ cents: Cents.make(30_000), currency: "AUD" })
        )
      ).toBe(true);
    })
  );

  it.effect("Scale 1 applies when the tax-free threshold is not claimed", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: false,
      });

      // Schedule 1 Scale 1: round(0.32*1500.99 - 65.7202) = 415
      expect(
        moneyEquals(
          report.withholdingsTotal,
          new Money({ cents: Cents.make(41_500), currency: "AUD" })
        )
      ).toBe(true);
      expect(
        moneyEquals(
          report.netPay,
          new Money({ cents: Cents.make(108_500), currency: "AUD" })
        )
      ).toBe(true);

      const ledgerTrace = expectAt(report.trace.children, 0);
      const paygTrace = expectAt(ledgerTrace.children, 0);
      expect(paygTrace.inputs).toMatchObject({ scale: "scale1" });
    })
  );

  it.effect(
    "scenario layer rejects malformed input through Effect Schema",
    () =>
      Effect.gen(function* () {
        const exit = yield* CalculateTakeHomePay.pipe(
          Effect.provide(
            AuTakeHomePay2025_26_Live.pipe(
              Layer.provideMerge(
                TakeHomeScenarioLive({
                  grossPay: weekly1500,
                  taxFreeThresholdClaimed: "yes",
                })
              )
            )
          ),
          Effect.exit
        );

        expect(Exit.isFailure(exit)).toBe(true);
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

      // 3_000 fortnightly = 1_500 weekly equivalent -> $304 weekly withholding -> $608 fortnightly
      expect(
        moneyEquals(
          report.withholdingsTotal,
          new Money({ cents: Cents.make(60_800), currency: "AUD" })
        )
      ).toBe(true);
      expect(
        moneyEquals(
          report.netPay,
          new Money({ cents: Cents.make(239_200), currency: "AUD" })
        )
      ).toBe(true);
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

        // 6_500 monthly = 1_500 weekly equivalent -> $304 weekly -> round(304*13/3) = $1317 monthly
        expect(
          moneyEquals(
            report.withholdingsTotal,
            new Money({ cents: Cents.make(131_700), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.netPay,
            new Money({ cents: Cents.make(518_300), currency: "AUD" })
          )
        ).toBe(true);
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

        // Schedule 1 was last updated for 1 July 2024, so the 2024-25 and
        // 2025-26 packs currently share the same official coefficients.
        expect(
          moneyEquals(
            report.withholdingsTotal,
            new Money({ cents: Cents.make(30_400), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.netPay,
            new Money({ cents: Cents.make(119_600), currency: "AUD" })
          )
        ).toBe(true);
      })
  );
});
