import { Effect, Layer } from "effect";
import { moneySub } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import {
  GrossPayFact,
  NetPay,
  NetPayFact,
  PaygWithholdingFact,
} from "../facts/pay.js";

export const NetPayRuleId = RuleId.make("whattax/spike-au-pay/rule/NetPay");

export const NetPayLive = Layer.effect(NetPayFact)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;
    const payg = yield* PaygWithholdingFact;

    const netAmount = moneySub(gross.amount, payg.amount);

    const trace = TraceNode.make({
      ruleId: NetPayRuleId,
      title: "Net pay = gross - PAYG withheld",
      inputs: {
        grossCents: gross.amount.cents,
        paygCents: payg.amount.cents,
      },
      formula: "net = gross - payg",
      result: netAmount,
      sources: [],
      children: [payg.trace],
    });

    return new NetPay({
      amount: netAmount,
      period: gross.period,
      trace,
    });
  }),
);
