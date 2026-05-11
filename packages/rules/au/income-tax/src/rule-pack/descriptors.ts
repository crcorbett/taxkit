import { makeRuleDescriptor } from "@whattax/core/rules";
import {
  IncomeTaxComponentDescriptor,
  LitoComponentDescriptor,
  MedicareLevyComponentDescriptor,
} from "../facts/components.js";
import { AnnualTaxableIncomeDescriptor } from "../facts/income.js";
import { AnnualTaxLedgerDescriptor } from "../facts/ledger.js";
import {
  AnnualTaxLedgerLive,
  AnnualTaxLedgerRuleId,
} from "../rules/annual-tax-ledger.js";
import { IncomeTaxLive, IncomeTaxRuleId } from "../rules/income-tax.js";
import { LitoLive, LitoRuleId } from "../rules/lito.js";
import {
  MedicareLevyLive,
  MedicareLevyRuleId,
} from "../rules/medicare-levy.js";
import {
  AtoIncomeTaxTableDescriptor,
  IncomeTaxSource2025_26,
} from "../parameters/income-tax-table.js";
import {
  AtoLitoTableDescriptor,
  LitoSource2025_26,
} from "../parameters/lito-table.js";
import {
  AtoMedicareLevyTableDescriptor,
  MedicareLevySource2025_26,
} from "../parameters/medicare-levy-table.js";

export const IncomeTaxRuleDescriptor = makeRuleDescriptor({
  id: IncomeTaxRuleId,
  title: "Income tax at marginal rates",
  provides: [IncomeTaxComponentDescriptor],
  requires: [AnnualTaxableIncomeDescriptor],
  parameters: [AtoIncomeTaxTableDescriptor],
  layer: IncomeTaxLive,
  sources: [IncomeTaxSource2025_26],
  sourcePolicy: "required",
});

export const LitoRuleDescriptor = makeRuleDescriptor({
  id: LitoRuleId,
  title: "Low Income Tax Offset",
  provides: [LitoComponentDescriptor],
  requires: [AnnualTaxableIncomeDescriptor],
  parameters: [AtoLitoTableDescriptor],
  layer: LitoLive,
  sources: [LitoSource2025_26],
  sourcePolicy: "required",
});

export const MedicareLevyRuleDescriptor = makeRuleDescriptor({
  id: MedicareLevyRuleId,
  title: "Medicare Levy",
  provides: [MedicareLevyComponentDescriptor],
  requires: [AnnualTaxableIncomeDescriptor],
  parameters: [AtoMedicareLevyTableDescriptor],
  layer: MedicareLevyLive,
  sources: [MedicareLevySource2025_26],
  sourcePolicy: "required",
});

export const AnnualTaxLedgerRuleDescriptor = makeRuleDescriptor({
  id: AnnualTaxLedgerRuleId,
  title: "Annual tax ledger",
  provides: [AnnualTaxLedgerDescriptor],
  requires: [
    IncomeTaxComponentDescriptor,
    LitoComponentDescriptor,
    MedicareLevyComponentDescriptor,
  ],
  layer: AnnualTaxLedgerLive,
  sources: [],
  sourcePolicy: "not-required",
});

export const AuAnnualTaxRuleDescriptors = [
  IncomeTaxRuleDescriptor,
  LitoRuleDescriptor,
  MedicareLevyRuleDescriptor,
  AnnualTaxLedgerRuleDescriptor,
] as const;
