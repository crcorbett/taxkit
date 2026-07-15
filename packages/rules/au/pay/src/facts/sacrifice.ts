import { FactQuestion, FactQuestionId, makeFactDescriptor } from "@taxkit/core";
import { Money } from "@taxkit/core/primitives";
import { Context, Schema } from "effect";

import { PayPeriod } from "./pay.js";

/**
 * Pre-tax salary sacrifice for one pay period.
 *
 * This input fact is required only by sacrifice-aware rule packs. The base
 * take-home-pay pack does not require it.
 *
 * @since 0.1.0
 *
 * @example
 * ```ts
 * import { audDollars } from "@taxkit/core/primitives"
 * import { SalarySacrifice } from "@taxkit/rules-au-pay/facts"
 *
 * const sacrifice = new SalarySacrifice({ amount: audDollars(250), period: "weekly" })
 * ```
 */
export class SalarySacrifice extends Schema.TaggedClass<SalarySacrifice>()(
  "SalarySacrifice",
  {
    amount: Money,
    period: PayPeriod,
  }
) {}

/**
 * Context tag for caller-provided pre-tax salary sacrifice.
 *
 * @since 0.1.0
 */
export class SalarySacrificeFact extends Context.Service<
  SalarySacrificeFact,
  SalarySacrifice
>()("taxkit/rules-au-pay/fact/SalarySacrifice") {}

/**
 * Fact descriptor for pre-tax salary sacrifice.
 *
 * @since 0.1.0
 */
export const SalarySacrificeDescriptor = makeFactDescriptor({
  authority: "input",
  id: "taxkit/rules-au-pay/fact/SalarySacrifice",
  question: new FactQuestion({
    id: FactQuestionId.make("taxkit/rules-au-pay/question/SalarySacrifice"),
    inputKind: "money",
    prompt: "Pre-tax salary sacrifice for the pay period",
  }),
  schema: SalarySacrifice,
  tag: SalarySacrificeFact,
  title: "Pre-tax salary sacrifice for a single pay period",
});
