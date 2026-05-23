import { Layer } from "effect";

import { AtoSchedule1_2025_26_Live } from "../parameters/schedule1.js";
import { PaygWithholdingLive } from "../rules/payg-withholding.js";
import { TaxablePayLive } from "../rules/taxable-pay.js";
import { PayWithholdingsLedgerLive } from "../rules/withholdings-ledger.js";

/**
 * Composed rule pack for AU PAYG-only pay-period withholdings, 2025-26.
 *
 * Provides: PayWithholdingsLedgerFact + PaygWithholdingComponentFact + TaxablePayFact
 * Requires (from a scenario layer): GrossPayFact + TaxFreeThresholdClaimedFact
 *
 * @since 0.1.0
 */
export const AuPayWithholdings2025_26_Live = PayWithholdingsLedgerLive.pipe(
  Layer.provideMerge(PaygWithholdingLive),
  Layer.provideMerge(TaxablePayLive),
  Layer.provideMerge(AtoSchedule1_2025_26_Live)
);
