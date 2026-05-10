import { Context } from "effect";
import { makeFactDescriptor } from "@whattax/core";
import type { Money } from "@whattax/core/primitives";
import type { PayPeriod } from "./pay.js";

/**
 * Pre-tax salary sacrifice for a single pay period.
 *
 * An *input* fact: only required when a pack composes the
 * sacrifice-aware TaxablePay rule. The base pack does not require it.
 */
export class SalarySacrifice {
  readonly _tag = "SalarySacrifice";
  constructor(
    readonly fields: { readonly amount: Money; readonly period: PayPeriod },
  ) {}
  get amount(): Money {
    return this.fields.amount;
  }
  get period(): PayPeriod {
    return this.fields.period;
  }
}

export class SalarySacrificeFact extends Context.Service<
  SalarySacrificeFact,
  SalarySacrifice
>()("whattax/spike-au-pay/fact/SalarySacrifice") {}

export const SalarySacrificeDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-pay/fact/SalarySacrifice",
  title: "Pre-tax salary sacrifice for a single pay period",
  authority: "input",
  tag: SalarySacrificeFact,
});
