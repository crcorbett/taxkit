import { AuAnnualIncomeTaxCalculation } from "@taxkit/rules-au-income-tax/calculator";
import {
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
} from "@taxkit/rules-au-pay/calculator";

import { calculate } from "./client.runtime.js";
import type { CalculationInput } from "./types.js";

export { AuAnnualIncomeTaxCalculation } from "@taxkit/rules-au-income-tax/calculator";
export {
  AuPayTakeHomeWithSacrificeCalculation,
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
} from "@taxkit/rules-au-pay/calculator";
export const takeHomePay = (
  input: CalculationInput<typeof AuPayTakeHomeCalculation>
) => calculate(AuPayTakeHomeCalculation, input);
export const payWithholdings = (
  input: CalculationInput<typeof AuPayWithholdingsCalculation>
) => calculate(AuPayWithholdingsCalculation, input);
export const annualIncomeTax = (
  input: CalculationInput<typeof AuAnnualIncomeTaxCalculation>
) => calculate(AuAnnualIncomeTaxCalculation, input);
