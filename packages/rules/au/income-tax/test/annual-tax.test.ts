import { describe, expect, it } from "@effect/vitest";
import { CalculationEngine, CalculationEngineLive } from "@taxkit/core/engine";
import { audDollars, Money, Cents, moneyEquals } from "@taxkit/core/primitives";
import { TraceNode } from "@taxkit/core/trace";
import {
  AnnualTaxLedgerRuleId,
  AnnualTaxScenarioLive,
  AnnualTaxScenarioLiveFromInput,
  AuAnnualTax2025_26_Live,
  CalculateAnnualTax,
  IncomeTaxComponentId,
  IncomeTaxRuleId,
  LitoComponentId,
  LitoRuleId,
  MedicareLevyComponentId,
  MedicareLevyRuleId,
} from "@taxkit/rules-au-income-tax";
import { expectAt } from "@taxkit/testing";
import {
  Array as EffectArray,
  Effect,
  Exit,
  Layer,
  Option,
  Record,
  Schema,
} from "effect";

const runScenario = (incomeDollars: number) =>
  Effect.gen(function* () {
    const engine = yield* CalculationEngine;
    const taxableIncome = yield* audDollars(incomeDollars);
    const result = yield* engine.run({
      calculation: CalculateAnnualTax,
      layer: AuAnnualTax2025_26_Live.pipe(
        Layer.provideMerge(
          AnnualTaxScenarioLiveFromInput({
            taxableIncome,
          })
        )
      ),
    });

    return result.report;
  }).pipe(Effect.provide(CalculationEngineLive));

describe("AU annual income tax calculator (2025-26)", () => {
  it.effect("negative income remains unsupported", () =>
    Effect.gen(function* () {
      const exit = yield* runScenario(-0.01).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
    })
  );

  it.effect("zero income and the nil-rate band produce no tax", () =>
    Effect.forEach([0, 0.01, 18_200], (incomeDollars) =>
      Effect.gen(function* () {
        const report = yield* runScenario(incomeDollars);
        const incomeTax = expectAt(report.ledger.components, 0);
        const medicare = expectAt(report.ledger.components, 2);
        expect(report.liability.cents).toBe(0);
        expect(incomeTax.amount.cents).toBe(0);
        expect(medicare.amount.cents).toBe(0);
        expect(
          Record.get(incomeTax.trace.inputs, "bracketThresholdCents")
        ).toEqual(Option.some(0));
        expect(report.rulePackVersion).toBe("rules-au-income-tax/1.0.1");
      })
    )
  );

  it.effect("high income $80k: all three components, LITO zeroed", () =>
    Effect.gen(function* () {
      // Income tax:  $4,288 + 0.30 x (80,000 - 45,000) = $14,788
      // LITO:        $0  (income > $66,667 - zeroed)
      // Medicare:    0.02 x $80,000 = $1,600
      // Liability:   $14,788 + $1,600 = $16,388
      const report = yield* runScenario(80_000);

      expect(
        moneyEquals(
          report.liability,
          new Money({ cents: Cents.make(1_638_800), currency: "AUD" })
        )
      ).toBe(true);
      expect(
        moneyEquals(
          report.rawLiability,
          new Money({ cents: Cents.make(1_638_800), currency: "AUD" })
        )
      ).toBe(true);
      expect(report.rulePackVersion).toBe("rules-au-income-tax/1.0.1");

      const incomeTax = expectAt(report.ledger.components, 0);
      const lito = expectAt(report.ledger.components, 1);
      const medicare = expectAt(report.ledger.components, 2);
      expect(
        moneyEquals(
          incomeTax.amount,
          new Money({ cents: Cents.make(1_478_800), currency: "AUD" })
        )
      ).toBe(true);
      expect(incomeTax.effect).toBe("additive");
      expect(incomeTax.status).toBe("active");

      // LITO is zeroed once the phase-out ceiling is reached.
      expect(
        moneyEquals(
          lito.amount,
          new Money({ cents: Cents.make(0), currency: "AUD" })
        )
      ).toBe(true);
      expect(lito.effect).toBe("subtractive");
      expect(lito.status).toBe("zeroed");

      expect(
        moneyEquals(
          medicare.amount,
          new Money({ cents: Cents.make(160_000), currency: "AUD" })
        )
      ).toBe(true);
      expect(medicare.effect).toBe("additive");
      expect(medicare.status).toBe("active");
    })
  );

  it.effect("mid income $50k: partial LITO reduces liability", () =>
    Effect.gen(function* () {
      // Income tax:  $4,288 + 0.30 x (50,000 - 45,000) = $5,788
      // LITO:        $325 - 0.015 x (50,000 - 45,000) = $250
      // Medicare:    0.02 x $50,000 = $1,000
      // Liability:   $5,788 - $250 + $1,000 = $6,538
      const report = yield* runScenario(50_000);

      expect(
        moneyEquals(
          report.liability,
          new Money({ cents: Cents.make(653_800), currency: "AUD" })
        )
      ).toBe(true);
      expect(
        moneyEquals(
          report.rawLiability,
          new Money({ cents: Cents.make(653_800), currency: "AUD" })
        )
      ).toBe(true);

      const lito = expectAt(report.ledger.components, 1);
      expect(
        moneyEquals(
          lito.amount,
          new Money({ cents: Cents.make(25_000), currency: "AUD" })
        )
      ).toBe(true);
      expect(lito.effect).toBe("subtractive");
      expect(lito.status).toBe("active");
    })
  );

  it.effect("low income $30k: full LITO, Medicare shade-in", () =>
    Effect.gen(function* () {
      // Income tax:  0.16 x (30,000 - 18,200) = $1,888
      // LITO:        $700 (full, flat - income <= $37,500)
      // Medicare:    0.10 x (30,000 - 28,011) = $198.90
      // Liability:   $1,888 - $700 + $198.90 = $1,386.90
      const report = yield* runScenario(30_000);

      expect(
        moneyEquals(
          report.liability,
          new Money({ cents: Cents.make(138_690), currency: "AUD" })
        )
      ).toBe(true);

      const incomeTax = expectAt(report.ledger.components, 0);
      const lito = expectAt(report.ledger.components, 1);
      const medicare = expectAt(report.ledger.components, 2);
      expect(
        moneyEquals(
          incomeTax.amount,
          new Money({ cents: Cents.make(188_800), currency: "AUD" })
        )
      ).toBe(true);
      expect(
        moneyEquals(
          lito.amount,
          new Money({ cents: Cents.make(70_000), currency: "AUD" })
        )
      ).toBe(true);
      expect(lito.status).toBe("active");
      expect(
        moneyEquals(
          medicare.amount,
          new Money({ cents: Cents.make(19_890), currency: "AUD" })
        )
      ).toBe(true);
      expect(medicare.status).toBe("active");
    })
  );

  it.effect(
    "very low income $20k: LITO exceeds income tax - liability floors to $0",
    () =>
      Effect.gen(function* () {
        // Income tax:  0.16 x (20,000 - 18,200) = $288
        // LITO:        $700 (full) - subtracts more than income tax
        // Medicare:    $0 (income < $28,011 threshold - zeroed)
        // Raw:         $288 - $700 = -$412
        // Floored:     $0
        const report = yield* runScenario(20_000);

        expect(
          moneyEquals(
            report.rawLiability,
            new Money({ cents: Cents.make(-41_200), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.liability,
            new Money({ cents: Cents.make(0), currency: "AUD" })
          )
        ).toBe(true);

        const incomeTax = expectAt(report.ledger.components, 0);
        const lito = expectAt(report.ledger.components, 1);
        const medicare = expectAt(report.ledger.components, 2);
        expect(
          moneyEquals(
            incomeTax.amount,
            new Money({ cents: Cents.make(28_800), currency: "AUD" })
          )
        ).toBe(true);
        // LITO is active; the report applies the liability floor.
        expect(lito.status).toBe("active");
        expect(medicare.status).toBe("zeroed");
      })
  );

  it.effect(
    "below income tax threshold $15k: no tax, LITO active, liability $0",
    () =>
      Effect.gen(function* () {
        // Income tax:  $0 (income <= $18,200 - nil bracket)
        // LITO:        $700 (income <= $37,500, but income tax is $0)
        // Medicare:    $0 (below threshold)
        // Raw:         0 - $700 = -$700
        // Floored:     $0
        const report = yield* runScenario(15_000);

        expect(
          moneyEquals(
            report.rawLiability,
            new Money({ cents: Cents.make(-70_000), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            report.liability,
            new Money({ cents: Cents.make(0), currency: "AUD" })
          )
        ).toBe(true);

        const incomeTax = expectAt(report.ledger.components, 0);
        const lito = expectAt(report.ledger.components, 1);
        expect(
          moneyEquals(
            incomeTax.amount,
            new Money({ cents: Cents.make(0), currency: "AUD" })
          )
        ).toBe(true);
        // Nil bracket is active; the rate happens to be 0.
        expect(incomeTax.status).toBe("active");
        expect(
          moneyEquals(
            lito.amount,
            new Money({ cents: Cents.make(70_000), currency: "AUD" })
          )
        ).toBe(true);
        expect(lito.status).toBe("active");
      })
  );

  it.effect(
    "scenario layer rejects malformed input through Effect Schema",
    () =>
      Effect.gen(function* () {
        const exit = yield* CalculateAnnualTax.pipe(
          Effect.provide(
            AuAnnualTax2025_26_Live.pipe(
              Layer.provideMerge(
                AnnualTaxScenarioLive({ taxableIncome: "80000" })
              )
            )
          ),
          Effect.exit
        );

        expect(Exit.isFailure(exit)).toBe(true);
      })
  );

  it.effect("trace tree shape: Ledger -> [IncomeTax, LITO, MedicareLevy]", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(80_000);

      expect(report.trace.ruleId).toBe(AnnualTaxLedgerRuleId);
      expect(report.trace.children.length).toBe(3);
      expect(expectAt(report.trace.children, 0).ruleId).toBe(IncomeTaxRuleId);
      expect(expectAt(report.trace.children, 1).ruleId).toBe(LitoRuleId);
      expect(expectAt(report.trace.children, 2).ruleId).toBe(
        MedicareLevyRuleId
      );

      const incomeTax = expectAt(report.ledger.components, 0);
      const lito = expectAt(report.ledger.components, 1);
      const medicare = expectAt(report.ledger.components, 2);
      expect(incomeTax.id).toBe(IncomeTaxComponentId);
      expect(lito.id).toBe(LitoComponentId);
      expect(medicare.id).toBe(MedicareLevyComponentId);
    })
  );

  it.effect(
    "trace and ledger snapshot: annual components and source-backed order",
    () =>
      Effect.gen(function* () {
        const report = yield* runScenario(80_000);
        const encodedTrace = yield* Schema.encodeEffect(TraceNode)(
          report.trace
        );

        expect({
          ledger: EffectArray.map(report.ledger.components, (component) => ({
            cents: component.amount.cents,
            effect: component.effect,
            id: component.id,
            status: component.status,
          })),
          traceChildren: EffectArray.map(encodedTrace.children, (child) => ({
            rounding: child.rounding,
            ruleId: child.ruleId,
            sourceKinds: EffectArray.map(
              child.sources,
              (source) => source.kind
            ),
          })),
          traceRoot: report.trace.ruleId,
        }).toEqual({
          ledger: [
            {
              cents: 1_478_800,
              effect: "additive",
              id: IncomeTaxComponentId,
              status: "active",
            },
            {
              cents: 0,
              effect: "subtractive",
              id: LitoComponentId,
              status: "zeroed",
            },
            {
              cents: 160_000,
              effect: "additive",
              id: MedicareLevyComponentId,
              status: "active",
            },
          ],
          traceChildren: [
            {
              rounding: "round-to-nearest-cent",
              ruleId: IncomeTaxRuleId,
              sourceKinds: ["ato-publication"],
            },
            {
              rounding: "round-to-nearest-cent",
              ruleId: LitoRuleId,
              sourceKinds: ["ato-publication"],
            },
            {
              rounding: "round-to-nearest-cent",
              ruleId: MedicareLevyRuleId,
              sourceKinds: ["legislation"],
            },
          ],
          traceRoot: AnnualTaxLedgerRuleId,
        });
      })
  );

  it.effect(
    "income tax and LITO boundary values stay on the intended brackets",
    () =>
      Effect.gen(function* () {
        const taxFreeThreshold = yield* runScenario(18_200);
        expect(
          moneyEquals(
            expectAt(taxFreeThreshold.ledger.components, 0).amount,
            new Money({ cents: Cents.make(0), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            expectAt(taxFreeThreshold.ledger.components, 1).amount,
            new Money({ cents: Cents.make(70_000), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            taxFreeThreshold.liability,
            new Money({ cents: Cents.make(0), currency: "AUD" })
          )
        ).toBe(true);

        const litoFirstPhaseEnd = yield* runScenario(45_000);
        expect(
          moneyEquals(
            expectAt(litoFirstPhaseEnd.ledger.components, 0).amount,
            new Money({ cents: Cents.make(428_800), currency: "AUD" })
          )
        ).toBe(true);
        expect(
          moneyEquals(
            expectAt(litoFirstPhaseEnd.ledger.components, 1).amount,
            new Money({ cents: Cents.make(32_500), currency: "AUD" })
          )
        ).toBe(true);

        const litoCeiling = yield* runScenario(66_667);
        expect(
          moneyEquals(
            expectAt(litoCeiling.ledger.components, 1).amount,
            new Money({ cents: Cents.make(0), currency: "AUD" })
          )
        ).toBe(true);
        expect(expectAt(litoCeiling.ledger.components, 1).status).toBe(
          "zeroed"
        );
      })
  );

  it.effect(
    "Medicare threshold, shade-in, and full-rate boundary behavior",
    () =>
      Effect.gen(function* () {
        const belowThreshold = yield* runScenario(28_011);
        expect(
          moneyEquals(
            expectAt(belowThreshold.ledger.components, 2).amount,
            new Money({ cents: Cents.make(0), currency: "AUD" })
          )
        ).toBe(true);
        expect(expectAt(belowThreshold.ledger.components, 2).status).toBe(
          "zeroed"
        );

        const shadeInBoundary = yield* runScenario(35_013);
        expect(
          moneyEquals(
            expectAt(shadeInBoundary.ledger.components, 2).amount,
            new Money({ cents: Cents.make(70_020), currency: "AUD" })
          )
        ).toBe(true);
        expect(expectAt(shadeInBoundary.ledger.components, 2).status).toBe(
          "active"
        );

        const fullRate = yield* runScenario(35_014);
        expect(
          moneyEquals(
            expectAt(fullRate.ledger.components, 2).amount,
            new Money({ cents: Cents.make(70_028), currency: "AUD" })
          )
        ).toBe(true);
        expect(expectAt(fullRate.ledger.components, 2).status).toBe("active");
      })
  );
  it.effect(
    "enacted Medicare limits reject the retained old-table results",
    () =>
      Effect.forEach(
        [
          { income: 27_222, levyCents: 0 },
          { income: 28_010, levyCents: 0 },
          { income: 28_011, levyCents: 0 },
          { income: 28_012, levyCents: 10 },
          { income: 30_000, levyCents: 19_890 },
          { income: 34_027, levyCents: 60_160 },
          { income: 35_012, levyCents: 70_010 },
          { income: 35_013, levyCents: 70_020 },
          { income: 35_014, levyCents: 70_028 },
          { income: 80_000, levyCents: 160_000 },
        ],
        (scenario) =>
          Effect.gen(function* () {
            const report = yield* runScenario(scenario.income);
            const medicare = expectAt(report.ledger.components, 2);
            expect(medicare.amount.cents, String(scenario.income)).toBe(
              scenario.levyCents
            );
            expect(report.rulePackVersion).toBe("rules-au-income-tax/1.0.1");
            expect(expectAt(medicare.trace.sources, 0).kind).toBe(
              "legislation"
            );
            expect(expectAt(medicare.trace.sources, 0).reference).toBe(
              "https://www.legislation.gov.au/C2026A00058/asmade/2026-06-30/text/original/pdf"
            );
          }),
        { discard: true }
      )
  );
});
