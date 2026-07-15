import {
  AnnualTaxReport,
  AnnualTaxScenarioInputSchema,
  AuAnnualTaxCalculatorId,
  AuAnnualTaxJurisdiction,
  AuAnnualTaxYear,
} from "@taxkit/rules-au-income-tax";
import {
  AuPayCalculatorId,
  AuPayJurisdiction,
  AuPayTaxYear,
  PayWithholdingsLedger,
  TakeHomePayReport,
  TakeHomeScenarioInputSchema,
} from "@taxkit/rules-au-pay";

import { defineSdkCalculation, defineTaxKitModule } from "../types.js";

export const AuPayTakeHomeCalculation = defineSdkCalculation({
  calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
  inputSchema: TakeHomeScenarioInputSchema,
  jurisdiction: AuPayJurisdiction.make("AU"),
  outputSchema: TakeHomePayReport,
  taxYear: AuPayTaxYear.make("2025-26"),
});

export const AuPayWithholdingsCalculation = defineSdkCalculation({
  calculatorId: AuPayCalculatorId.make("au.pay.withholdings"),
  inputSchema: TakeHomeScenarioInputSchema,
  jurisdiction: AuPayJurisdiction.make("AU"),
  outputSchema: PayWithholdingsLedger,
  taxYear: AuPayTaxYear.make("2025-26"),
});

export const AuAnnualIncomeTaxCalculation = defineSdkCalculation({
  calculatorId: AuAnnualTaxCalculatorId.make("au.income-tax.annual"),
  inputSchema: AnnualTaxScenarioInputSchema,
  jurisdiction: AuAnnualTaxJurisdiction.make("AU"),
  outputSchema: AnnualTaxReport,
  taxYear: AuAnnualTaxYear.make("2025-26"),
});

export const AuPay2025_26Module = defineTaxKitModule({
  calculations: [
    AuPayTakeHomeCalculation,
    AuPayWithholdingsCalculation,
  ] as const,
  id: "au/pay/2025-26",
  jurisdiction: AuPayJurisdiction.make("AU"),
  taxYear: AuPayTaxYear.make("2025-26"),
});

export const AuIncomeTax2025_26Module = defineTaxKitModule({
  calculations: [AuAnnualIncomeTaxCalculation] as const,
  id: "au/income-tax/2025-26",
  jurisdiction: AuAnnualTaxJurisdiction.make("AU"),
  taxYear: AuAnnualTaxYear.make("2025-26"),
});
