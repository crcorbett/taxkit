import { makeRuleDescriptor } from "@taxkit/core/rules";
import {
  GrossPayDescriptor,
  PayWithholdingsLedgerDescriptor,
  PaygWithholdingComponentDescriptor,
  TaxablePayDescriptor,
} from "@taxkit/rules-au-pay/facts";

import { StslComponentDescriptor, StslDebtDescriptor } from "../facts/stsl.js";
import {
  AtoStslTableDescriptor,
  StslSource2025_26,
} from "../parameters/stsl-table.js";
import {
  StslComponentLive,
  StslComponentRuleId,
} from "../rules/stsl-component.js";
import {
  PayWithholdingsLedgerWithStslLive,
  PayWithholdingsLedgerWithStslRuleId,
} from "../rules/withholdings-ledger-with-stsl.js";

/**
 * Rule descriptor for STSL withholding using ATO Schedule 8.
 *
 * @since 0.1.0
 */
export const StslComponentRuleDescriptor = makeRuleDescriptor({
  id: StslComponentRuleId,
  layer: StslComponentLive,
  parameters: [AtoStslTableDescriptor],
  provides: [StslComponentDescriptor],
  requires: [TaxablePayDescriptor, StslDebtDescriptor],
  sourcePolicy: "required",
  sources: [StslSource2025_26],
  title: "STSL withholding component",
});

/**
 * Rule descriptor for aggregating PAYG and STSL withholding components.
 *
 * @since 0.1.0
 */
export const PayWithholdingsLedgerWithStslRuleDescriptor = makeRuleDescriptor({
  id: PayWithholdingsLedgerWithStslRuleId,
  layer: PayWithholdingsLedgerWithStslLive,
  provides: [PayWithholdingsLedgerDescriptor],
  requires: [
    GrossPayDescriptor,
    PaygWithholdingComponentDescriptor,
    StslComponentDescriptor,
  ],
  sourcePolicy: "not-required",
  sources: [],
  title: "Pay withholdings ledger with STSL",
});

/**
 * Descriptor list for STSL additions to a take-home-pay rule pack.
 *
 * @since 0.1.0
 */
export const AuStslRuleDescriptors = [
  StslComponentRuleDescriptor,
  PayWithholdingsLedgerWithStslRuleDescriptor,
] as const;
