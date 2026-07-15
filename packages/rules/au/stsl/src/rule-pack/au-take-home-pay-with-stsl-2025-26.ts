import { AtoSchedule1_2025_26_Live } from "@taxkit/rules-au-pay/parameters";
import {
  NetPayLive,
  PaygWithholdingLive,
  TaxablePayLive,
} from "@taxkit/rules-au-pay/rules";
import { Layer } from "effect";

import { AtoStsl_2025_26_Live } from "../parameters/stsl-table.js";
import { StslComponentLive } from "../rules/stsl-component.js";
import { PayWithholdingsLedgerWithStslLive } from "../rules/withholdings-ledger-with-stsl.js";

/**
 * AU take-home pay 2025-26 with STSL (student loan) withholding.
 *
 * Requires (from a scenario layer):
 *   GrossPayFact + TaxFreeThresholdClaimedFact + StslDebtFact
 *
 * @since 0.1.0
 */
export const AuTakeHomePayWithStsl2025_26_Live = NetPayLive.pipe(
  Layer.provideMerge(PayWithholdingsLedgerWithStslLive),
  Layer.provideMerge(StslComponentLive),
  Layer.provideMerge(PaygWithholdingLive),
  Layer.provideMerge(TaxablePayLive),
  Layer.provideMerge(AtoSchedule1_2025_26_Live),
  Layer.provideMerge(AtoStsl_2025_26_Live)
);
