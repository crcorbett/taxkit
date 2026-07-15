import { RuleId, TraceNode } from "@taxkit/core/trace";
import { Effect, Layer } from "effect";

import { GrossPayFact, TaxablePay, TaxablePayFact } from "../facts/pay.js";

/**
 * Rule id for deriving taxable pay from gross pay.
 *
 * @since 0.1.0
 */
export const TaxablePayRuleId = RuleId.make(
  "taxkit/rules-au-pay/rule/TaxablePay"
);

/**
 * Current scope: TaxablePay = GrossPay (no salary sacrifice yet).
 *
 * Even though the value passes through unchanged, we keep this as a real rule
 * because it proves a derived fact in the chain and gives us a trace node that
 * downstream rules can build on.
 *
 * @since 0.1.0
 */
export const TaxablePayLive = Layer.effect(TaxablePayFact)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;

    const trace = TraceNode.make({
      children: [],
      formula: "taxable = gross",
      inputs: {
        grossCents: gross.amount.cents,
        period: gross.period,
      },
      result: gross.amount.cents,
      ruleId: TaxablePayRuleId,
      sources: [],
      title: "Taxable pay (no salary sacrifice in the current implementation)",
    });

    return new TaxablePay({
      amount: gross.amount,
      period: gross.period,
      trace,
    });
  })
);
