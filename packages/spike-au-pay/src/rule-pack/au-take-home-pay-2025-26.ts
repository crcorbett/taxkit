import { Layer } from "effect";
import { AtoSchedule1_2025_26_Live } from "../parameters/schedule1.js";
import { NetPayLive } from "../rules/net-pay.js";
import { PaygWithholdingLive } from "../rules/payg-withholding.js";
import { TaxablePayLive } from "../rules/taxable-pay.js";
import { PayWithholdingsLedgerLive } from "../rules/withholdings-ledger.js";

/**
 * Composed rule pack for AU resident take-home pay, 2025-26.
 *
 * Provides: NetPayFact + PayWithholdingsLedgerFact + PaygWithholdingComponentFact + TaxablePayFact
 * Requires (from a scenario layer): GrossPayFact + TaxFreeThresholdClaimedFact
 *
 * Aggregator wiring is explicit: this base pack composes
 * `PayWithholdingsLedgerLive` over `PaygWithholdingLive` only. A spike pack
 * that adds another withholding (e.g. STSL) replaces this aggregator with one
 * that depends on both components.
 */
export const AuTakeHomePay2025_26_Live = NetPayLive.pipe(
  Layer.provideMerge(PayWithholdingsLedgerLive),
  Layer.provideMerge(PaygWithholdingLive),
  Layer.provideMerge(TaxablePayLive),
  Layer.provideMerge(AtoSchedule1_2025_26_Live),
);
