import { Layer } from "effect";
import { AtoSchedule1_2024_25_Live } from "../parameters/schedule1.js";
import { NetPayLive } from "../rules/net-pay.js";
import { PaygWithholdingLive } from "../rules/payg-withholding.js";
import { TaxablePayLive } from "../rules/taxable-pay.js";

/**
 * Same algorithms as 2025-26, swapped parameter table only — proves the
 * algorithm/data separation claim from the architecture docs.
 */
export const AuTakeHomePay2024_25_Live = NetPayLive.pipe(
  Layer.provideMerge(PaygWithholdingLive),
  Layer.provideMerge(TaxablePayLive),
  Layer.provideMerge(AtoSchedule1_2024_25_Live),
);
