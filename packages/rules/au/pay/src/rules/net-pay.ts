import { Effect, Layer } from "effect";
import { moneySub } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { GrossPayFact, NetPay, NetPayFact } from "../facts/pay.js";
import { PayWithholdingsLedgerFact } from "../facts/withholdings.js";

export const NetPayRuleId = RuleId.make("whattax/rules-au-pay/rule/NetPay");

export const NetPayLive = Layer.effect(NetPayFact)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;
    const ledger = yield* PayWithholdingsLedgerFact;

    const netAmount = moneySub(gross.amount, ledger.total);

    const trace = TraceNode.make({
      ruleId: NetPayRuleId,
      title: "Net pay = gross - withholdings ledger total",
      inputs: {
        grossCents: gross.amount.cents,
        withholdingsTotalCents: ledger.total.cents,
      },
      formula: "net = gross - withholdingsLedger.total",
      result: netAmount,
      sources: [],
      children: [ledger.trace],
    });

    return new NetPay({
      amount: netAmount,
      period: gross.period,
      trace,
    });
  }),
);
