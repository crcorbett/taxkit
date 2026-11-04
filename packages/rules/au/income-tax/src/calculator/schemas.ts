import { CalculationError } from "@taxkit/core/errors";
import { Money, NonNegativeMoney } from "@taxkit/core/primitives";
import { TraceNode } from "@taxkit/core/trace";
import { Schema } from "effect";

import { AnnualTaxLedger } from "../facts/ledger.js";
import {
  AuAnnualTaxCalculatorId,
  AuAnnualTaxJurisdiction,
  AuAnnualTaxYear,
} from "./metadata.js";

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
  "rules-au-income-tax/1.0.1"
);
/**
 * Annual Australian income tax report for one taxable-income scenario.
 *
 * `rawLiability` is the ledger total before flooring. `liability` is floored
 * at zero so offsets cannot produce a negative payable amount.
 *
 * @since 0.1.0
 */
const AnnualTaxReportFields = Schema.TaggedStruct("AnnualTaxReport", {
  ledger: AnnualTaxLedger,
  liability: Money,
  rawLiability: Money,
  rulePackVersion: AnnualTaxRulePackVersion,
  taxableIncome: Money,
  trace: TraceNode,
});
const AnnualTaxReportCheck = Schema.makeFilter<
  Pick<typeof AnnualTaxReportFields.Encoded, "liability" | "rawLiability"> & {
    readonly ledger: Pick<typeof AnnualTaxLedger.Encoded, "rawLiability">;
  }
>(
  (report) =>
    report.rawLiability.cents === report.ledger.rawLiability.cents &&
    report.liability.cents === Math.max(0, report.rawLiability.cents),
  { expected: "annual liability agrees with its checked ledger and zero floor" }
);
export const AnnualTaxReportEncoded = Schema.toEncoded(
  AnnualTaxReportFields
).check(AnnualTaxReportCheck);
export const AnnualTaxReport = AnnualTaxReportEncoded.pipe(
  Schema.decodeTo(AnnualTaxReportFields)
)
  .check(AnnualTaxReportCheck)
  .pipe(Schema.brand("taxkit/AnnualTaxReport"));
export type AnnualTaxReport = typeof AnnualTaxReport.Type;
/**
 * Input schema for the annual-tax scenario helper.
 *
 * @since 0.1.0
 */
export class AnnualTaxScenarioInputSchema extends Schema.Class<
  AnnualTaxScenarioInputSchema,
  { readonly brand: unique symbol }
>("AnnualTaxScenario")({
  taxableIncome: NonNegativeMoney,
}) {}
/**
 * Input type for the annual-tax scenario helper.
 *
 * @since 0.1.0
 */
export type AnnualTaxScenarioInput = typeof AnnualTaxScenarioInputSchema.Type;

export const AuAnnualTaxContract = {
  calculatorId: AuAnnualTaxCalculatorId.make("au.income-tax.annual"),
  jurisdiction: AuAnnualTaxJurisdiction.make("AU"),
  taxYear: AuAnnualTaxYear.make("2025-26"),
  inputSchema: AnnualTaxScenarioInputSchema,
  outputSchema: AnnualTaxReport,
  errorSchema: CalculationError,
} as const;
