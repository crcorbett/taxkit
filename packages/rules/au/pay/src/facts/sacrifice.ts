import {
  FactQuestion,
  FactQuestionId,
  makeFactDescriptor,
} from "@whattax/core";
import { Money } from "@whattax/core/primitives";
import { Context, Schema } from "effect";

import { PayPeriod } from "./pay.js";

/**
 * Pre-tax salary sacrifice for a single pay period.
 *
 * An *input* fact: only required when a pack composes the
 * sacrifice-aware TaxablePay rule. The base pack does not require it.
 */
export class SalarySacrifice extends Schema.TaggedClass<SalarySacrifice>()(
  "SalarySacrifice",
  {
    amount: Money,
    period: PayPeriod,
  }
) {}

export class SalarySacrificeFact extends Context.Service<
  SalarySacrificeFact,
  SalarySacrifice
>()("whattax/rules-au-pay/fact/SalarySacrifice") {}

export const SalarySacrificeDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-pay/fact/SalarySacrifice",
  title: "Pre-tax salary sacrifice for a single pay period",
  authority: "input",
  schema: SalarySacrifice,
  tag: SalarySacrificeFact,
  question: new FactQuestion({
    id: FactQuestionId.make("whattax/rules-au-pay/question/SalarySacrifice"),
    prompt: "Pre-tax salary sacrifice for the pay period",
    inputKind: "money",
  }),
});
