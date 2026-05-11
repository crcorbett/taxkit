import { Context } from "effect";
import { makeFactDescriptor } from "@whattax/core";
import type { Money } from "@whattax/core/primitives";

/**
 * Annual taxable income — the base for income tax and Medicare Levy.
 *
 * An *input* fact: provided by the caller, not derived within this package.
 * In the full system this would be derived from gross income minus deductions.
 */
export class AnnualTaxableIncome {
  readonly _tag = "AnnualTaxableIncome";
  constructor(readonly fields: { readonly income: Money }) {}
  get income(): Money {
    return this.fields.income;
  }
}

export class AnnualTaxableIncomeFact extends Context.Service<
  AnnualTaxableIncomeFact,
  AnnualTaxableIncome
>()("whattax/spike-au-income-tax/fact/AnnualTaxableIncome") {}

export const AnnualTaxableIncomeDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-income-tax/fact/AnnualTaxableIncome",
  title: "Annual taxable income",
  authority: "input",
  tag: AnnualTaxableIncomeFact,
});
