import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { aud, audDollars, moneyEquals } from "@whattax/core/primitives";
import {
  AuTakeHomePay2024_25_Live,
  AuTakeHomePay2025_26_Live,
  CalculateTakeHomePay,
  GrossPay,
  NetPayRuleId,
  PaygWithholdingRuleId,
  TakeHomeScenarioLive,
  TaxablePayRuleId,
  type TakeHomeScenarioInput,
} from "../src/index.js";

const runScenario = (
  pack:
    | typeof AuTakeHomePay2025_26_Live
    | typeof AuTakeHomePay2024_25_Live,
  input: TakeHomeScenarioInput,
) =>
  CalculateTakeHomePay.pipe(
    Effect.provide(pack.pipe(Layer.provideMerge(TakeHomeScenarioLive(input)))),
  );

const weekly1500 = new GrossPay({ amount: audDollars(1500), period: "weekly" });

describe("spike: AU take-home pay calculator (2025-26 rule pack)", () => {
  it.effect("golden case: $1500 weekly, TFN claimed", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });

      // weekly = 1500
      // bracket 3: a=0.32, b=180.0385  -> round(0.32*1500 - 180.0385) = round(299.9615) = 300
      // net = 1500 - 300 = 1200
      expect(moneyEquals(report.paygWithheld, audDollars(300))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(1200))).toBe(true);
      expect(report.period).toBe("weekly");
    }),
  );

  it.effect("trace tree shape: NetPay -> PAYG -> TaxablePay", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });

      expect(report.trace.ruleId).toBe(NetPayRuleId);
      expect(report.trace.children.length).toBe(1);

      const paygTrace = report.trace.children[0]!;
      expect(paygTrace.ruleId).toBe(PaygWithholdingRuleId);
      expect(paygTrace.rounding).toBe("ato-withholding-rounding");
      expect(paygTrace.sources.length).toBe(1);
      expect(paygTrace.sources[0]!.reference).toBe("spike-fixture/2025-26");

      const taxableTrace = paygTrace.children[0]!;
      expect(taxableTrace.ruleId).toBe(TaxablePayRuleId);
    }),
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

      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }),
  );

  it.effect("zero withholding under tax-free threshold", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: new GrossPay({
          amount: audDollars(300),
          period: "weekly",
        }),
        taxFreeThresholdClaimed: true,
      });

      expect(moneyEquals(report.paygWithheld, aud(0))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(300))).toBe(true);
    }),
  );

  it.effect("fortnightly period: weekly-equivalent formula", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: new GrossPay({
          amount: audDollars(3000),
          period: "fortnightly",
        }),
        taxFreeThresholdClaimed: true,
      });

      // 3000 fortnightly = 1500 weekly equivalent -> $300 weekly withholding -> $600 fortnightly
      expect(moneyEquals(report.paygWithheld, audDollars(600))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(2400))).toBe(true);
    }),
  );
});

describe("spike: AU take-home pay calculator (2024-25 rule pack)", () => {
  it.effect("parameter swap changes withholding deterministically", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2024_25_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });

      // 2024-25 single bracket above threshold: a=0.18, b=64
      // round(0.18 * 1500 - 64) = round(206) = 206
      expect(moneyEquals(report.paygWithheld, audDollars(206))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(1294))).toBe(true);
    }),
  );
});
