import { Effect, Layer } from "effect";
import { ComponentId, type LedgerComponent } from "@whattax/core/ledger";
import { aud } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { AnnualTaxableIncomeFact } from "../facts/income.js";
import { IncomeTaxComponentFact } from "../facts/components.js";
import { AtoIncomeTaxTable, type IncomeTaxBracket } from "../parameters/income-tax-table.js";

export const IncomeTaxRuleId = RuleId.make(
  "whattax/spike-au-income-tax/rule/IncomeTax",
);

export const IncomeTaxComponentId = ComponentId.make(
  "whattax/spike-au-income-tax/component/IncomeTax",
);

const findBracket = (
  brackets: ReadonlyArray<IncomeTaxBracket>,
  incomeCents: number,
): IncomeTaxBracket => {
  // Iterate highest-threshold-first; first match wins.
  for (let i = brackets.length - 1; i >= 0; i--) {
    const b = brackets[i]!;
    if (incomeCents > b.thresholdCents) return b;
  }
  throw new Error(
    `whattax/spike-au-income-tax: no income tax bracket covers income=${incomeCents} cents`,
  );
};

/**
 * Spike marginal-rate income tax rule.
 *
 * Formula: tax = baseTaxCents + rate * (incomeCents - thresholdCents)
 * Rounding: nearest cent (ATO truncates; spike uses nearest for simplicity).
 */
export const IncomeTaxLive = Layer.effect(IncomeTaxComponentFact)(
  Effect.gen(function* () {
    const income = yield* AnnualTaxableIncomeFact;
    const table = yield* AtoIncomeTaxTable;

    const incomeCents = income.income.cents;
    const bracket = findBracket(table.brackets, incomeCents);
    const taxCents = Math.round(
      bracket.baseTaxCents + bracket.rate * (incomeCents - bracket.thresholdCents),
    );
    const taxAmount = aud(taxCents);

    const trace = TraceNode.make({
      ruleId: IncomeTaxRuleId,
      title: "Income tax at marginal rates",
      inputs: {
        incomeCents,
        bracketThresholdCents: bracket.thresholdCents,
        rate: bracket.rate,
        baseTaxCents: bracket.baseTaxCents,
        tableYear: table.year,
      },
      formula: "tax = baseTaxCents + round(rate * (income - threshold))",
      result: taxAmount,
      rounding: "round-to-nearest-cent",
      sources: [table.source],
      children: [],
    });

    const component: LedgerComponent = {
      _tag: "LedgerComponent",
      id: IncomeTaxComponentId,
      label: "Income tax",
      amount: taxAmount,
      effect: "additive",
      status: "active",
      trace,
    };
    return component;
  }),
);
