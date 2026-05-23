/**
 * Public entrypoint for official Australian STSL withholding rules.
 *
 * @since 0.1.0
 */
export {
  StslComponentDescriptor,
  StslComponentFact,
  StslDebt,
  StslDebtDescriptor,
  StslDebtFact,
} from "./facts/stsl.js";
export {
  AtoStslTable,
  AtoStslTableDescriptor,
  AtoStsl_2025_26_Live,
  StslRow,
  StslSource2025_26,
  StslTable,
} from "./parameters/stsl-table.js";
export { AuTakeHomePayWithStsl2025_26_Live } from "./rule-pack/au-take-home-pay-with-stsl-2025-26.js";
export { AuTakeHomePayWithStslAndSacrifice2025_26_Live } from "./rule-pack/au-take-home-pay-with-stsl-and-sacrifice-2025-26.js";
export {
  AuStslRuleDescriptors,
  PayWithholdingsLedgerWithStslRuleDescriptor,
  StslComponentRuleDescriptor,
} from "./rule-pack/descriptors.js";
export {
  StslComponentId,
  StslComponentLive,
  StslComponentRuleId,
} from "./rules/stsl-component.js";
export {
  PayWithholdingsLedgerWithStslLive,
  PayWithholdingsLedgerWithStslRuleId,
} from "./rules/withholdings-ledger-with-stsl.js";
