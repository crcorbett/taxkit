import { Effect, Layer } from "effect";
import {
  isComponentContributing,
  type LedgerComponent,
  sumLedgerComponents,
} from "@whattax/core/ledger";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { GrossPayFact, type PayPeriod } from "../facts/pay.js";
import {
  PayWithholdingsLedger,
  PayWithholdingsLedgerFact,
  PaygWithholdingComponentFact,
} from "../facts/withholdings.js";

export const PayWithholdingsLedgerRuleId = RuleId.make(
  "whattax/rules-au-pay/rule/PayWithholdingsLedger",
);

/**
 * Builds a PayWithholdingsLedger from a list of components for a given
 * pay period. Rule packs that define their own aggregator (e.g. STSL-aware)
 * call this directly so the trace shape and total formula stay identical
 * across packs.
 */
export const buildPayWithholdingsLedger = (
  components: ReadonlyArray<LedgerComponent>,
  period: PayPeriod,
): PayWithholdingsLedger => {
  const total = sumLedgerComponents(components);
  const trace = TraceNode.make({
    ruleId: PayWithholdingsLedgerRuleId,
    title: "Pay-withholdings ledger (sum of active components)",
    inputs: {
      componentIds: components.map((c) => c.id),
      activeComponentIds: components
        .filter(isComponentContributing)
        .map((c) => c.id),
    },
    formula:
      "total = sum(active additive components) - sum(active subtractive components)",
    result: total,
    sources: [],
    children: components.map((c) => c.trace),
  });
  return new PayWithholdingsLedger({ components, total, period, trace });
};

/**
 * Base aggregator: PAYG only.
 *
 * A pack that adds STSL provides its own aggregator with `[Payg, Stsl]`;
 * the two aggregators stay separate by design — composition is explicit.
 */
export const PayWithholdingsLedgerLive = Layer.effect(
  PayWithholdingsLedgerFact,
)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;
    const payg = yield* PaygWithholdingComponentFact;
    return buildPayWithholdingsLedger([payg], gross.period);
  }),
);
