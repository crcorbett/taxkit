import { makeFactDescriptor } from "@whattax/core";
import { LedgerComponent } from "@whattax/core/ledger";
import { Money } from "@whattax/core/primitives";
import { TraceNode } from "@whattax/core/trace";
import { Context, Schema } from "effect";

import { PayPeriod } from "./pay.js";

/**
 * Context tag for the PAYG withholding ledger component.
 *
 * The component is kept separate from the final withholdings ledger so other
 * packages, such as STSL, can compose their own explicit aggregators.
 *
 * @since 0.1.0
 */
export class PaygWithholdingComponentFact extends Context.Service<
  PaygWithholdingComponentFact,
  LedgerComponent
>()("whattax/rules-au-pay/fact/PaygWithholdingComponent") {}

/**
 * Fact descriptor for the PAYG withholding component.
 *
 * @since 0.1.0
 */
export const PaygWithholdingComponentDescriptor = makeFactDescriptor({
  authority: "derived",
  id: "whattax/rules-au-pay/fact/PaygWithholdingComponent",
  schema: LedgerComponent,
  tag: PaygWithholdingComponentFact,
  title: "PAYG withholding ledger component for a single pay period",
});

/**
 * Aggregated withholding ledger for a single pay period.
 *
 * `total` is the sum of active withholding components. Disabled and zeroed
 * components remain in `components` so traces can show that they were
 * considered without contributing to take-home pay.
 *
 * @since 0.1.0
 */
export class PayWithholdingsLedger extends Schema.TaggedClass<PayWithholdingsLedger>()(
  "PayWithholdingsLedger",
  {
    components: Schema.Array(LedgerComponent),
    period: PayPeriod,
    total: Money,
    trace: TraceNode,
  }
) {}

/**
 * Context tag for the derived pay-period withholding ledger.
 *
 * @since 0.1.0
 */
export class PayWithholdingsLedgerFact extends Context.Service<
  PayWithholdingsLedgerFact,
  PayWithholdingsLedger
>()("whattax/rules-au-pay/fact/PayWithholdingsLedger") {}

/**
 * Fact descriptor for the aggregated pay-period withholding ledger.
 *
 * @since 0.1.0
 */
export const PayWithholdingsLedgerDescriptor = makeFactDescriptor({
  authority: "derived",
  id: "whattax/rules-au-pay/fact/PayWithholdingsLedger",
  schema: PayWithholdingsLedger,
  tag: PayWithholdingsLedgerFact,
  title: "Aggregated withholdings ledger for a single pay period",
});
