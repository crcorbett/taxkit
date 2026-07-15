import { CalculationError } from "@taxkit/core/errors";
import { ComponentId, LedgerComponent } from "@taxkit/core/ledger";
import { aud, multiplyCentsByDecimal } from "@taxkit/core/primitives";
import { RuleId, TraceNode } from "@taxkit/core/trace";
import { Array, BigDecimal, Effect, Layer, Option } from "effect";

import { IncomeTaxComponentFact } from "../facts/components.js";
import { AnnualTaxableIncomeFact } from "../facts/income.js";
import { AtoIncomeTaxTable } from "../parameters/income-tax-table.js";
import type { IncomeTaxBracket } from "../parameters/income-tax-table.js";

/**
 * Rule id for marginal-rate Australian resident income tax.
 *
 * @since 0.1.0
 */
export const IncomeTaxRuleId = RuleId.make(
  "taxkit/rules-au-income-tax/rule/IncomeTax"
);

/**
 * Ledger component id for marginal-rate income tax.
 *
 * @since 0.1.0
 */
export const IncomeTaxComponentId = ComponentId.make(
  "taxkit/rules-au-income-tax/component/IncomeTax"
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
          message: `taxkit/rules-au-income-tax: no income tax bracket covers income=${incomeCents} cents`,
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
 *
 * @throws CalculationError when no income tax bracket covers the input income.
 * @since 0.1.0
 */
export const IncomeTaxLive = Layer.effect(IncomeTaxComponentFact)(
  Effect.gen(function* () {
    const income = yield* AnnualTaxableIncomeFact;
    const table = yield* AtoIncomeTaxTable;

    const incomeCents = income.income.cents;
    const bracket = yield* findBracket(table.brackets, incomeCents);
    const taxCents =
      bracket.baseTaxCents +
      multiplyCentsByDecimal(
        incomeCents - bracket.thresholdCents,
        bracket.rate
      );
    const taxAmount = aud(taxCents);

    const trace = TraceNode.make({
      children: [],
      formula: "tax = baseTaxCents + round(rate * (income - threshold))",
      inputs: {
        baseTaxCents: bracket.baseTaxCents,
        bracketThresholdCents: bracket.thresholdCents,
        incomeCents,
        rate: BigDecimal.format(bracket.rate),
        tableYear: table.year,
      },
      result: taxAmount.cents,
      rounding: "round-to-nearest-cent",
      ruleId: IncomeTaxRuleId,
      sources: [table.source],
      title: "Income tax at marginal rates",
    });

    const component = LedgerComponent.make({
      amount: taxAmount,
      effect: "additive",
      id: IncomeTaxComponentId,
      label: "Income tax",
      status: "active",
      trace,
    });
    return component;
  })
);
