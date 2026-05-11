import { describe, expect, it } from "@effect/vitest";
import { Effect, Exit, Layer } from "effect";
import { aud, audDollars, moneyEquals } from "@whattax/core/primitives";
import {
  AnnualTaxLedgerRuleId,
  AnnualTaxScenarioLive,
  AuAnnualTax2025_26_Live,
  CalculateAnnualTax,
  IncomeTaxComponentId,
  IncomeTaxRuleId,
  LitoComponentId,
  LitoRuleId,
  MedicareLevyComponentId,
  MedicareLevyRuleId,
} from "../src/index.js";

const runScenario = (incomeDollars: number) =>
  CalculateAnnualTax.pipe(
    Effect.provide(
      AuAnnualTax2025_26_Live.pipe(
        Layer.provideMerge(
          AnnualTaxScenarioLive({ taxableIncome: audDollars(incomeDollars) }),
        ),
      ),
    ),
  );

describe("AU annual income tax calculator (2025-26)", () => {
  it.effect("high income $80k: all three components, LITO zeroed", () =>
    Effect.gen(function* () {
      // Income tax:  $4,288 + 0.30 x (80,000 - 45,000) = $14,788
      // LITO:        $0  (income > $66,667 - zeroed)
      // Medicare:    0.02 x $80,000 = $1,600
      // Liability:   $14,788 + $1,600 = $16,388
      const report = yield* runScenario(80_000);

      expect(moneyEquals(report.liability, audDollars(16_388))).toBe(true);
      expect(moneyEquals(report.rawLiability, audDollars(16_388))).toBe(true);

      const [incomeTax, lito, medicare] = report.ledger.components;
      expect(moneyEquals(incomeTax!.amount, audDollars(14_788))).toBe(true);
      expect(incomeTax!.effect).toBe("additive");
      expect(incomeTax!.status).toBe("active");

      // LITO is zeroed once the phase-out ceiling is reached.
      expect(moneyEquals(lito!.amount, aud(0))).toBe(true);
      expect(lito!.effect).toBe("subtractive");
      expect(lito!.status).toBe("zeroed");

      expect(moneyEquals(medicare!.amount, audDollars(1_600))).toBe(true);
      expect(medicare!.effect).toBe("additive");
      expect(medicare!.status).toBe("active");
    }),
  );

  it.effect("mid income $50k: partial LITO reduces liability", () =>
    Effect.gen(function* () {
      // Income tax:  $4,288 + 0.30 x (50,000 - 45,000) = $5,788
      // LITO:        $325 - 0.015 x (50,000 - 45,000) = $250
      // Medicare:    0.02 x $50,000 = $1,000
      // Liability:   $5,788 - $250 + $1,000 = $6,538
      const report = yield* runScenario(50_000);

      expect(moneyEquals(report.liability, audDollars(6_538))).toBe(true);
      expect(moneyEquals(report.rawLiability, audDollars(6_538))).toBe(true);

      const [, lito] = report.ledger.components;
      expect(moneyEquals(lito!.amount, audDollars(250))).toBe(true);
      expect(lito!.effect).toBe("subtractive");
      expect(lito!.status).toBe("active");
    }),
  );

  it.effect("low income $30k: full LITO, Medicare shade-in", () =>
    Effect.gen(function* () {
      // Income tax:  0.16 x (30,000 - 18,200) = $1,888
      // LITO:        $700 (full, flat - income <= $37,500)
      // Medicare:    0.10 x (30,000 - 27,222) = $277.80
      // Liability:   $1,888 - $700 + $277.80 = $1,465.80
      const report = yield* runScenario(30_000);

      expect(moneyEquals(report.liability, aud(146_580))).toBe(true);

      const [incomeTax, lito, medicare] = report.ledger.components;
      expect(moneyEquals(incomeTax!.amount, audDollars(1_888))).toBe(true);
      expect(moneyEquals(lito!.amount, audDollars(700))).toBe(true);
      expect(lito!.status).toBe("active");
      expect(moneyEquals(medicare!.amount, aud(27_780))).toBe(true);
      expect(medicare!.status).toBe("active");
    }),
  );

  it.effect("very low income $20k: LITO exceeds income tax - liability floors to $0", () =>
    Effect.gen(function* () {
      // Income tax:  0.16 x (20,000 - 18,200) = $288
      // LITO:        $700 (full) - subtracts more than income tax
      // Medicare:    $0 (income < $27,222 threshold - zeroed)
      // Raw:         $288 - $700 = -$412
      // Floored:     $0
      const report = yield* runScenario(20_000);

      expect(moneyEquals(report.rawLiability, aud(-41_200))).toBe(true);
      expect(moneyEquals(report.liability, aud(0))).toBe(true);

      const [incomeTax, lito, medicare] = report.ledger.components;
      expect(moneyEquals(incomeTax!.amount, audDollars(288))).toBe(true);
      expect(lito!.status).toBe("active"); // LITO is active; the report applies the liability floor.
      expect(medicare!.status).toBe("zeroed");
    }),
  );

  it.effect("below income tax threshold $15k: no tax, LITO active, liability $0", () =>
    Effect.gen(function* () {
      // Income tax:  $0 (income <= $18,200 - nil bracket)
      // LITO:        $700 (income <= $37,500, but income tax is $0)
      // Medicare:    $0 (below threshold)
      // Raw:         0 - $700 = -$700
      // Floored:     $0
      const report = yield* runScenario(15_000);

      expect(moneyEquals(report.rawLiability, aud(-70_000))).toBe(true);
      expect(moneyEquals(report.liability, aud(0))).toBe(true);

      const [incomeTax, lito] = report.ledger.components;
      expect(moneyEquals(incomeTax!.amount, aud(0))).toBe(true);
      expect(incomeTax!.status).toBe("active"); // Nil bracket is active; the rate happens to be 0.
      expect(moneyEquals(lito!.amount, audDollars(700))).toBe(true);
      expect(lito!.status).toBe("active");
    }),
  );

  it.effect("scenario layer rejects malformed input through Effect Schema", () =>
    Effect.gen(function* () {
      const exit = yield* CalculateAnnualTax.pipe(
        Effect.provide(
          AuAnnualTax2025_26_Live.pipe(
            Layer.provideMerge(
              AnnualTaxScenarioLive({ taxableIncome: "80000" }),
            ),
          ),
        ),
        Effect.exit,
      );

      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );

  it.effect("trace tree shape: Ledger -> [IncomeTax, LITO, MedicareLevy]", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(80_000);

      expect(report.trace.ruleId).toBe(AnnualTaxLedgerRuleId);
      expect(report.trace.children.length).toBe(3);
      expect(report.trace.children[0]!.ruleId).toBe(IncomeTaxRuleId);
      expect(report.trace.children[1]!.ruleId).toBe(LitoRuleId);
      expect(report.trace.children[2]!.ruleId).toBe(MedicareLevyRuleId);

      const [incomeTax, lito, medicare] = report.ledger.components;
      expect(incomeTax!.id).toBe(IncomeTaxComponentId);
      expect(lito!.id).toBe(LitoComponentId);
      expect(medicare!.id).toBe(MedicareLevyComponentId);
    }),
  );

  it.effect("income tax and LITO boundary values stay on the intended brackets", () =>
    Effect.gen(function* () {
      const taxFreeThreshold = yield* runScenario(18_200);
      expect(moneyEquals(taxFreeThreshold.ledger.components[0]!.amount, aud(0))).toBe(true);
      expect(moneyEquals(taxFreeThreshold.ledger.components[1]!.amount, audDollars(700))).toBe(true);
      expect(moneyEquals(taxFreeThreshold.liability, aud(0))).toBe(true);

      const litoFirstPhaseEnd = yield* runScenario(45_000);
      expect(moneyEquals(litoFirstPhaseEnd.ledger.components[0]!.amount, audDollars(4288))).toBe(true);
      expect(moneyEquals(litoFirstPhaseEnd.ledger.components[1]!.amount, audDollars(325))).toBe(true);

      const litoCeiling = yield* runScenario(66_667);
      expect(moneyEquals(litoCeiling.ledger.components[1]!.amount, aud(0))).toBe(true);
      expect(litoCeiling.ledger.components[1]!.status).toBe("zeroed");
    }),
  );

  it.effect("Medicare threshold, shade-in, and full-rate boundary behavior", () =>
    Effect.gen(function* () {
      const belowThreshold = yield* runScenario(27_222);
      expect(moneyEquals(belowThreshold.ledger.components[2]!.amount, aud(0))).toBe(true);
      expect(belowThreshold.ledger.components[2]!.status).toBe("zeroed");

      const shadeInBoundary = yield* runScenario(34_027);
      expect(moneyEquals(shadeInBoundary.ledger.components[2]!.amount, aud(68_050))).toBe(true);
      expect(shadeInBoundary.ledger.components[2]!.status).toBe("active");

      const fullRate = yield* runScenario(34_028);
      expect(moneyEquals(fullRate.ledger.components[2]!.amount, aud(68_056))).toBe(true);
      expect(fullRate.ledger.components[2]!.status).toBe("active");
    }),
  );
});
