import { moneySub } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { Effect, Layer } from "effect";

import { GrossPayFact, NetPay, NetPayFact } from "../facts/pay.js";
import { PayWithholdingsLedgerFact } from "../facts/withholdings.js";

/**
 * Rule id for deriving take-home pay from gross pay and the withholding ledger.
 *
 * @since 0.1.0
 */
export const NetPayRuleId = RuleId.make("whattax/rules-au-pay/rule/NetPay");

/**
 * Derives net pay as gross pay less the aggregated withholding ledger total.
 *
 * @since 0.1.0
 */
export const NetPayLive = Layer.effect(NetPayFact)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;
    const ledger = yield* PayWithholdingsLedgerFact;

    const netAmount = moneySub(gross.amount, ledger.total);

    const trace = TraceNode.make({
      children: [ledger.trace],
      formula: "net = gross - withholdingsLedger.total",
      inputs: {
        grossCents: gross.amount.cents,
        withholdingsTotalCents: ledger.total.cents,
      },
      result: netAmount,
      ruleId: NetPayRuleId,
      sources: [],
      title: "Net pay = gross - withholdings ledger total",
    });

    return new NetPay({
      amount: netAmount,
      period: gross.period,
      trace,
    });
  })
);
