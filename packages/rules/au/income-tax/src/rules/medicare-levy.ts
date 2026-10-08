import { CalculationError } from "@taxkit/core/errors";
import { ComponentId, LedgerComponent } from "@taxkit/core/ledger";
import {
  Cents,
  audFromCents,
  multiplyCentsByDecimal,
} from "@taxkit/core/primitives";
import { RuleId, TraceNode } from "@taxkit/core/trace";
import { BigDecimal, Effect, Layer, Match, Option } from "effect";

import { MedicareLevyComponentFact } from "../facts/components.js";
import { AnnualTaxableIncomeFact } from "../facts/income.js";
import { AtoMedicareLevyTable } from "../parameters/medicare-levy-table.js";

/**
 * Rule id for the Medicare Levy component.
 *
 * @since 0.1.0
 */
export const MedicareLevyRuleId = RuleId.make(
  "taxkit/rules-au-income-tax/rule/MedicareLevy"
);

/**
 * Ledger component id for Medicare Levy.
 *
 * @since 0.1.0
 */
export const MedicareLevyComponentId = ComponentId.make(
  "taxkit/rules-au-income-tax/component/MedicareLevy"
);

/**
 * Current Medicare Levy rule.
 *
 * Three regions:
 *   income ≤ threshold                  → zeroed ($0)
 *   threshold < income ≤ shadeInMax     → shade-in: 10% × (income - threshold)
 *   income > shadeInMax                 → full rate: 2% × income
 *
 * @since 0.1.0
 */
export const MedicareLevyLive = Layer.effect(MedicareLevyComponentFact)(
  Effect.gen(function* () {
    const income = yield* AnnualTaxableIncomeFact;
    const table = yield* AtoMedicareLevyTable;

    const incomeCents = income.income.cents;

    const { levyCents, formula } = yield* Match.value(incomeCents).pipe(
      Match.when(
        (cents) => cents <= table.thresholdCents,
        () =>
          Effect.succeed({
            formula: "levy = 0 (below threshold)",
            levyCents: Cents.make(0),
          })
      ),
      Match.when(
        (cents) => cents <= table.shadeInMaxCents,
        (cents) =>
          Cents.makeEffect(cents - table.thresholdCents).pipe(
            Effect.flatMap((excess) =>
              multiplyCentsByDecimal(excess, table.shadeInRate)
            ),
            Effect.map((checkedLevyCents) => ({
              formula: "levy = round(shadeInRate * (income - threshold))",
              levyCents: checkedLevyCents,
            }))
          )
      ),
      Match.orElse((cents) =>
        multiplyCentsByDecimal(cents, table.levyRate).pipe(
          Effect.map((checkedLevyCents) => ({
            formula: "levy = round(levyRate * income)",
            levyCents: checkedLevyCents,
          }))
        )
      )
    );

    const levyAmount = yield* audFromCents(levyCents);
    const status = levyCents === 0 ? "zeroed" : "active";

    const trace = TraceNode.make({
      children: [],
      formula: Option.some(Option.some(formula)),
      inputs: {
        incomeCents,
        levyRate: BigDecimal.format(table.levyRate),
        shadeInMaxCents: table.shadeInMaxCents,
        shadeInRate: BigDecimal.format(table.shadeInRate),
        tableYear: table.year,
        thresholdCents: table.thresholdCents,
      },
      result: levyAmount.cents,
      rounding: Option.some(Option.some("round-to-nearest-cent")),
      ruleId: MedicareLevyRuleId,
      sources: [table.source],
      title: "Medicare Levy",
    });

    const component = LedgerComponent.make({
      amount: levyAmount,
      effect: "additive",
      id: MedicareLevyComponentId,
      label: "Medicare Levy",
      status,
      trace,
    });
    return component;
  }).pipe(
    Effect.mapError(
      () =>
        new CalculationError({
          message: "Medicare levy could not produce a supported amount.",
        })
    )
  )
);
