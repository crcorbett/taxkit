import { ComponentId } from "@whattax/core/ledger";
import type { LedgerComponent } from "@whattax/core/ledger";
import { aud } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { Effect, Layer } from "effect";

import { MedicareLevyComponentFact } from "../facts/components.js";
import { AnnualTaxableIncomeFact } from "../facts/income.js";
import { AtoMedicareLevyTable } from "../parameters/medicare-levy-table.js";

/**
 * Rule id for the Medicare Levy component.
 *
 * @since 0.1.0
 */
export const MedicareLevyRuleId = RuleId.make(
  "whattax/rules-au-income-tax/rule/MedicareLevy"
);

/**
 * Ledger component id for Medicare Levy.
 *
 * @since 0.1.0
 */
export const MedicareLevyComponentId = ComponentId.make(
  "whattax/rules-au-income-tax/component/MedicareLevy"
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

    let levyCents: number;
    let formula: string;

    if (incomeCents <= table.thresholdCents) {
      levyCents = 0;
      formula = "levy = 0 (below threshold)";
    } else if (incomeCents <= table.shadeInMaxCents) {
      levyCents = Math.round(
        table.shadeInRate * (incomeCents - table.thresholdCents)
      );
      formula = "levy = round(shadeInRate * (income - threshold))";
    } else {
      levyCents = Math.round(table.levyRate * incomeCents);
      formula = "levy = round(levyRate * income)";
    }

    const levyAmount = aud(levyCents);
    const status = levyCents === 0 ? "zeroed" : "active";

    const trace = TraceNode.make({
      children: [],
      formula,
      inputs: {
        incomeCents,
        levyRate: table.levyRate,
        shadeInMaxCents: table.shadeInMaxCents,
        shadeInRate: table.shadeInRate,
        tableYear: table.year,
        thresholdCents: table.thresholdCents,
      },
      result: levyAmount,
      rounding: "round-to-nearest-cent",
      ruleId: MedicareLevyRuleId,
      sources: [table.source],
      title: "Medicare Levy",
    });

    const component: LedgerComponent = {
      _tag: "LedgerComponent",
      amount: levyAmount,
      effect: "additive",
      id: MedicareLevyComponentId,
      label: "Medicare Levy",
      status,
      trace,
    };
    return component;
  })
);
