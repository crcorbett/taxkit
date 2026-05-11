import { describe, expect, it } from "@effect/vitest";
import { Effect, Exit, Layer } from "effect";
import { aud, audDollars, moneyEquals } from "@whattax/core/primitives";
import {
  AuTakeHomePay2024_25_Live,
  AuTakeHomePay2025_26_Live,
  CalculateTakeHomePay,
  GrossPay,
  NetPayRuleId,
  PaygWithholdingComponentId,
  PaygWithholdingRuleId,
  PayWithholdingsLedgerRuleId,
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

describe("AU take-home pay calculator (2025-26 rule pack)", () => {
  it.effect("golden case: $1500 weekly, TFN claimed", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });

      // x = 1500.99
      // bracket: a=0.32, b=176.5769 -> round(0.32*1500.99 - 176.5769) = 304
      // net = 1500 - 304 = 1196
      expect(moneyEquals(report.withholdingsTotal, audDollars(304))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(1196))).toBe(true);
      expect(report.period).toBe("weekly");
    }),
  );

  it.effect("trace tree shape: NetPay -> Ledger -> PAYG component -> TaxablePay", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });

      expect(report.trace.ruleId).toBe(NetPayRuleId);
      expect(report.trace.children.length).toBe(1);

      const ledgerTrace = report.trace.children[0]!;
      expect(ledgerTrace.ruleId).toBe(PayWithholdingsLedgerRuleId);
      expect(ledgerTrace.children.length).toBe(1);

      const paygTrace = ledgerTrace.children[0]!;
      expect(paygTrace.ruleId).toBe(PaygWithholdingRuleId);
      expect(paygTrace.rounding).toBe("ato-withholding-rounding");
      expect(paygTrace.sources.length).toBe(1);
      expect(paygTrace.sources[0]!.kind).toBe("ato-publication");

      const taxableTrace = paygTrace.children[0]!;
      expect(taxableTrace.ruleId).toBe(TaxablePayRuleId);

      // ledger surfaces the active PAYG component
      expect(report.withholdings.components.length).toBe(1);
      expect(report.withholdings.components[0]!.id).toBe(
        PaygWithholdingComponentId,
      );
      expect(report.withholdings.components[0]!.status).toBe("active");
      expect(report.withholdings.components[0]!.effect).toBe("additive");
    }),
  );

  it.effect("trace and ledger snapshot: PAYG-only explanation order and sources", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });

      expect({
        root: report.trace.ruleId,
        explanationOrder: report.trace.children.map((child) => ({
          ruleId: child.ruleId,
          children: child.children.map((grandchild) => ({
            ruleId: grandchild.ruleId,
            rounding: grandchild.rounding,
            sourceKinds: grandchild.sources.map((source) => source.kind),
            children: grandchild.children.map((leaf) => leaf.ruleId),
          })),
        })),
        ledger: report.withholdings.components.map((component) => ({
          id: component.id,
          effect: component.effect,
          status: component.status,
          cents: component.amount.cents,
        })),
      }).toEqual({
        root: NetPayRuleId,
        explanationOrder: [
          {
            ruleId: PayWithholdingsLedgerRuleId,
            children: [
              {
                ruleId: PaygWithholdingRuleId,
                rounding: "ato-withholding-rounding",
                sourceKinds: ["ato-publication"],
                children: [TaxablePayRuleId],
              },
            ],
          },
        ],
        ledger: [
          {
            id: PaygWithholdingComponentId,
            effect: "additive",
            status: "active",
            cents: 30_400,
          },
        ],
      });
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

      expect(moneyEquals(report.withholdingsTotal, aud(0))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(300))).toBe(true);
    }),
  );

  it.effect("Scale 1 applies when the tax-free threshold is not claimed", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: false,
      });

      // Schedule 1 Scale 1: round(0.32*1500.99 - 65.7202) = 415
      expect(moneyEquals(report.withholdingsTotal, audDollars(415))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(1085))).toBe(true);

      const paygTrace = report.trace.children[0]!.children[0]!;
      expect(paygTrace.inputs).toMatchObject({ scale: "scale1" });
    }),
  );

  it.effect("scenario layer rejects malformed input through Effect Schema", () =>
    Effect.gen(function* () {
      const exit = yield* CalculateTakeHomePay.pipe(
        Effect.provide(
          AuTakeHomePay2025_26_Live.pipe(
            Layer.provideMerge(
              TakeHomeScenarioLive({
                grossPay: weekly1500,
                taxFreeThresholdClaimed: "yes",
              }),
            ),
          ),
        ),
        Effect.exit,
      );

      expect(Exit.isFailure(exit)).toBe(true);
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

      // 3000 fortnightly = 1500 weekly equivalent -> $304 weekly withholding -> $608 fortnightly
      expect(moneyEquals(report.withholdingsTotal, audDollars(608))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(2392))).toBe(true);
    }),
  );

  it.effect("monthly period: rounds the converted monthly withholding to dollars", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2025_26_Live, {
        grossPay: new GrossPay({
          amount: audDollars(6500),
          period: "monthly",
        }),
        taxFreeThresholdClaimed: true,
      });

      // 6500 monthly = 1500 weekly equivalent -> $304 weekly -> round(304*13/3) = $1317 monthly
      expect(moneyEquals(report.withholdingsTotal, audDollars(1317))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(5183))).toBe(true);
    }),
  );
});

describe("AU take-home pay calculator (2024-25 rule pack)", () => {
  it.effect("uses the official Schedule 1 coefficients for the 2024-25 pack", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(AuTakeHomePay2024_25_Live, {
        grossPay: weekly1500,
        taxFreeThresholdClaimed: true,
      });

      // Schedule 1 was last updated for 1 July 2024, so the 2024-25 and
      // 2025-26 packs currently share the same official coefficients.
      expect(moneyEquals(report.withholdingsTotal, audDollars(304))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(1196))).toBe(true);
    }),
  );
});
