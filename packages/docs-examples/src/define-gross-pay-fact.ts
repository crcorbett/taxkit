import { Money } from "@taxkit/core/primitives";
import { PayPeriod } from "@taxkit/rules-au-pay/facts";
import { Context, Schema } from "effect";

// This illustrates the existing fact definition. A new fact needs its own
// rule-owned name, schema, service key and descriptor.
export class GrossPay extends Schema.TaggedClass<GrossPay>()("GrossPay", {
  amount: Money,
  period: PayPeriod,
}) {}

export class GrossPayFact extends Context.Service<GrossPayFact, GrossPay>()(
  "taxkit/rules-au-pay/fact/GrossPay"
) {}
