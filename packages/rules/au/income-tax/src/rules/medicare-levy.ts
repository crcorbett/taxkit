import { ComponentId, LedgerComponent } from "@taxkit/core/ledger";
import { aud, multiplyCentsByDecimal } from "@taxkit/core/primitives";
import { RuleId, TraceNode } from "@taxkit/core/trace";
import { BigDecimal, Effect, Layer, Match } from "effect";

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

    const { levyCents, formula } = Match.value(incomeCents).pipe(
      Match.when(
        (cents) => cents <= table.thresholdCents,
        () => ({
          formula: "levy = 0 (below threshold)",
          levyCents: 0,
        })
      ),
      Match.when(
        (cents) => cents <= table.shadeInMaxCents,
        (cents) => ({
          formula: "levy = round(shadeInRate * (income - threshold))",
          levyCents: multiplyCentsByDecimal(
            cents - table.thresholdCents,
            table.shadeInRate
          ),
        })
      ),
      Match.orElse((cents) => ({
        formula: "levy = round(levyRate * income)",
        levyCents: multiplyCentsByDecimal(cents, table.levyRate),
      }))
    );

    const levyAmount = aud(levyCents);
    const status = levyCents === 0 ? "zeroed" : "active";

    const trace = TraceNode.make({
      children: [],
      formula,
      inputs: {
        incomeCents,
        levyRate: BigDecimal.format(table.levyRate),
        shadeInMaxCents: table.shadeInMaxCents,
        shadeInRate: BigDecimal.format(table.shadeInRate),
        tableYear: table.year,
        thresholdCents: table.thresholdCents,
      },
      result: levyAmount.cents,
      rounding: "round-to-nearest-cent",
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
  })
);
