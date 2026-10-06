import { describe, expect, it } from "@effect/vitest";
import { Money, Cents, moneyEquals } from "@taxkit/core/primitives";
import { TraceNode } from "@taxkit/core/trace";
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
} from "@taxkit/rules-au-pay";
import {
  AuTakeHomePayWithStsl2025_26_Live,
  AuTakeHomePayWithStslAndSacrifice2025_26_Live,
  StslComponentId,
  StslComponentRuleId,
  StslDebt,
  StslDebtFact,
} from "@taxkit/rules-au-stsl";
import { expectAt } from "@taxkit/testing";
import { Array as EffectArray, Effect, Layer, Schema } from "effect";

const weekly1500 = new GrossPay({
  amount: new Money({ cents: Cents.make(150_000), currency: "AUD" }),
  period: "weekly",
});
const weekly1800 = new GrossPay({
  amount: new Money({ cents: Cents.make(180_000), currency: "AUD" }),
  period: "weekly",
});
const weekly1000 = new GrossPay({
  amount: new Money({ cents: Cents.make(100_000), currency: "AUD" }),
  period: "weekly",
});
const sacrifice300 = new SalarySacrifice({
  amount: new Money({ cents: Cents.make(30_000), currency: "AUD" }),
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

      expect(
        moneyEquals(
          report.withholdingsTotal,
          new Money({ cents: Cents.make(33_600), currency: "AUD" })
        )
      ).toBe(true);
      expect(
        moneyEquals(
          report.netPay,
          new Money({ cents: Cents.make(116_400), currency: "AUD" })
        )
      ).toBe(true);
      expect(report.withholdings.components.length).toBe(2);
      const payg = expectAt(report.withholdings.components, 0);
      const stsl = expectAt(report.withholdings.components, 1);
      expect(payg.id).toBe(PaygWithholdingComponentId);
      expect(payg.status).toBe("active");
      expect(stsl.id).toBe(StslComponentId);
      expect(stsl.status).toBe("active");
      expect(
        moneyEquals(
          stsl.amount,
          new Money({ cents: Cents.make(3200), currency: "AUD" })
        )
      ).toBe(true);
    })
  );

  it.effect(
    "STSL zeroed: below repayment threshold appears in ledger with $0",
    () =>
      Effect.gen(function* () {
        // $1000/week: PAYG = 143, STSL = 0 (zeroed)
        const report = yield* stslScenario(weekly1000, stslEnabled);

        expect(
          moneyEquals(
            report.withholdingsTotal,
            new Money({ cents: Cents.make(14_300), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.netPay,
            new Money({ cents: Cents.make(85_700), currency: "AUD" })
          )
        ).toBe(true);
        expect(report.withholdings.components.length).toBe(2);
        const stsl = expectAt(report.withholdings.components, 1);
        expect(stsl.id).toBe(StslComponentId);
        expect(stsl.status).toBe("zeroed");
      })
  );

  it.effect(
    "STSL disabled: component in ledger with status disabled, no net impact",
    () =>
      Effect.gen(function* () {
        // enabled=false: STSL component is disabled, $0, same net as PAYG-only
        const report = yield* stslScenario(weekly1500, stslDisabled);

        // PAYG only: 304, STSL: 0 (disabled, not contributing)
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
        expect(report.withholdings.components.length).toBe(2);
        const stsl = expectAt(report.withholdings.components, 1);
        expect(stsl.id).toBe(StslComponentId);
        expect(stsl.status).toBe("disabled");
      })
  );

  it.effect("trace tree: NetPay -> Ledger -> [PAYG, STSL] -> TaxablePay", () =>
    Effect.gen(function* () {
      const report = yield* stslScenario(weekly1500, stslEnabled);

      expect(report.trace.ruleId).toBe(NetPayRuleId);
      const ledgerTrace = expectAt(report.trace.children, 0);
      expect(ledgerTrace.ruleId).toBe(PayWithholdingsLedgerRuleId);
      expect(ledgerTrace.children.length).toBe(2);
      expect(expectAt(ledgerTrace.children, 0).ruleId).toBe(
        PaygWithholdingRuleId
      );
      expect(expectAt(ledgerTrace.children, 1).ruleId).toBe(
        StslComponentRuleId
      );
    })
  );

  it.effect("trace and ledger snapshot: PAYG plus STSL explanation order", () =>
    Effect.gen(function* () {
      const report = yield* stslScenario(weekly1500, stslEnabled);
      const encodedTrace = yield* Schema.encodeEffect(TraceNode)(report.trace);

      expect({
        ledger: EffectArray.map(
          report.withholdings.components,
          (component) => ({
            cents: component.amount.cents,
            id: component.id,
            status: component.status,
          })
        ),
        ledgerChildren: EffectArray.map(
          expectAt(encodedTrace.children, 0).children,
          (child) => ({
            rounding: child.rounding,
            ruleId: child.ruleId,
            sourceKinds: EffectArray.map(
              child.sources,
              (source) => source.kind
            ),
          })
        ),
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
        // taxable = 1_500 - 300 = 1_200; PAYG = round(0.3227*1200.99 - 180.0385) = 208
        const report = yield* sacrificeOnlyScenario(weekly1500, sacrifice300);

        expect(
          moneyEquals(
            report.taxablePay,
            new Money({ cents: Cents.make(120_000), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.withholdingsTotal,
            new Money({ cents: Cents.make(20_800), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.netPay,
            new Money({ cents: Cents.make(129_200), currency: "AUD" })
          )
        ).toBe(true);
        expect(report.withholdings.components.length).toBe(1);

        const ledgerTrace = expectAt(report.trace.children, 0);
        const paygTrace = expectAt(ledgerTrace.children, 0);
        const taxableTrace = expectAt(paygTrace.children, 0);
        expect(taxableTrace.ruleId).toBe(TaxablePayWithSacrificeRuleId);
      })
  );

  it.effect(
    "+both: STSL + sacrifice, STSL applies to post-sacrifice taxable",
    () =>
      Effect.gen(function* () {
        // taxable = 1_800 - 300 = 1_500; PAYG = 304; STSL = 32; total = 336; net = 1_464
        const report = yield* stslWithSacrificeScenario(
          weekly1800,
          stslEnabled,
          sacrifice300
        );

        expect(
          moneyEquals(
            report.taxablePay,
            new Money({ cents: Cents.make(150_000), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.withholdingsTotal,
            new Money({ cents: Cents.make(33_600), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.netPay,
            new Money({ cents: Cents.make(146_400), currency: "AUD" })
          )
        ).toBe(true);
        const payg = expectAt(report.withholdings.components, 0);
        const stsl = expectAt(report.withholdings.components, 1);
        expect(payg.id).toBe(PaygWithholdingComponentId);
        expect(stsl.id).toBe(StslComponentId);
        expect(
          moneyEquals(
            stsl.amount,
            new Money({ cents: Cents.make(3200), currency: "AUD" })
          )
        ).toBe(true);
      })
  );

  it.effect(
    "monthly period: PAYG and STSL both use nearest-dollar monthly conversion",
    () =>
      Effect.gen(function* () {
        const report = yield* stslScenario(
          new GrossPay({
            amount: new Money({ cents: Cents.make(650_000), currency: "AUD" }),
            period: "monthly",
          }),
          stslEnabled
        );

        // 6_500 monthly = 1_500 weekly equivalent. PAYG: round(304*13/3)=1317.
        // STSL: weekly component 32, monthly round(32*13/3)=139.
        expect(
          moneyEquals(
            report.withholdingsTotal,
            new Money({ cents: Cents.make(145_600), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.netPay,
            new Money({ cents: Cents.make(504_400), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            expectAt(report.withholdings.components, 0).amount,
            new Money({ cents: Cents.make(131_700), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            expectAt(report.withholdings.components, 1).amount,
            new Money({ cents: Cents.make(13_900), currency: "AUD" })
          )
        ).toBe(true);
      })
  );

  it.effect(
    "STSL highest official row remains active at high weekly income",
    () =>
      Effect.gen(function* () {
        const report = yield* stslScenario(
          new GrossPay({
            amount: new Money({ cents: Cents.make(350_000), currency: "AUD" }),
            period: "weekly",
          }),
          stslEnabled
        );

        // Schedule 8 final row: round(0.10*3500.99) = 350.
        expect(
          moneyEquals(
            expectAt(report.withholdings.components, 1).amount,
            new Money({ cents: Cents.make(35_000), currency: "AUD" })
          )
        ).toBe(true);
        expect(expectAt(report.withholdings.components, 1).status).toBe(
          "active"
        );
      })
  );
});
