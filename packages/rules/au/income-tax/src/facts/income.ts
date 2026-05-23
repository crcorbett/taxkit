import {
  FactQuestion,
  FactQuestionId,
  makeFactDescriptor,
} from "@whattax/core";
import { Money } from "@whattax/core/primitives";
import { Context, Schema } from "effect";

/**
 * Annual taxable income used by the Australian annual tax rules.
 *
 * This is an input fact: callers provide the assessed taxable income rather
 * than asking this package to derive it from gross income and deductions.
 *
 * @since 0.1.0
 *
 * @example
 * ```ts
 * import { audDollars } from "@whattax/core/primitives"
 * import { AnnualTaxableIncome } from "@whattax/rules-au-income-tax/facts"
 *
 * const income = new AnnualTaxableIncome({ income: audDollars(95_000) })
 * ```
 */
export class AnnualTaxableIncome extends Schema.TaggedClass<AnnualTaxableIncome>()(
  "AnnualTaxableIncome",
  {
    income: Money,
  }
) {}

/**
 * Context tag for caller-provided annual taxable income.
 *
 * @since 0.1.0
 */
export class AnnualTaxableIncomeFact extends Context.Service<
  AnnualTaxableIncomeFact,
  AnnualTaxableIncome
>()("whattax/rules-au-income-tax/fact/AnnualTaxableIncome") {}

/**
 * Fact descriptor for annual taxable income and its money-input question.
 *
 * @since 0.1.0
 */
export const AnnualTaxableIncomeDescriptor = makeFactDescriptor({
  authority: "input",
  id: "whattax/rules-au-income-tax/fact/AnnualTaxableIncome",
  question: new FactQuestion({
    id: FactQuestionId.make(
      "whattax/rules-au-income-tax/question/AnnualTaxableIncome"
    ),
    inputKind: "money",
    prompt: "Annual taxable income",
  }),
  schema: AnnualTaxableIncome,
  tag: AnnualTaxableIncomeFact,
  title: "Annual taxable income",
});
