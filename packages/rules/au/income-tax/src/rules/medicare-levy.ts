import { ComponentId } from "@whattax/core/ledger";
import type { LedgerComponent } from "@whattax/core/ledger";
import { aud } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { Effect, Layer } from "effect";

import { MedicareLevyComponentFact } from "../facts/components.js";
import { AnnualTaxableIncomeFact } from "../facts/income.js";
import { AtoMedicareLevyTable } from "../parameters/medicare-levy-table.js";

export const MedicareLevyRuleId = RuleId.make(
  "whattax/rules-au-income-tax/rule/MedicareLevy"
);

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
      ruleId: MedicareLevyRuleId,
      title: "Medicare Levy",
      inputs: {
        incomeCents,
        thresholdCents: table.thresholdCents,
        shadeInMaxCents: table.shadeInMaxCents,
        shadeInRate: table.shadeInRate,
        levyRate: table.levyRate,
        tableYear: table.year,
      },
      formula,
      result: levyAmount,
      rounding: "round-to-nearest-cent",
      sources: [table.source],
      children: [],
    });

    const component: LedgerComponent = {
      _tag: "LedgerComponent",
      id: MedicareLevyComponentId,
      label: "Medicare Levy",
      amount: levyAmount,
      effect: "additive",
      status,
      trace,
    };
    return component;
  })
);
