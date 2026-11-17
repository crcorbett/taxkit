import type { CalculationError } from "@taxkit/core/errors";
import type {
  GrossPayFact,
  NetPayFact,
  PaygWithholdingComponentFact,
  PayWithholdingsLedgerFact,
  TaxablePayFact,
  TaxFreeThresholdClaimedFact,
} from "@taxkit/rules-au-pay/facts";
import type { AtoSchedule1Table } from "@taxkit/rules-au-pay/parameters";
import {
  AtoSchedule1_2025_26_Live,
  NetPayLive,
  PaygWithholdingLive,
  TaxablePayLive,
} from "@taxkit/rules-au-pay/rule-pack";
import { Layer } from "effect";

import type { StslComponentFact, StslDebtFact } from "../facts/stsl.js";
import { AtoStsl_2025_26_Live } from "../parameters/stsl-table.js";
import type {
  AtoStslNoThresholdTable,
  AtoStslTable,
} from "../parameters/stsl-table.js";
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
export const AuTakeHomePayWithStsl2025_26_Live: Layer.Layer<
  | NetPayFact
  | PayWithholdingsLedgerFact
  | StslComponentFact
  | PaygWithholdingComponentFact
  | TaxablePayFact
  | AtoSchedule1Table
  | AtoStslTable
  | AtoStslNoThresholdTable,
  CalculationError,
  GrossPayFact | TaxFreeThresholdClaimedFact | StslDebtFact
> = NetPayLive.pipe(
  Layer.provideMerge(PayWithholdingsLedgerWithStslLive),
  Layer.provideMerge(StslComponentLive),
  Layer.provideMerge(PaygWithholdingLive),
  Layer.provideMerge(TaxablePayLive),
  Layer.provideMerge(AtoSchedule1_2025_26_Live),
  Layer.provideMerge(AtoStsl_2025_26_Live)
);
