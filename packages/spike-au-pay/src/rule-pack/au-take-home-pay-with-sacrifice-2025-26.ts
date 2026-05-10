import { Layer } from "effect";
import { AtoSchedule1_2025_26_Live } from "../parameters/schedule1.js";
import { NetPayLive } from "../rules/net-pay.js";
import { PaygWithholdingLive } from "../rules/payg-withholding.js";
import { TaxablePayWithSacrificeLive } from "../rules/taxable-pay-with-sacrifice.js";
import { PayWithholdingsLedgerLive } from "../rules/withholdings-ledger.js";

/**
 * AU take-home pay 2025-26 with pre-tax salary sacrifice.
 *
 * Requires (from a scenario layer):
 *   GrossPayFact + TaxFreeThresholdClaimedFact + SalarySacrificeFact
 */
export const AuTakeHomePayWithSacrifice2025_26_Live = NetPayLive.pipe(
  Layer.provideMerge(PayWithholdingsLedgerLive),
  Layer.provideMerge(PaygWithholdingLive),
  Layer.provideMerge(TaxablePayWithSacrificeLive),
  Layer.provideMerge(AtoSchedule1_2025_26_Live),
);
