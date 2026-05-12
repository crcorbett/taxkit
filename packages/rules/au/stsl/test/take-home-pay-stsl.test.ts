import { describe, expect, it } from "@effect/vitest";
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
} from "@whattax/rules-au-pay";
import {
  AuTakeHomePayWithStsl2025_26_Live,
  AuTakeHomePayWithStslAndSacrifice2025_26_Live,
  StslComponentId,
  StslComponentRuleId,
  StslDebt,
  StslDebtFact,
} from "@whattax/rules-au-stsl";
import { Effect, Layer } from "effect";

const weekly1500 = new GrossPay({ amount: audDollars(1500), period: "weekly" });
const weekly1800 = new GrossPay({ amount: audDollars(1800), period: "weekly" });
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
              new TaxFreeThresholdClaimed({ value: true })
            ),
            Layer.succeed(StslDebtFact)(stslDebt)
          )
        )
      )
    )
  );

const stslWithSacrificeScenario = (
  grossPay: GrossPay,
  stslDebt: StslDebt,
  sacrifice: SalarySacrifice
) =>
  CalculateTakeHomePay.pipe(
    Effect.provide(
      AuTakeHomePayWithStslAndSacrifice2025_26_Live.pipe(
        Layer.provideMerge(
          Layer.mergeAll(
            Layer.succeed(GrossPayFact)(grossPay),
            Layer.succeed(TaxFreeThresholdClaimedFact)(
              new TaxFreeThresholdClaimed({ value: true })
            ),
            Layer.succeed(StslDebtFact)(stslDebt),
            Layer.succeed(SalarySacrificeFact)(sacrifice)
          )
        )
      )
    )
  );

const sacrificeOnlyScenario = (
  grossPay: GrossPay,
  sacrifice: SalarySacrifice
) =>
  CalculateTakeHomePay.pipe(
    Effect.provide(
      AuTakeHomePayWithSacrifice2025_26_Live.pipe(
        Layer.provideMerge(
          Layer.mergeAll(
            Layer.succeed(GrossPayFact)(grossPay),
            Layer.succeed(TaxFreeThresholdClaimedFact)(
              new TaxFreeThresholdClaimed({ value: true })
            ),
            Layer.succeed(SalarySacrificeFact)(sacrifice)
          )
        )
      )
    )
  );

describe("AU take-home pay with STSL", () => {
  it.effect("STSL active: PAYG + STSL both contribute", () =>
    Effect.gen(function* () {
      // $1500/week: PAYG = 304, STSL = round(0.15*1500.99 - 193.2692) = 32
      const report = yield* stslScenario(weekly1500, stslEnabled);

      expect(moneyEquals(report.withholdingsTotal, audDollars(336))).toBe(true);
      expect(moneyEquals(report.netPay, audDollars(1164))).toBe(true);
      expect(report.withholdings.components.length).toBe(2);
      expect(report.withholdings.components[0]!.id).toBe(
        PaygWithholdingComponentId
      );
      expect(report.withholdings.components[0]!.status).toBe("active");
      expect(report.withholdings.components[1]!.id).toBe(StslComponentId);
      expect(report.withholdings.components[1]!.status).toBe("active");
      expect(
        moneyEquals(report.withholdings.components[1]!.amount, audDollars(32))
      ).toBe(true);
    })
  );

  it.effect(
    "STSL zeroed: below repayment threshold appears in ledger with $0",
    () =>
      Effect.gen(function* () {
        // $1000/week: PAYG = 143, STSL = 0 (zeroed)
        const report = yield* stslScenario(weekly1000, stslEnabled);

        expect(moneyEquals(report.withholdingsTotal, audDollars(143))).toBe(
          true
        );
        expect(moneyEquals(report.netPay, audDollars(857))).toBe(true);
        expect(report.withholdings.components.length).toBe(2);
        expect(report.withholdings.components[1]!.id).toBe(StslComponentId);
        expect(report.withholdings.components[1]!.status).toBe("zeroed");
      })
  );

  it.effect(
    "STSL disabled: component in ledger with status disabled, no net impact",
    () =>
      Effect.gen(function* () {
        // enabled=false: STSL component is disabled, $0, same net as PAYG-only
        const report = yield* stslScenario(weekly1500, stslDisabled);

        // PAYG only: 304, STSL: 0 (disabled, not contributing)
        expect(moneyEquals(report.withholdingsTotal, audDollars(304))).toBe(
          true
        );
        expect(moneyEquals(report.netPay, audDollars(1196))).toBe(true);
        expect(report.withholdings.components.length).toBe(2);
        expect(report.withholdings.components[1]!.id).toBe(StslComponentId);
        expect(report.withholdings.components[1]!.status).toBe("disabled");
      })
  );

  it.effect("trace tree: NetPay -> Ledger -> [PAYG, STSL] -> TaxablePay", () =>
    Effect.gen(function* () {
      const report = yield* stslScenario(weekly1500, stslEnabled);

      expect(report.trace.ruleId).toBe(NetPayRuleId);
      const ledgerTrace = report.trace.children[0]!;
      expect(ledgerTrace.ruleId).toBe(PayWithholdingsLedgerRuleId);
      expect(ledgerTrace.children.length).toBe(2);
      expect(ledgerTrace.children[0]!.ruleId).toBe(PaygWithholdingRuleId);
      expect(ledgerTrace.children[1]!.ruleId).toBe(StslComponentRuleId);
    })
  );

  it.effect("trace and ledger snapshot: PAYG plus STSL explanation order", () =>
    Effect.gen(function* () {
      const report = yield* stslScenario(weekly1500, stslEnabled);

      expect({
        ledger: report.withholdings.components.map((component) => ({
          cents: component.amount.cents,
          id: component.id,
          status: component.status,
        })),
        ledgerChildren: report.trace.children[0]!.children.map((child) => ({
          rounding: child.rounding,
          ruleId: child.ruleId,
          sourceKinds: child.sources.map((source) => source.kind),
        })),
        root: report.trace.ruleId,
      }).toEqual({
        ledger: [
          {
            cents: 30_400,
            id: PaygWithholdingComponentId,
            status: "active",
          },
          {
            cents: 3200,
            id: StslComponentId,
            status: "active",
          },
        ],
        ledgerChildren: [
          {
            rounding: "ato-withholding-rounding",
            ruleId: PaygWithholdingRuleId,
            sourceKinds: ["ato-publication"],
          },
          {
            rounding: "ato-withholding-rounding",
            ruleId: StslComponentRuleId,
            sourceKinds: ["ato-publication"],
          },
        ],
        root: NetPayRuleId,
      });
    })
  );

  it.effect(
    "+sacrifice only (no STSL): sacrifice reduces taxable pay and PAYG",
    () =>
      Effect.gen(function* () {
        // taxable = 1500 - 300 = 1200; PAYG = round(0.3227*1200.99 - 180.0385) = 208
        const report = yield* sacrificeOnlyScenario(weekly1500, sacrifice300);

        expect(moneyEquals(report.taxablePay, audDollars(1200))).toBe(true);
        expect(moneyEquals(report.withholdingsTotal, audDollars(208))).toBe(
          true
        );
        expect(moneyEquals(report.netPay, audDollars(1292))).toBe(true);
        expect(report.withholdings.components.length).toBe(1);

        const taxableTrace =
          report.trace.children[0]!.children[0]!.children[0]!;
        expect(taxableTrace.ruleId).toBe(TaxablePayWithSacrificeRuleId);
      })
  );

  it.effect(
    "+both: STSL + sacrifice, STSL applies to post-sacrifice taxable",
    () =>
      Effect.gen(function* () {
        // taxable = 1800 - 300 = 1500; PAYG = 304; STSL = 32; total = 336; net = 1464
        const report = yield* stslWithSacrificeScenario(
          weekly1800,
          stslEnabled,
          sacrifice300
        );

        expect(moneyEquals(report.taxablePay, audDollars(1500))).toBe(true);
        expect(moneyEquals(report.withholdingsTotal, audDollars(336))).toBe(
          true
        );
        expect(moneyEquals(report.netPay, audDollars(1464))).toBe(true);
        expect(report.withholdings.components[0]!.id).toBe(
          PaygWithholdingComponentId
        );
        expect(report.withholdings.components[1]!.id).toBe(StslComponentId);
        expect(
          moneyEquals(report.withholdings.components[1]!.amount, audDollars(32))
        ).toBe(true);
      })
  );

  it.effect(
    "monthly period: PAYG and STSL both use nearest-dollar monthly conversion",
    () =>
      Effect.gen(function* () {
        const report = yield* stslScenario(
          new GrossPay({ amount: audDollars(6500), period: "monthly" }),
          stslEnabled
        );

        // 6500 monthly = 1500 weekly equivalent. PAYG: round(304*13/3)=1317.
        // STSL: weekly component 32, monthly round(32*13/3)=139.
        expect(moneyEquals(report.withholdingsTotal, audDollars(1456))).toBe(
          true
        );
        expect(moneyEquals(report.netPay, audDollars(5044))).toBe(true);
        expect(
          moneyEquals(
            report.withholdings.components[0]!.amount,
            audDollars(1317)
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.withholdings.components[1]!.amount,
            audDollars(139)
          )
        ).toBe(true);
      })
  );

  it.effect(
    "STSL highest official row remains active at high weekly income",
    () =>
      Effect.gen(function* () {
        const report = yield* stslScenario(
          new GrossPay({ amount: audDollars(3500), period: "weekly" }),
          stslEnabled
        );

        // Schedule 8 final row: round(0.10*3500.99) = 350.
        expect(
          moneyEquals(
            report.withholdings.components[1]!.amount,
            audDollars(350)
          )
        ).toBe(true);
        expect(report.withholdings.components[1]!.status).toBe("active");
      })
  );
});
