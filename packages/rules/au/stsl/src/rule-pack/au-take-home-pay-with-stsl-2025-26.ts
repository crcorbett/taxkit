import { Layer } from "effect";
import { AtoSchedule1_2025_26_Live } from "@whattax/rules-au-pay/parameters";
import {
  NetPayLive,
  PaygWithholdingLive,
  TaxablePayLive,
} from "@whattax/rules-au-pay/rules";
import { AtoStsl_2025_26_Live } from "../parameters/stsl-table.js";
import { StslComponentLive } from "../rules/stsl-component.js";
import { PayWithholdingsLedgerWithStslLive } from "../rules/withholdings-ledger-with-stsl.js";

/**
 * AU take-home pay 2025-26 with STSL (student loan) withholding.
 *
 * Requires (from a scenario layer):
 *   GrossPayFact + TaxFreeThresholdClaimedFact + StslDebtFact
 */
export const AuTakeHomePayWithStsl2025_26_Live = NetPayLive.pipe(
  Layer.provideMerge(PayWithholdingsLedgerWithStslLive),
  Layer.provideMerge(StslComponentLive),
  Layer.provideMerge(PaygWithholdingLive),
  Layer.provideMerge(TaxablePayLive),
  Layer.provideMerge(AtoSchedule1_2025_26_Live),
  Layer.provideMerge(AtoStsl_2025_26_Live),
);
