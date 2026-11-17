import {
  CalculationError,
  CalculationInvariantViolation,
} from "@taxkit/core/errors";
import { ComponentId, LedgerComponent } from "@taxkit/core/ledger";
import { fromCents, multiplyCentsByDecimal } from "@taxkit/core/primitives";
import { RuleId, TraceNode } from "@taxkit/core/trace";
import {
  Function as EffectFunction,
  Array,
  BigDecimal,
  Effect,
  Layer,
  Option,
  Struct,
} from "effect";

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
): Effect.Effect<IncomeTaxBracket> => {
  const bracket = EffectFunction.pipe(
    Array.reverse(brackets),
    Array.findFirst(
      (b) =>
        incomeCents > b.thresholdCents ||
        (incomeCents === 0 && b.thresholdCents === 0)
    )
  );
  // The checked table starts at zero and income is non-negative, so a missing
  // bracket means the table itself is broken.
  return Option.match(bracket, {
    onNone: () =>
      Effect.die(
        new CalculationInvariantViolation({
          invariant: "table-coverage",
          message: "No income tax bracket covers the amount.",
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
 * @throws {CalculationError} When an amount does not fit in safe whole cents.
 * @since 0.1.0
 */
export const IncomeTaxLive = Layer.effect(IncomeTaxComponentFact)(
  Effect.gen(function* () {
    const income = yield* AnnualTaxableIncomeFact;
    const table = yield* AtoIncomeTaxTable;
    const incomeCents = income.income.cents;
    const bracket = yield* findBracket(table.brackets, incomeCents);
    const taxableExcess = yield* fromCents(
      incomeCents - bracket.thresholdCents
    ).pipe(Effect.map(Struct.get("cents")));
    const marginalTax = yield* multiplyCentsByDecimal(
      taxableExcess,
      bracket.rate
    );
    const taxAmount = yield* fromCents(bracket.baseTaxCents + marginalTax);
    const trace = TraceNode.make({
      children: [],
      formula: Option.some(
        "tax = baseTaxCents + round(rate * (income - threshold))"
      ),
      inputs: {
        baseTaxCents: bracket.baseTaxCents,
        bracketThresholdCents: bracket.thresholdCents,
        incomeCents,
        rate: BigDecimal.format(bracket.rate),
        tableYear: table.year,
      },
      result: taxAmount.cents,
      rounding: Option.some("round-to-nearest-cent"),
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
  }).pipe(
    Effect.catchTag("MoneyError", ({ reason }) =>
      Effect.fail(
        new CalculationError({
          message: "Income tax could not produce a supported amount.",
          reason,
        })
      )
    )
  )
);
