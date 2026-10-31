import { describe, expect, it } from "@effect/vitest";
import { CalculationEngine, CalculationEngineLive } from "@taxkit/core/engine";
import { audDollars, Money, Cents } from "@taxkit/core/primitives";
import { TraceNode } from "@taxkit/core/trace";
import {
  AnnualTaxLedgerRuleId,
  AnnualTaxScenario,
  AnnualTaxScenarioInputSchema,
  AnnualTaxScenarioLive,
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
  Function as EffectFunction,
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
        Layer.provideMerge(AnnualTaxScenarioLive),
        Layer.provide(Layer.succeed(AnnualTaxScenario)({ taxableIncome }))
      ),
    });
    return result.report;
  }).pipe(Effect.provide(CalculationEngineLive));
describe("AU annual income tax calculator (2025-26)", () => {
  it.effect("negative income remains unsupported", () =>
    Effect.gen(function* () {
      const exit = yield* runScenario(-0.01).pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
        expect(actual).toBeTruthy();
      });
    })
  );
  it.effect("zero income and the nil-rate band produce no tax", () =>
    Effect.forEach([0, 0.01, 18_200], (incomeDollars) =>
      Effect.gen(function* () {
        const report = yield* runScenario(incomeDollars);
        const incomeTax = expectAt(report.ledger.components, 0);
        const medicare = expectAt(report.ledger.components, 2);
        expect({
          liabilityComponents: {
            reportLiabilityCents: report.liability.cents,
            incomeTaxAmountCents: incomeTax.amount.cents,
            medicareAmountCents: medicare.amount.cents,
          },
          bracketThreshold: Record.get(
            incomeTax.trace.inputs,
            "bracketThresholdCents"
          ),
          reportRulePackVersion: report.rulePackVersion,
        }).toStrictEqual({
          liabilityComponents: {
            reportLiabilityCents: 0,
            incomeTaxAmountCents: 0,
            medicareAmountCents: 0,
          },
          bracketThreshold: Option.some(0),
          reportRulePackVersion: "rules-au-income-tax/1.0.1",
        });
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
      expect({
        liability: report.liability,
        rawLiability: report.rawLiability,
        reportRulePackVersion: report.rulePackVersion,
      }).toStrictEqual({
        liability: new Money({ cents: Cents.make(1_638_800), currency: "AUD" }),
        rawLiability: new Money({
          cents: Cents.make(1_638_800),
          currency: "AUD",
        }),
        reportRulePackVersion: "rules-au-income-tax/1.0.1",
      });
      const incomeTax = expectAt(report.ledger.components, 0);
      const lito = expectAt(report.ledger.components, 1);
      const medicare = expectAt(report.ledger.components, 2);
      expect({
        incomeTaxAmount: incomeTax.amount,
        incomeTax: {
          incomeTaxEffect: incomeTax.effect,
          incomeTaxStatus: incomeTax.status,
        },
        litoAmount: lito.amount,
        lito: {
          litoEffect: lito.effect,
          litoStatus: lito.status,
        },
        medicareAmount: medicare.amount,
        medicare: {
          medicareEffect: medicare.effect,
          medicareStatus: medicare.status,
        },
      }).toStrictEqual({
        incomeTaxAmount: new Money({
          cents: Cents.make(1_478_800),
          currency: "AUD",
        }),
        incomeTax: {
          incomeTaxEffect: "additive",
          incomeTaxStatus: "active",
        },
        litoAmount: new Money({ cents: Cents.make(0), currency: "AUD" }),
        lito: {
          litoEffect: "subtractive",
          litoStatus: "zeroed",
        },
        medicareAmount: new Money({
          cents: Cents.make(160_000),
          currency: "AUD",
        }),
        medicare: {
          medicareEffect: "additive",
          medicareStatus: "active",
        },
      });
    })
  );
  it.effect("mid income $50k: partial LITO reduces liability", () =>
    Effect.gen(function* () {
      // Income tax:  $4,288 + 0.30 x (50,000 - 45,000) = $5,788
      // LITO:        $325 - 0.015 x (50,000 - 45,000) = $250
      // Medicare:    0.02 x $50,000 = $1,000
      // Liability:   $5,788 - $250 + $1,000 = $6,538
      const report = yield* runScenario(50_000);
      expect({
        liability: report.liability,
        rawLiability: report.rawLiability,
      }).toStrictEqual({
        liability: new Money({ cents: Cents.make(653_800), currency: "AUD" }),
        rawLiability: new Money({
          cents: Cents.make(653_800),
          currency: "AUD",
        }),
      });
      const lito = expectAt(report.ledger.components, 1);
      expect({
        litoAmount: lito.amount,
        lito: {
          litoEffect: lito.effect,
          litoStatus: lito.status,
        },
      }).toStrictEqual({
        litoAmount: new Money({ cents: Cents.make(25_000), currency: "AUD" }),
        lito: {
          litoEffect: "subtractive",
          litoStatus: "active",
        },
      });
    })
  );
  it.effect("low income $30k: full LITO, Medicare shade-in", () =>
    Effect.gen(function* () {
      // Income tax:  0.16 x (30,000 - 18,200) = $1,888
      // LITO:        $700 (full, flat - income <= $37,500)
      // Medicare:    0.10 x (30,000 - 28,011) = $198.90
      // Liability:   $1,888 - $700 + $198.90 = $1,386.90
      const report = yield* runScenario(30_000);
      expect(report.liability).toStrictEqual(
        new Money({ cents: Cents.make(138_690), currency: "AUD" })
      );
      const incomeTax = expectAt(report.ledger.components, 0);
      const lito = expectAt(report.ledger.components, 1);
      const medicare = expectAt(report.ledger.components, 2);
      expect({
        incomeTaxAmount: incomeTax.amount,
        litoAmount: lito.amount,
        litoStatus: lito.status,
        medicareAmount: medicare.amount,
        medicareStatus: medicare.status,
      }).toStrictEqual({
        incomeTaxAmount: new Money({
          cents: Cents.make(188_800),
          currency: "AUD",
        }),
        litoAmount: new Money({ cents: Cents.make(70_000), currency: "AUD" }),
        litoStatus: "active",
        medicareAmount: new Money({
          cents: Cents.make(19_890),
          currency: "AUD",
        }),
        medicareStatus: "active",
      });
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
        expect({
          rawLiability: report.rawLiability,
          liability: report.liability,
        }).toStrictEqual({
          rawLiability: new Money({
            cents: Cents.make(-41_200),
            currency: "AUD",
          }),
          liability: new Money({ cents: Cents.make(0), currency: "AUD" }),
        });
        const incomeTax = expectAt(report.ledger.components, 0);
        const lito = expectAt(report.ledger.components, 1);
        const medicare = expectAt(report.ledger.components, 2);
        expect({
          incomeTaxAmount: incomeTax.amount,
          offsetStatuses: {
            litoStatus: lito.status,
            medicareStatus: medicare.status,
          },
        }).toStrictEqual({
          incomeTaxAmount: new Money({
            cents: Cents.make(28_800),
            currency: "AUD",
          }),
          offsetStatuses: {
            litoStatus: "active",
            medicareStatus: "zeroed",
          },
        });
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
        expect({
          rawLiability: report.rawLiability,
          liability: report.liability,
        }).toStrictEqual({
          rawLiability: new Money({
            cents: Cents.make(-70_000),
            currency: "AUD",
          }),
          liability: new Money({ cents: Cents.make(0), currency: "AUD" }),
        });
        const incomeTax = expectAt(report.ledger.components, 0);
        const lito = expectAt(report.ledger.components, 1);
        expect({
          incomeTaxAmount: incomeTax.amount,
          incomeTaxStatus: incomeTax.status,
          litoAmount: lito.amount,
          litoStatus: lito.status,
        }).toStrictEqual({
          incomeTaxAmount: new Money({ cents: Cents.make(0), currency: "AUD" }),
          incomeTaxStatus: "active",
          litoAmount: new Money({ cents: Cents.make(70_000), currency: "AUD" }),
          litoStatus: "active",
        });
      })
  );
  it.effect("scenario input Schema rejects malformed input", () =>
    Effect.gen(function* () {
      const exit = yield* Schema.decodeUnknownEffect(
        AnnualTaxScenarioInputSchema
      )({ taxableIncome: "80000" }).pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
        expect(actual).toBeTruthy();
      });
    })
  );
  it.effect("trace tree shape: Ledger -> [IncomeTax, LITO, MedicareLevy]", () =>
    Effect.gen(function* () {
      const report = yield* runScenario(80_000);
      const rules = EffectFunction.pipe(
        report.trace.children,
        EffectArray.map((trace) => trace.ruleId)
      );
      const components = EffectFunction.pipe(
        report.ledger.components,
        EffectArray.map((component) => component.id)
      );
      expect({ root: report.trace.ruleId, rules, components }).toStrictEqual({
        root: AnnualTaxLedgerRuleId,
        rules: [IncomeTaxRuleId, LitoRuleId, MedicareLevyRuleId],
        components: [
          IncomeTaxComponentId,
          LitoComponentId,
          MedicareLevyComponentId,
        ],
      });
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
          ledger: EffectFunction.pipe(
            report.ledger.components,
            EffectArray.map((component) => ({
              cents: component.amount.cents,
              effect: component.effect,
              id: component.id,
              status: component.status,
            }))
          ),
          traceChildren: EffectFunction.pipe(
            encodedTrace.children,
            EffectArray.map((child) => ({
              rounding: child.rounding,
              ruleId: child.ruleId,
              sourceKinds: EffectFunction.pipe(
                child.sources,
                EffectArray.map((source) => source.kind)
              ),
            }))
          ),
          traceRoot: report.trace.ruleId,
        }).toStrictEqual({
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
        expect({
          thresholdIncomeTax: expectAt(taxFreeThreshold.ledger.components, 0)
            .amount,
          thresholdLito: expectAt(taxFreeThreshold.ledger.components, 1).amount,
          thresholdLiability: taxFreeThreshold.liability,
        }).toStrictEqual({
          thresholdIncomeTax: new Money({
            cents: Cents.make(0),
            currency: "AUD",
          }),
          thresholdLito: new Money({
            cents: Cents.make(70_000),
            currency: "AUD",
          }),
          thresholdLiability: new Money({
            cents: Cents.make(0),
            currency: "AUD",
          }),
        });
        const litoFirstPhaseEnd = yield* runScenario(45_000);
        expect({
          firstPhaseIncomeTax: expectAt(litoFirstPhaseEnd.ledger.components, 0)
            .amount,
          firstPhaseLito: expectAt(litoFirstPhaseEnd.ledger.components, 1)
            .amount,
        }).toStrictEqual({
          firstPhaseIncomeTax: new Money({
            cents: Cents.make(428_800),
            currency: "AUD",
          }),
          firstPhaseLito: new Money({
            cents: Cents.make(32_500),
            currency: "AUD",
          }),
        });
        const litoCeiling = yield* runScenario(66_667);
        expect({
          ceilingLito: expectAt(litoCeiling.ledger.components, 1).amount,
          ceilingLitoStatus: expectAt(litoCeiling.ledger.components, 1).status,
        }).toStrictEqual({
          ceilingLito: new Money({ cents: Cents.make(0), currency: "AUD" }),
          ceilingLitoStatus: "zeroed",
        });
      })
  );
  it.effect(
    "Medicare threshold, shade-in, and full-rate boundary behavior",
    () =>
      Effect.gen(function* () {
        const belowThreshold = yield* runScenario(28_011);
        expect({
          belowThresholdMedicare: expectAt(belowThreshold.ledger.components, 2)
            .amount,
          belowThresholdMedicareStatus: expectAt(
            belowThreshold.ledger.components,
            2
          ).status,
        }).toStrictEqual({
          belowThresholdMedicare: new Money({
            cents: Cents.make(0),
            currency: "AUD",
          }),
          belowThresholdMedicareStatus: "zeroed",
        });
        const shadeInBoundary = yield* runScenario(35_013);
        expect({
          shadeInMedicare: expectAt(shadeInBoundary.ledger.components, 2)
            .amount,
          offsetStatus: expectAt(shadeInBoundary.ledger.components, 2).status,
        }).toStrictEqual({
          shadeInMedicare: new Money({
            cents: Cents.make(70_020),
            currency: "AUD",
          }),
          offsetStatus: "active",
        });
        const fullRate = yield* runScenario(35_014);
        expect({
          fullRateMedicare: expectAt(fullRate.ledger.components, 2).amount,
          expectAtFullRateLedgerComponents2Status: expectAt(
            fullRate.ledger.components,
            2
          ).status,
        }).toStrictEqual({
          fullRateMedicare: new Money({
            cents: Cents.make(70_028),
            currency: "AUD",
          }),
          expectAtFullRateLedgerComponents2Status: "active",
        });
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
            const actual = medicare.amount.cents;
            const message = String(scenario.income);
            expect(actual, message).toBe(scenario.levyCents);
            expect({
              reportRulePackVersion: report.rulePackVersion,
              expectAtMedicareTraceSources0Kind: expectAt(
                medicare.trace.sources,
                0
              ).kind,
              expectAtMedicareTraceSources0Reference: expectAt(
                medicare.trace.sources,
                0
              ).reference,
            }).toStrictEqual({
              reportRulePackVersion: "rules-au-income-tax/1.0.1",
              expectAtMedicareTraceSources0Kind: "legislation",
              expectAtMedicareTraceSources0Reference:
                "https://www.legislation.gov.au/C2026A00058/asmade/2026-06-30/text/original/pdf",
            });
          }),
        { discard: true }
      )
  );
});
