import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
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

describe("spike: AU annual income tax calculator (2025-26)", () => {
  it.effect("high income $80k: all three components, LITO zeroed", () =>
    Effect.gen(function* () {
      // Income tax:  $5,092 + 0.325 × (80,000 − 45,000) = $16,467
      // LITO:        $0  (income > $66,667 — zeroed)
      // Medicare:    0.02 × $80,000 = $1,600
      // Liability:   $16,467 + $1,600 = $18,067
      const report = yield* runScenario(80_000);

      expect(moneyEquals(report.liability, audDollars(18_067))).toBe(true);
      expect(moneyEquals(report.rawLiability, audDollars(18_067))).toBe(true);

      const [incomeTax, lito, medicare] = report.ledger.components;
      expect(moneyEquals(incomeTax!.amount, audDollars(16_467))).toBe(true);
      expect(incomeTax!.effect).toBe("additive");
      expect(incomeTax!.status).toBe("active");

      // LITO is zeroed — $66,667+ phase-out ceiling reached
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
      // Income tax:  $5,092 + 0.325 × (50,000 − 45,000) = $6,717
      // LITO:        $325 − 0.015 × (50,000 − 45,000) = $250  (subtractive, active)
      // Medicare:    0.02 × $50,000 = $1,000
      // Liability:   $6,717 − $250 + $1,000 = $7,467
      const report = yield* runScenario(50_000);

      expect(moneyEquals(report.liability, audDollars(7_467))).toBe(true);
      expect(moneyEquals(report.rawLiability, audDollars(7_467))).toBe(true);

      const [, lito] = report.ledger.components;
      expect(moneyEquals(lito!.amount, audDollars(250))).toBe(true);
      expect(lito!.effect).toBe("subtractive");
      expect(lito!.status).toBe("active");
    }),
  );

  it.effect("low income $30k: full LITO, Medicare shade-in", () =>
    Effect.gen(function* () {
      // Income tax:  0.19 × (30,000 − 18,200) = $2,242
      // LITO:        $700 (full, flat — income ≤ $37,500)
      // Medicare:    0.10 × (30,000 − 26,000) = $400  (shade-in)
      // Liability:   $2,242 − $700 + $400 = $1,942
      const report = yield* runScenario(30_000);

      expect(moneyEquals(report.liability, audDollars(1_942))).toBe(true);

      const [incomeTax, lito, medicare] = report.ledger.components;
      expect(moneyEquals(incomeTax!.amount, audDollars(2_242))).toBe(true);
      expect(moneyEquals(lito!.amount, audDollars(700))).toBe(true);
      expect(lito!.status).toBe("active");
      expect(moneyEquals(medicare!.amount, audDollars(400))).toBe(true);
      expect(medicare!.status).toBe("active");
    }),
  );

  it.effect("very low income $20k: LITO exceeds income tax — liability floors to $0", () =>
    Effect.gen(function* () {
      // Income tax:  0.19 × (20,000 − 18,200) = $342
      // LITO:        $700 (full) — subtracts more than income tax
      // Medicare:    $0 (income < $26,000 threshold — zeroed)
      // Raw:         $342 − $700 = −$358
      // Floored:     $0
      const report = yield* runScenario(20_000);

      expect(moneyEquals(report.rawLiability, aud(-35_800))).toBe(true);
      expect(moneyEquals(report.liability, aud(0))).toBe(true);

      const [incomeTax, lito, medicare] = report.ledger.components;
      expect(moneyEquals(incomeTax!.amount, audDollars(342))).toBe(true);
      expect(lito!.status).toBe("active"); // LITO is genuinely active, floor is the report's job
      expect(medicare!.status).toBe("zeroed");
    }),
  );

  it.effect("below income tax threshold $15k: no tax, LITO active, liability $0", () =>
    Effect.gen(function* () {
      // Income tax:  $0 (income ≤ $18,200 — nil bracket)
      // LITO:        $700 (income ≤ $37,500 — but income tax is $0)
      // Medicare:    $0 (below threshold)
      // Raw:         0 − $700 = −$700
      // Floored:     $0
      const report = yield* runScenario(15_000);

      expect(moneyEquals(report.rawLiability, aud(-70_000))).toBe(true);
      expect(moneyEquals(report.liability, aud(0))).toBe(true);

      const [incomeTax, lito] = report.ledger.components;
      expect(moneyEquals(incomeTax!.amount, aud(0))).toBe(true);
      expect(incomeTax!.status).toBe("active"); // nil bracket is still active — rate happens to be 0
      expect(moneyEquals(lito!.amount, audDollars(700))).toBe(true);
      expect(lito!.status).toBe("active");
    }),
  );

  it.effect("trace tree shape: Ledger → [IncomeTax, LITO, MedicareLevy]", () =>
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
});
