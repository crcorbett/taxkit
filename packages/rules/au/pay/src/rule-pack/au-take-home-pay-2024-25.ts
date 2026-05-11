import { Layer } from "effect";

import { AtoSchedule1_2024_25_Live } from "../parameters/schedule1.js";
import { NetPayLive } from "../rules/net-pay.js";
import { PaygWithholdingLive } from "../rules/payg-withholding.js";
import { TaxablePayLive } from "../rules/taxable-pay.js";
import { PayWithholdingsLedgerLive } from "../rules/withholdings-ledger.js";

/**
 * AU resident take-home pay 2024-25.
 *
 * Uses the same rule algorithms as the 2025-26 pack with the 2024-25
 * Schedule 1 parameter table.
 *
 * @since 0.1.0
 */
export const AuTakeHomePay2024_25_Live = NetPayLive.pipe(
  Layer.provideMerge(PayWithholdingsLedgerLive),
  Layer.provideMerge(PaygWithholdingLive),
  Layer.provideMerge(TaxablePayLive),
  Layer.provideMerge(AtoSchedule1_2024_25_Live)
);
