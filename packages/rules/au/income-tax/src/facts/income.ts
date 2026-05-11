import {
  FactQuestion,
  FactQuestionId,
  makeFactDescriptor,
} from "@whattax/core";
import { Money } from "@whattax/core/primitives";
import { Context, Schema } from "effect";

/**
 * Annual taxable income — the base for income tax and Medicare Levy.
 *
 * An *input* fact: provided by the caller, not derived within this package.
 * In the full system this would be derived from gross income minus deductions.
 */
export class AnnualTaxableIncome extends Schema.TaggedClass<AnnualTaxableIncome>()(
  "AnnualTaxableIncome",
  {
    income: Money,
  }
) {}

export class AnnualTaxableIncomeFact extends Context.Service<
  AnnualTaxableIncomeFact,
  AnnualTaxableIncome
>()("whattax/rules-au-income-tax/fact/AnnualTaxableIncome") {}

export const AnnualTaxableIncomeDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-income-tax/fact/AnnualTaxableIncome",
  title: "Annual taxable income",
  authority: "input",
  schema: AnnualTaxableIncome,
  tag: AnnualTaxableIncomeFact,
  question: new FactQuestion({
    id: FactQuestionId.make(
      "whattax/rules-au-income-tax/question/AnnualTaxableIncome"
    ),
    prompt: "Annual taxable income",
    inputKind: "money",
  }),
});
