import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { audDollars, moneyEquals } from "@whattax/core/primitives";
import {
  CalculateTakeHomePay,
  GrossPay,
  GrossPayFact,
  NetPayRuleId,
  PaygWithholdingComponentId,
  PaygWithholdingRuleId,
  PayWithholdingsLedgerRuleId,
  SalarySacrifice,
  SalarySacrificeFact,
  TaxFreeThresholdClaimed,
  TaxFreeThresholdClaimedFact,
  TaxablePayWithSacrificeRuleId,
  AuTakeHomePayWithSacrifice2025_26_Live,
} from "@whattax/spike-au-pay";
import {
  AuTakeHomePayWithStsl2025_26_Live,
  AuTakeHomePayWithStslAndSacrifice2025_26_Live,
  StslComponentId,
  StslComponentRuleId,
  StslDebt,
  StslDebtFact,
} from "../src/index.js";

const weekly1500 = new GrossPay({ amount: audDollars(1500), period: "weekly" });
const weekly1000 = new GrossPay({ amount: audDollars(1000), period: "weekly" });
const sacrifice300 = new SalarySacrifice({
  amount: audDollars(300),
  period: "weekly",
});
const stslEnabled = new StslDebt({ enabled: true });
const stslDisabled = new StslDebt({ enabled: false });

const stslScenario = (grossPay: GrossPay, stslDebt: StslDebt) =>
  CalculateTakeHomePay.pipe(
    Effect.provide(
      AuTakeHomePayWithStsl2025_26_Live.pipe(
        Layer.provideMerge(
          Layer.mergeAll(
            Layer.succeed(GrossPayFact)(grossPay),
            Layer.succeed(TaxFreeThresholdClaimedFact)(
              new TaxFreeThresholdClaimed({ value: true }),
            ),
            Layer.succeed(StslDebtFact)(stslDebt),
          ),
        ),
      ),
    ),
  );

const stslWithSacrificeScenario = (
  grossPay: GrossPay,
  stslDebt: StslDebt,
  sacrifice: SalarySacrifice,
) =>
  CalculateTakeHomePay.pipe(
    Effect.provide(
      AuTakeHomePayWithStslAndSacrifice2025_26_Live.pipe(
        Layer.provideMerge(
          Layer.mergeAll(
            Layer.succeed(GrossPayFact)(grossPay),
            Layer.succeed(TaxFreeThresholdClaimedFact)(
              new TaxFreeThresholdClaimed({ value: true }),
            ),
            Layer.succeed(StslDebtFact)(stslDebt),
            Layer.succeed(SalarySacrificeFact)(sacrifice),
          ),
        ),
      ),
    ),
  );

const sacrificeOnlyScenario = (grossPay: GrossPay, sacrifice: SalarySacrifice) =>
  CalculateTakeHomePay.pipe(
    Effect.provide(
      AuTakeHomePayWithSacrifice2025_26_Live.pipe(
        Layer.provideMerge(
          Layer.mergeAll(
            Layer.succeed(GrossPayFact)(grossPay),
            Layer.succeed(TaxFreeThresholdClaimedFact)(
              new TaxFreeThresholdClaimed({ value: true }),
            ),
            Layer.succeed(SalarySacrificeFact)(sacrifice),
          ),
        ),
      ),
    ),
  );

describe("spike: AU take-home pay with STSL", () => {
  it.effect("STSL active: PAYG + STSL both contribute", () =>
    Effect.gen(function* () {
      // $1500/week: PAYG = round(0.32*1500 - 180.0385) = 300, STSL = round(0.04*1500) = 60
      const report = yield* stslScenario(weekly1500, stslEnabled);

      expect(moneyEquals(report.withholdingsTotal, audDollars(360))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(1140))).toBe(true);
      expect(report.withholdings.components.length).toBe(2);
      expect(report.withholdings.components[0]!.id).toBe(
        PaygWithholdingComponentId,
      );
      expect(report.withholdings.components[0]!.status).toBe("active");
      expect(report.withholdings.components[1]!.id).toBe(StslComponentId);
      expect(report.withholdings.components[1]!.status).toBe("active");
      expect(moneyEquals(report.withholdings.components[1]!.amount, audDollars(60))).toBe(true);
    }),
  );

  it.effect("STSL zeroed: below repayment threshold appears in ledger with $0", () =>
    Effect.gen(function* () {
      // $1000/week < $1100 threshold: bracket 3 (a=0.32): round(0.32*1000 - 180.0385) = 140, STSL = 0 (zeroed)
      const report = yield* stslScenario(weekly1000, stslEnabled);

      expect(moneyEquals(report.withholdingsTotal, audDollars(140))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(860))).toBe(true);
      expect(report.withholdings.components.length).toBe(2);
      expect(report.withholdings.components[1]!.id).toBe(StslComponentId);
      expect(report.withholdings.components[1]!.status).toBe("zeroed");
    }),
  );

  it.effect("STSL disabled: component in ledger with status disabled, no net impact", () =>
    Effect.gen(function* () {
      // enabled=false: STSL component is disabled, $0, same net as PAYG-only
      const report = yield* stslScenario(weekly1500, stslDisabled);

      // PAYG only: 300, STSL: 0 (disabled, not contributing)
      expect(moneyEquals(report.withholdingsTotal, audDollars(300))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(1200))).toBe(true);
      expect(report.withholdings.components.length).toBe(2);
      expect(report.withholdings.components[1]!.id).toBe(StslComponentId);
      expect(report.withholdings.components[1]!.status).toBe("disabled");
    }),
  );

  it.effect("trace tree: NetPay → Ledger → [PAYG, STSL] → TaxablePay", () =>
    Effect.gen(function* () {
      const report = yield* stslScenario(weekly1500, stslEnabled);

      expect(report.trace.ruleId).toBe(NetPayRuleId);
      const ledgerTrace = report.trace.children[0]!;
      expect(ledgerTrace.ruleId).toBe(PayWithholdingsLedgerRuleId);
      expect(ledgerTrace.children.length).toBe(2);
      expect(ledgerTrace.children[0]!.ruleId).toBe(PaygWithholdingRuleId);
      expect(ledgerTrace.children[1]!.ruleId).toBe(StslComponentRuleId);
    }),
  );

  it.effect("+sacrifice only (no STSL): sacrifice reduces taxable pay and PAYG", () =>
    Effect.gen(function* () {
      // taxable = 1500 - 300 = 1200; PAYG = round(0.32*1200 - 180.0385) = round(203.96) = 204
      const report = yield* sacrificeOnlyScenario(weekly1500, sacrifice300);

      expect(moneyEquals(report.taxablePay, audDollars(1200))).toBe(true);
      expect(moneyEquals(report.withholdingsTotal, audDollars(204))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(1296))).toBe(true);
      expect(report.withholdings.components.length).toBe(1);

      const taxableTrace = report.trace.children[0]!.children[0]!.children[0]!;
      expect(taxableTrace.ruleId).toBe(TaxablePayWithSacrificeRuleId);
    }),
  );

  it.effect("+both: STSL + sacrifice, STSL applies to post-sacrifice taxable", () =>
    Effect.gen(function* () {
      // taxable = 1500 - 300 = 1200; PAYG = 204; STSL = round(0.04*1200) = 48; total = 252; net = 1248
      const report = yield* stslWithSacrificeScenario(
        weekly1500,
        stslEnabled,
        sacrifice300,
      );

      expect(moneyEquals(report.taxablePay, audDollars(1200))).toBe(true);
      expect(moneyEquals(report.withholdingsTotal, audDollars(252))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(1248))).toBe(true);
      expect(report.withholdings.components[0]!.id).toBe(
        PaygWithholdingComponentId,
      );
      expect(report.withholdings.components[1]!.id).toBe(StslComponentId);
      expect(moneyEquals(report.withholdings.components[1]!.amount, audDollars(48))).toBe(true);
    }),
  );
});
