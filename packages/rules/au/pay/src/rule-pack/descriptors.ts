import { makeRuleDescriptor } from "@whattax/core/rules";
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
import { NetPayLive, NetPayRuleId } from "../rules/net-pay.js";
import {
  PaygWithholdingLive,
  PaygWithholdingRuleId,
} from "../rules/payg-withholding.js";
import {
  AtoSchedule1TableDescriptor,
  Schedule1Source2025_26,
} from "../parameters/schedule1.js";
import {
  TaxablePayWithSacrificeLive,
  TaxablePayWithSacrificeRuleId,
} from "../rules/taxable-pay-with-sacrifice.js";
import { TaxablePayLive, TaxablePayRuleId } from "../rules/taxable-pay.js";
import {
  PayWithholdingsLedgerLive,
  PayWithholdingsLedgerRuleId,
} from "../rules/withholdings-ledger.js";

export const TaxablePayRuleDescriptor = makeRuleDescriptor({
  id: TaxablePayRuleId,
  title: "Taxable pay",
  provides: [TaxablePayDescriptor],
  requires: [GrossPayDescriptor],
  layer: TaxablePayLive,
  sources: [],
  sourcePolicy: "not-required",
});

export const TaxablePayWithSacrificeRuleDescriptor = makeRuleDescriptor({
  id: TaxablePayWithSacrificeRuleId,
  title: "Taxable pay with salary sacrifice",
  provides: [TaxablePayDescriptor],
  requires: [GrossPayDescriptor, SalarySacrificeDescriptor],
  layer: TaxablePayWithSacrificeLive,
  sources: [],
  sourcePolicy: "not-required",
});

export const PaygWithholdingRuleDescriptor = makeRuleDescriptor({
  id: PaygWithholdingRuleId,
  title: "PAYG withholding",
  provides: [PaygWithholdingComponentDescriptor],
  requires: [TaxablePayDescriptor, TaxFreeThresholdClaimedDescriptor],
  parameters: [AtoSchedule1TableDescriptor],
  layer: PaygWithholdingLive,
  sources: [Schedule1Source2025_26],
  sourcePolicy: "required",
});

export const PayWithholdingsLedgerRuleDescriptor = makeRuleDescriptor({
  id: PayWithholdingsLedgerRuleId,
  title: "Pay withholdings ledger",
  provides: [PayWithholdingsLedgerDescriptor],
  requires: [GrossPayDescriptor, PaygWithholdingComponentDescriptor],
  layer: PayWithholdingsLedgerLive,
  sources: [],
  sourcePolicy: "not-required",
});

export const NetPayRuleDescriptor = makeRuleDescriptor({
  id: NetPayRuleId,
  title: "Net pay",
  provides: [NetPayDescriptor],
  requires: [GrossPayDescriptor, PayWithholdingsLedgerDescriptor],
  layer: NetPayLive,
  sources: [],
  sourcePolicy: "not-required",
});

export const AuTakeHomePayRuleDescriptors = [
  TaxablePayRuleDescriptor,
  PaygWithholdingRuleDescriptor,
  PayWithholdingsLedgerRuleDescriptor,
  NetPayRuleDescriptor,
] as const;

export const AuTakeHomePayWithSacrificeRuleDescriptors = [
  TaxablePayWithSacrificeRuleDescriptor,
  PaygWithholdingRuleDescriptor,
  PayWithholdingsLedgerRuleDescriptor,
  NetPayRuleDescriptor,
] as const;
