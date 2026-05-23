/**
 * Public entrypoint for official Australian pay-period withholding rules.
 *
 * @since 0.1.0
 */
export {
  CalculatePayWithholdings,
  CalculateTakeHomePay,
  TakeHomePayReport,
  TakeHomeScenarioInputSchema,
  TakeHomeScenarioLive,
  type TakeHomeScenarioInput,
} from "./calculator/take-home-pay.js";
export {
  GrossPay,
  GrossPayDescriptor,
  GrossPayFact,
  NetPay,
  NetPayDescriptor,
  NetPayFact,
  PayPeriod,
  TaxFreeThresholdClaimed,
  TaxFreeThresholdClaimedDescriptor,
  TaxFreeThresholdClaimedFact,
  TaxablePay,
  TaxablePayDescriptor,
  TaxablePayFact,
  payPeriodToWeeklyFactor,
  scaleWeeklyWithholdingToPayPeriodDollars,
} from "./facts/pay.js";
export {
  SalarySacrifice,
  SalarySacrificeDescriptor,
  SalarySacrificeFact,
} from "./facts/sacrifice.js";
export {
  PayWithholdingsLedger,
  PayWithholdingsLedgerDescriptor,
  PayWithholdingsLedgerFact,
  PaygWithholdingComponentDescriptor,
  PaygWithholdingComponentFact,
} from "./facts/withholdings.js";
export {
  AtoSchedule1Table,
  AtoSchedule1TableDescriptor,
  AtoSchedule1_2024_25_Live,
  AtoSchedule1_2025_26_Live,
  Schedule1Row,
  Schedule1Scale,
  Schedule1Source2025_26,
  Schedule1Table,
} from "./parameters/schedule1.js";
export { AuPayWithholdings2025_26_Live } from "./rule-pack/au-pay-withholdings-2025-26.js";
export { AuTakeHomePay2024_25_Live } from "./rule-pack/au-take-home-pay-2024-25.js";
export { AuTakeHomePay2025_26_Live } from "./rule-pack/au-take-home-pay-2025-26.js";
export { AuTakeHomePayWithSacrifice2025_26_Live } from "./rule-pack/au-take-home-pay-with-sacrifice-2025-26.js";
export {
  AuTakeHomePayRuleDescriptors,
  AuTakeHomePayWithSacrificeRuleDescriptors,
  NetPayRuleDescriptor,
  PayWithholdingsLedgerRuleDescriptor,
  PaygWithholdingRuleDescriptor,
  TaxablePayRuleDescriptor,
  TaxablePayWithSacrificeRuleDescriptor,
} from "./rule-pack/descriptors.js";
export { NetPayLive, NetPayRuleId } from "./rules/net-pay.js";
export {
  PaygWithholdingComponentId,
  PaygWithholdingLive,
  PaygWithholdingRuleId,
} from "./rules/payg-withholding.js";
export {
  TaxablePayWithSacrificeLive,
  TaxablePayWithSacrificeRuleId,
} from "./rules/taxable-pay-with-sacrifice.js";
export { TaxablePayLive, TaxablePayRuleId } from "./rules/taxable-pay.js";
export {
  PayWithholdingsLedgerLive,
  PayWithholdingsLedgerRuleId,
  buildPayWithholdingsLedger,
} from "./rules/withholdings-ledger.js";
