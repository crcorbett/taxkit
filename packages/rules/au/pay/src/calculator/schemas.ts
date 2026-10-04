import { Money } from "@taxkit/core/primitives";
import { TraceNode } from "@taxkit/core/trace";
import { Schema } from "effect";

import { GrossPay, PayPeriod } from "../facts/pay.js";
import { PayWithholdingsLedger } from "../facts/withholdings.js";

export { PayWithholdingsLedger } from "../facts/withholdings.js";
export {
  AuPayCalculatorId,
  AuPayContext,
  AuPayJurisdiction,
  AuPayTaxYear,
} from "./metadata.js";

/**
 * Independent version of the Australian pay ruleset represented by this
 * report.
 *
 * @since 1.0.0
 */
export const PayRulePackVersion = Schema.Literal("rules-au-pay/1.0.0");

/**
 * Take-home pay report for one Australian pay-period scenario.
 *
 * The report preserves gross pay, taxable pay, the withholding ledger,
 * final net pay, and the trace rooted at the net-pay rule.
 *
 * @since 0.1.0
 */
export class TakeHomePayReport extends Schema.TaggedClass<TakeHomePayReport>()(
  "TakeHomePayReport",
  {
    grossPay: Money,
    netPay: Money,
    period: PayPeriod,
    rulePackVersion: PayRulePackVersion,
    taxablePay: Money,
    trace: TraceNode,
    withholdings: PayWithholdingsLedger,
    withholdingsTotal: Money,
  }
) {}

/**
 * Input schema for the standard take-home-pay scenario helper.
 *
 * @since 0.1.0
 */
export const TakeHomeScenarioInputSchema = Schema.Struct({
  grossPay: GrossPay,
  taxFreeThresholdClaimed: Schema.Boolean,
});

/**
 * Input type for the standard take-home-pay scenario helper.
 *
 * @since 0.1.0
 */
export type TakeHomeScenarioInput = typeof TakeHomeScenarioInputSchema.Type;
