import {
  isComponentContributing,
  sumLedgerComponents,
} from "@whattax/core/ledger";
import type { LedgerComponent } from "@whattax/core/ledger";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { Effect, Layer } from "effect";

import { GrossPayFact } from "../facts/pay.js";
import type { PayPeriod } from "../facts/pay.js";
import {
  PayWithholdingsLedger,
  PayWithholdingsLedgerFact,
  PaygWithholdingComponentFact,
} from "../facts/withholdings.js";

/**
 * Rule id for aggregating withholding components into a pay-period ledger.
 *
 * @since 0.1.0
 */
export const PayWithholdingsLedgerRuleId = RuleId.make(
  "whattax/rules-au-pay/rule/PayWithholdingsLedger"
);

/**
 * Builds a PayWithholdingsLedger from a list of components for a given
 * pay period. Rule packs that define their own aggregator (e.g. STSL-aware)
 * call this directly so the trace shape and total formula stay identical
 * across packs.
 *
 * @param components - Withholding ledger components to aggregate.
 * @param period - Pay period attached to the resulting ledger.
 * @returns A derived pay-period withholding ledger.
 * @since 0.1.0
 */
export const buildPayWithholdingsLedger = (
  components: readonly LedgerComponent[],
  period: PayPeriod
): PayWithholdingsLedger => {
  const total = sumLedgerComponents(components);
  const trace = TraceNode.make({
    children: components.map((c) => c.trace),
    formula:
      "total = sum(active additive components) - sum(active subtractive components)",
    inputs: {
      activeComponentIds: components
        .filter(isComponentContributing)
        .map((c) => c.id),
      componentIds: components.map((c) => c.id),
    },
    result: total,
    ruleId: PayWithholdingsLedgerRuleId,
    sources: [],
    title: "Pay-withholdings ledger (sum of active components)",
  });
  return new PayWithholdingsLedger({ components, period, total, trace });
};

/**
 * Base aggregator: PAYG only.
 *
 * A pack that adds STSL provides its own aggregator with `[Payg, Stsl]`;
 * the two aggregators stay separate by design — composition is explicit.
 *
 * @since 0.1.0
 */
export const PayWithholdingsLedgerLive = Layer.effect(
  PayWithholdingsLedgerFact
)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;
    const payg = yield* PaygWithholdingComponentFact;
    return buildPayWithholdingsLedger([payg], gross.period);
  })
);
