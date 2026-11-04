import { AuAnnualIncomeTaxCalculation } from "@taxkit/rules-au-income-tax";
import { AuPayTakeHomeCalculation, AuPayWithholdingsCalculation } from "@taxkit/rules-au-pay";
import { calculate } from "./client.runtime.js";
import type { CalculationInput } from "./types.js";

export { AuAnnualIncomeTaxCalculation } from "@taxkit/rules-au-income-tax";
export { AuPayTakeHomeWithSacrificeCalculation, AuPayTakeHomeCalculation, AuPayWithholdingsCalculation } from "@taxkit/rules-au-pay";
export const takeHomePay = (input: CalculationInput<typeof AuPayTakeHomeCalculation>) => calculate(AuPayTakeHomeCalculation, input);
export const payWithholdings = (input: CalculationInput<typeof AuPayWithholdingsCalculation>) => calculate(AuPayWithholdingsCalculation, input);
export const annualIncomeTax = (input: CalculationInput<typeof AuAnnualIncomeTaxCalculation>) => calculate(AuAnnualIncomeTaxCalculation, input);
