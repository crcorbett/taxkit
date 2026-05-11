import { RuleId, TraceNode } from "@whattax/core/trace";
import { Effect, Layer } from "effect";

import { GrossPayFact, TaxablePay, TaxablePayFact } from "../facts/pay.js";

export const TaxablePayRuleId = RuleId.make(
  "whattax/rules-au-pay/rule/TaxablePay"
);

/**
 * Current scope: TaxablePay = GrossPay (no salary sacrifice yet).
 *
 * Even though the value passes through unchanged, we keep this as a real rule
 * because it proves a derived fact in the chain and gives us a trace node that
 * downstream rules can build on.
 */
export const TaxablePayLive = Layer.effect(TaxablePayFact)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;

    const trace = TraceNode.make({
      ruleId: TaxablePayRuleId,
      title: "Taxable pay (no salary sacrifice in the current implementation)",
      inputs: { grossPay: gross },
      formula: "taxable = gross",
      result: gross.amount,
      sources: [],
      children: [],
    });

    return new TaxablePay({
      amount: gross.amount,
      period: gross.period,
      trace,
    });
  })
);
