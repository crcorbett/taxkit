import { CalculationError } from "@taxkit/core/errors";
import { Money, NonNegativeMoney } from "@taxkit/core/primitives";
import { TraceNode } from "@taxkit/core/trace";
import { Schema } from "effect";

import { PayPeriod } from "../facts/pay.js";
import { PayWithholdingsLedger } from "../facts/withholdings.js";
import {
  AuPayTakeHomeId,
  AuPayWithholdingsId,
  AuPayWithSacrificeId,
  AuPayJurisdiction,
  AuPayTaxYear,
} from "./metadata.js";

export {
  PayWithholdingsLedger,
  PayWithholdingsLedgerEncoded,
} from "../facts/withholdings.js";
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
export const PayRulePackVersion = Schema.Literal("rules-au-pay/1.0.2");
/**
 * Take-home pay report for one Australian pay-period scenario.
 *
 * The report preserves gross pay, taxable pay, the withholding ledger,
 * final net pay, and the trace rooted at the net-pay rule.
 *
 * @since 0.1.0
 */
const TakeHomePayReportFields = Schema.TaggedStruct("TakeHomePayReport", {
  grossPay: Money,
  netPay: Money,
  salarySacrifice: Money,
  period: PayPeriod,
  rulePackVersion: PayRulePackVersion,
  taxablePay: Money,
  trace: TraceNode,
  withholdings: PayWithholdingsLedger,
  withholdingsTotal: Money,
});
const TakeHomePayReportCheck = Schema.makeFilter<
  Pick<
    typeof TakeHomePayReportFields.Encoded,
    "grossPay" | "netPay" | "salarySacrifice" | "withholdingsTotal" | "period"
  > & {
    readonly withholdings: Pick<
      typeof PayWithholdingsLedger.Encoded,
      "total" | "period"
    >;
  }
>(
  (report) =>
    BigInt(report.grossPay.cents) ===
      BigInt(report.netPay.cents) +
        BigInt(report.withholdingsTotal.cents) +
        BigInt(report.salarySacrifice.cents) &&
    report.withholdingsTotal.cents === report.withholdings.total.cents &&
    report.period === report.withholdings.period,
  { expected: "balanced take-home pay report in one period" }
);
export const TakeHomePayReportEncoded = Schema.toEncoded(
  TakeHomePayReportFields
).check(TakeHomePayReportCheck);
export const TakeHomePayReport = TakeHomePayReportEncoded.pipe(
  Schema.decodeTo(TakeHomePayReportFields)
)
  .check(TakeHomePayReportCheck)
  .pipe(Schema.brand("taxkit/TakeHomePayReport"));
export type TakeHomePayReport = typeof TakeHomePayReport.Type;
/**
 * Input schema for the standard take-home-pay scenario helper.
 *
 * @since 0.1.0
 */
export class TakeHomeScenarioInputSchema extends Schema.Class<
  TakeHomeScenarioInputSchema,
  { readonly brand: unique symbol }
>("TakeHomeScenario")({
  grossPay: NonNegativeMoney,
  period: PayPeriod,
  taxFreeThresholdClaimed: Schema.Boolean,
}) {}
/**
 * Input type for the standard take-home-pay scenario helper.
 *
 * @since 0.1.0
 */
export type TakeHomeScenarioInput = typeof TakeHomeScenarioInputSchema.Type;

/** One period owns both amounts; sacrifice is required by this pack. */
export class TakeHomeWithSacrificeScenarioInput extends Schema.Class<
  TakeHomeWithSacrificeScenarioInput,
  { readonly brand: unique symbol }
>("TakeHomeWithSacrificeScenario")({
  grossPay: NonNegativeMoney,
  salarySacrifice: NonNegativeMoney,
  period: PayPeriod,
  taxFreeThresholdClaimed: Schema.Boolean,
}) {}

const context = {
  jurisdiction: AuPayJurisdiction.make("AU"),
  taxYear: AuPayTaxYear.make("2025-26"),
};
export const AuPayTakeHomeContract = {
  ...context,
  calculatorId: AuPayTakeHomeId.make("au.pay.take-home"),
  inputSchema: TakeHomeScenarioInputSchema,
  outputSchema: TakeHomePayReport,
  errorSchema: CalculationError,
} as const;
export const AuPayWithholdingsContract = {
  ...context,
  calculatorId: AuPayWithholdingsId.make("au.pay.withholdings"),
  inputSchema: TakeHomeScenarioInputSchema,
  outputSchema: PayWithholdingsLedger,
  errorSchema: CalculationError,
} as const;
export const AuPayWithSacrificeContract = {
  ...context,
  calculatorId: AuPayWithSacrificeId.make("au.pay.take-home-with-sacrifice"),
  inputSchema: TakeHomeWithSacrificeScenarioInput,
  outputSchema: TakeHomePayReport,
  errorSchema: CalculationError,
} as const;
export { AuPayTakeHomeId, AuPayWithholdingsId } from "./metadata.js";
