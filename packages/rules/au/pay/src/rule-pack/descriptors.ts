import { makeRuleDescriptor } from "@taxkit/core/rules";

import {
  GrossPayDescriptor,
  NetPayDescriptor,
  TaxablePayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "../facts/pay.js";
import { SalarySacrificeDescriptor } from "../facts/sacrifice.js";
import {
  PayWithholdingsLedgerDescriptor,
  PaygWithholdingComponentDescriptor,
} from "../facts/withholdings.js";
import {
  AtoSchedule1TableDescriptor,
  Schedule1Source2025_26,
} from "../parameters/schedule1.js";
import { NetPayLive, NetPayRuleId } from "../rules/net-pay.js";
import {
  PaygWithholdingLive,
  PaygWithholdingRuleId,
} from "../rules/payg-withholding.js";
import {
  TaxablePayWithSacrificeLive,
  TaxablePayWithSacrificeRuleId,
} from "../rules/taxable-pay-with-sacrifice.js";
import { TaxablePayLive, TaxablePayRuleId } from "../rules/taxable-pay.js";
import {
  PayWithholdingsLedgerLive,
  PayWithholdingsLedgerRuleId,
} from "../rules/withholdings-ledger.js";

/**
 * Rule descriptor for deriving taxable pay without pre-tax sacrifice.
 *
 * @since 0.1.0
 */
export const TaxablePayRuleDescriptor = makeRuleDescriptor({
  id: TaxablePayRuleId,
  layer: TaxablePayLive,
  provides: [TaxablePayDescriptor],
  requires: [GrossPayDescriptor],
  sourcePolicy: "not-required",
  sources: [],
  title: "Taxable pay",
});

/**
 * Rule descriptor for deriving taxable pay with pre-tax salary sacrifice.
 *
 * @since 0.1.0
 */
export const TaxablePayWithSacrificeRuleDescriptor = makeRuleDescriptor({
  id: TaxablePayWithSacrificeRuleId,
  layer: TaxablePayWithSacrificeLive,
  provides: [TaxablePayDescriptor],
  requires: [GrossPayDescriptor, SalarySacrificeDescriptor],
  sourcePolicy: "not-required",
  sources: [],
  title: "Taxable pay with salary sacrifice",
});

/**
 * Rule descriptor for PAYG withholding using ATO Schedule 1.
 *
 * @since 0.1.0
 */
export const PaygWithholdingRuleDescriptor = makeRuleDescriptor({
  id: PaygWithholdingRuleId,
  layer: PaygWithholdingLive,
  parameters: [AtoSchedule1TableDescriptor],
  provides: [PaygWithholdingComponentDescriptor],
  requires: [TaxablePayDescriptor, TaxFreeThresholdClaimedDescriptor],
  sourcePolicy: "required",
  sources: [Schedule1Source2025_26],
  title: "PAYG withholding",
});

/**
 * Rule descriptor for the base PAYG-only withholding ledger.
 *
 * @since 0.1.0
 */
export const PayWithholdingsLedgerRuleDescriptor = makeRuleDescriptor({
  id: PayWithholdingsLedgerRuleId,
  layer: PayWithholdingsLedgerLive,
  provides: [PayWithholdingsLedgerDescriptor],
  requires: [GrossPayDescriptor, PaygWithholdingComponentDescriptor],
  sourcePolicy: "not-required",
  sources: [],
  title: "Pay withholdings ledger",
});

/**
 * Rule descriptor for deriving net pay from gross pay and withholdings.
 *
 * @since 0.1.0
 */
export const NetPayRuleDescriptor = makeRuleDescriptor({
  id: NetPayRuleId,
  layer: NetPayLive,
  provides: [NetPayDescriptor],
  requires: [GrossPayDescriptor, PayWithholdingsLedgerDescriptor],
  sourcePolicy: "not-required",
  sources: [],
  title: "Net pay",
});

/**
 * Descriptor list for the base Australian take-home-pay rule pack.
 *
 * @since 0.1.0
 */
export const AuTakeHomePayRuleDescriptors = [
  TaxablePayRuleDescriptor,
  PaygWithholdingRuleDescriptor,
  PayWithholdingsLedgerRuleDescriptor,
  NetPayRuleDescriptor,
] as const;

/**
 * Descriptor list for the salary-sacrifice take-home-pay rule pack.
 *
 * @since 0.1.0
 */
export const AuTakeHomePayWithSacrificeRuleDescriptors = [
  TaxablePayWithSacrificeRuleDescriptor,
  PaygWithholdingRuleDescriptor,
  PayWithholdingsLedgerRuleDescriptor,
  NetPayRuleDescriptor,
] as const;
