import { CalculationError } from "@whattax/core/errors";
import { ComponentId } from "@whattax/core/ledger";
import type { LedgerComponent } from "@whattax/core/ledger";
import { aud } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { Array, Effect, Layer, Option } from "effect";

import { IncomeTaxComponentFact } from "../facts/components.js";
import { AnnualTaxableIncomeFact } from "../facts/income.js";
import { AtoIncomeTaxTable } from "../parameters/income-tax-table.js";
import type { IncomeTaxBracket } from "../parameters/income-tax-table.js";

export const IncomeTaxRuleId = RuleId.make(
  "whattax/rules-au-income-tax/rule/IncomeTax"
);

export const IncomeTaxComponentId = ComponentId.make(
  "whattax/rules-au-income-tax/component/IncomeTax"
);

const findBracket = (
  brackets: readonly IncomeTaxBracket[],
  incomeCents: number
): Effect.Effect<IncomeTaxBracket, CalculationError> => {
  const bracket = Array.findFirst(
    Array.reverse(brackets),
    (b) => incomeCents > b.thresholdCents
  );

  return Option.match(bracket, {
    onNone: () =>
      Effect.fail(
        new CalculationError({
          message: `whattax/rules-au-income-tax: no income tax bracket covers income=${incomeCents} cents`,
        })
      ),
    onSome: Effect.succeed,
  });
};

/**
 * Current marginal-rate income tax rule.
 *
 * Formula: tax = baseTaxCents + rate * (incomeCents - thresholdCents)
 * Rounding: nearest cent (ATO truncates; validation uses nearest for simplicity).
 */
export const IncomeTaxLive = Layer.effect(IncomeTaxComponentFact)(
  Effect.gen(function* () {
    const income = yield* AnnualTaxableIncomeFact;
    const table = yield* AtoIncomeTaxTable;

    const incomeCents = income.income.cents;
    const bracket = yield* findBracket(table.brackets, incomeCents);
    const taxCents = Math.round(
      bracket.baseTaxCents +
        bracket.rate * (incomeCents - bracket.thresholdCents)
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
  })
);
