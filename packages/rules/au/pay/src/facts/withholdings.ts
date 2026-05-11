import { Context, Schema } from "effect";
import { makeFactDescriptor } from "@whattax/core";
import { LedgerComponent } from "@whattax/core/ledger";
import { Money } from "@whattax/core/primitives";
import { TraceNode } from "@whattax/core/trace";
import { PayPeriod } from "./pay.js";

/**
 * One withholding component on a pay-period ledger (e.g. PAYG, STSL).
 *
 * Each upstream rule produces its own `*ComponentFact`; an aggregator combines
 * them into the `PayWithholdingsLedgerFact`. This keeps the dependency graph
 * explicit — the base pack composes one aggregator, an STSL-enabled pack
 * composes a different aggregator. No hidden registration.
 */
export class PaygWithholdingComponentFact extends Context.Service<
  PaygWithholdingComponentFact,
  LedgerComponent
>()("whattax/rules-au-pay/fact/PaygWithholdingComponent") {}

export const PaygWithholdingComponentDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-pay/fact/PaygWithholdingComponent",
  title: "PAYG withholding ledger component for a single pay period",
  authority: "derived",
  schema: LedgerComponent,
  tag: PaygWithholdingComponentFact,
});

/**
 * Aggregated withholdings for a pay period.
 *
 * `total` is the net effect of active components on take-home pay
 * (sum of `increase-tax` minus sum of `decrease-tax`, ignoring disabled and
 * zeroed components and `information-only`). Disabled components remain in
 * `components` so the trace can show that they were considered.
 */
export class PayWithholdingsLedger
  extends Schema.TaggedClass<PayWithholdingsLedger>()("PayWithholdingsLedger", {
    components: Schema.Array(LedgerComponent),
    total: Money,
    period: PayPeriod,
    trace: TraceNode,
  }) {}

export class PayWithholdingsLedgerFact extends Context.Service<
  PayWithholdingsLedgerFact,
  PayWithholdingsLedger
>()("whattax/rules-au-pay/fact/PayWithholdingsLedger") {}

export const PayWithholdingsLedgerDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-pay/fact/PayWithholdingsLedger",
  title: "Aggregated withholdings ledger for a single pay period",
  authority: "derived",
  schema: PayWithholdingsLedger,
  tag: PayWithholdingsLedgerFact,
});
