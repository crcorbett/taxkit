import { makeRuleDescriptor } from "@taxkit/core/rules";

import {
  IncomeTaxComponentDescriptor,
  LitoComponentDescriptor,
  MedicareLevyComponentDescriptor,
} from "../facts/components.js";
import { AnnualTaxableIncomeDescriptor } from "../facts/income.js";
import { AnnualTaxLedgerDescriptor } from "../facts/ledger.js";
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

/**
 * Rule descriptor for marginal-rate income tax.
 *
 * @since 0.1.0
 */
export const IncomeTaxRuleDescriptor = makeRuleDescriptor({
  id: IncomeTaxRuleId,
  layer: IncomeTaxLive,
  parameters: [AtoIncomeTaxTableDescriptor],
  provides: [IncomeTaxComponentDescriptor],
  requires: [AnnualTaxableIncomeDescriptor],
  sourcePolicy: "required",
  sources: [IncomeTaxSource2025_26],
  title: "Income tax at marginal rates",
});

/**
 * Rule descriptor for the Low Income Tax Offset.
 *
 * @since 0.1.0
 */
export const LitoRuleDescriptor = makeRuleDescriptor({
  id: LitoRuleId,
  layer: LitoLive,
  parameters: [AtoLitoTableDescriptor],
  provides: [LitoComponentDescriptor],
  requires: [AnnualTaxableIncomeDescriptor],
  sourcePolicy: "required",
  sources: [LitoSource2025_26],
  title: "Low Income Tax Offset",
});

/**
 * Rule descriptor for Medicare Levy.
 *
 * @since 0.1.0
 */
export const MedicareLevyRuleDescriptor = makeRuleDescriptor({
  id: MedicareLevyRuleId,
  layer: MedicareLevyLive,
  parameters: [AtoMedicareLevyTableDescriptor],
  provides: [MedicareLevyComponentDescriptor],
  requires: [AnnualTaxableIncomeDescriptor],
  sourcePolicy: "required",
  sources: [MedicareLevySource2025_26],
  title: "Medicare Levy",
});

/**
 * Rule descriptor for aggregating annual tax components.
 *
 * @since 0.1.0
 */
export const AnnualTaxLedgerRuleDescriptor = makeRuleDescriptor({
  id: AnnualTaxLedgerRuleId,
  layer: AnnualTaxLedgerLive,
  provides: [AnnualTaxLedgerDescriptor],
  requires: [
    IncomeTaxComponentDescriptor,
    LitoComponentDescriptor,
    MedicareLevyComponentDescriptor,
  ],
  sourcePolicy: "not-required",
  sources: [],
  title: "Annual tax ledger",
});

/**
 * Descriptor list for the 2025-26 annual tax rule pack.
 *
 * @since 0.1.0
 */
export const AuAnnualTaxRuleDescriptors = [
  IncomeTaxRuleDescriptor,
  LitoRuleDescriptor,
  MedicareLevyRuleDescriptor,
  AnnualTaxLedgerRuleDescriptor,
] as const;
