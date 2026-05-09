import { Layer } from "effect";
import { AtoSchedule1_2025_26_Live } from "../parameters/schedule1.js";
import { NetPayLive } from "../rules/net-pay.js";
import { PaygWithholdingLive } from "../rules/payg-withholding.js";
import { TaxablePayLive } from "../rules/taxable-pay.js";

/**
 * Composed rule pack for AU resident take-home pay, 2025-26.
 *
 * Provides: NetPayFact + PaygWithholdingFact + TaxablePayFact
 * Requires (from a scenario layer): GrossPayFact + TaxFreeThresholdClaimedFact
 *
 * `provideMerge` is the architectural primitive: each call wires a dependency
 * AND keeps the inner layer's output exposed, so the calculator can yield
 * all three derived facts.
 */
export const AuTakeHomePay2025_26_Live = NetPayLive.pipe(
  Layer.provideMerge(PaygWithholdingLive),
  Layer.provideMerge(TaxablePayLive),
  Layer.provideMerge(AtoSchedule1_2025_26_Live),
);
