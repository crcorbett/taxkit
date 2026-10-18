import {
  AuAnnualTaxCalculatorId,
  AuAnnualTaxJurisdiction,
  AuAnnualTaxYear,
} from "@taxkit/rules-au-income-tax/schemas";
import {
  AuPayCalculatorId,
  AuPayJurisdiction,
  AuPayTaxYear,
} from "@taxkit/rules-au-pay/schemas";

import { CalculatorSummary } from "./schemas.js";

// One publication owner for names and contexts. This module deliberately
// imports only browser-safe Schemas, never calculator execution or rule Layers.
export const TakeHomeCalculatorSummary = CalculatorSummary.make({
  calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
  context: {
    jurisdiction: AuPayJurisdiction.make("AU"),
    taxYear: AuPayTaxYear.make("2025-26"),
  },
  title: "AU take-home pay",
});

export const PayWithholdingsCalculatorSummary = CalculatorSummary.make({
  calculatorId: AuPayCalculatorId.make("au.pay.withholdings"),
  context: TakeHomeCalculatorSummary.context,
  title: "AU pay withholdings",
});

export const AnnualTaxCalculatorSummary = CalculatorSummary.make({
  calculatorId: AuAnnualTaxCalculatorId.make("au.income-tax.annual"),
  context: {
    jurisdiction: AuAnnualTaxJurisdiction.make("AU"),
    taxYear: AuAnnualTaxYear.make("2025-26"),
  },
  title: "AU annual income tax",
});

export const CalculatorSummaries: readonly CalculatorSummary[] = [
  TakeHomeCalculatorSummary,
  PayWithholdingsCalculatorSummary,
  AnnualTaxCalculatorSummary,
];
