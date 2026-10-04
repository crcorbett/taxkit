import { Money } from "@taxkit/core/primitives";
import { TraceNode } from "@taxkit/core/trace";
import { Schema } from "effect";

import { AnnualTaxLedger } from "../facts/ledger.js";

export {
  AuAnnualTaxCalculatorId,
  AuAnnualTaxContext,
  AuAnnualTaxJurisdiction,
  AuAnnualTaxYear,
} from "./metadata.js";

/**
 * Independent version of the Australian annual-income-tax ruleset represented
 * by this report.
 *
 * @since 1.0.0
 */
export const AnnualTaxRulePackVersion = Schema.Literal(
  "rules-au-income-tax/1.0.0"
);

/**
 * Annual Australian income tax report for one taxable-income scenario.
 *
 * `rawLiability` is the ledger total before flooring. `liability` is floored
 * at zero so offsets cannot produce a negative payable amount.
 *
 * @since 0.1.0
 */
export class AnnualTaxReport extends Schema.TaggedClass<AnnualTaxReport>()(
  "AnnualTaxReport",
  {
    ledger: AnnualTaxLedger,
    liability: Money,
    rawLiability: Money,
    rulePackVersion: AnnualTaxRulePackVersion,
    taxableIncome: Money,
    trace: TraceNode,
  }
) {}

/**
 * Input schema for the annual-tax scenario helper.
 *
 * @since 0.1.0
 */
export const AnnualTaxScenarioInputSchema = Schema.Struct({
  taxableIncome: Money,
});

/**
 * Input type for the annual-tax scenario helper.
 *
 * @since 0.1.0
 */
export type AnnualTaxScenarioInput = typeof AnnualTaxScenarioInputSchema.Type;
