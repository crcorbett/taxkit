import { makeRuleDescriptor } from "@whattax/core/rules";
import {
  GrossPayDescriptor,
  TaxablePayDescriptor,
} from "@whattax/rules-au-pay/facts";
import {
  PayWithholdingsLedgerDescriptor,
  PaygWithholdingComponentDescriptor,
} from "@whattax/rules-au-pay/facts";
import {
  PayWithholdingsLedgerWithStslLive,
} from "../rules/withholdings-ledger-with-stsl.js";
import {
  StslComponentDescriptor,
  StslDebtDescriptor,
} from "../facts/stsl.js";
import {
  AtoStslTableDescriptor,
  StslSource2025_26,
} from "../parameters/stsl-table.js";
import { StslComponentLive, StslComponentRuleId } from "../rules/stsl-component.js";
import { PayWithholdingsLedgerWithStslRuleId } from "../rules/withholdings-ledger-with-stsl.js";

export const StslComponentRuleDescriptor = makeRuleDescriptor({
  id: StslComponentRuleId,
  title: "STSL withholding component",
  provides: [StslComponentDescriptor],
  requires: [TaxablePayDescriptor, StslDebtDescriptor],
  parameters: [AtoStslTableDescriptor],
  layer: StslComponentLive,
  sources: [StslSource2025_26],
  sourcePolicy: "required",
});

export const PayWithholdingsLedgerWithStslRuleDescriptor = makeRuleDescriptor({
  id: PayWithholdingsLedgerWithStslRuleId,
  title: "Pay withholdings ledger with STSL",
  provides: [PayWithholdingsLedgerDescriptor],
  requires: [
    GrossPayDescriptor,
    PaygWithholdingComponentDescriptor,
    StslComponentDescriptor,
  ],
  layer: PayWithholdingsLedgerWithStslLive,
  sources: [],
  sourcePolicy: "not-required",
});

export const AuStslRuleDescriptors = [
  StslComponentRuleDescriptor,
  PayWithholdingsLedgerWithStslRuleDescriptor,
] as const;
