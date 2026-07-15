import { TaxKit } from "./index.js";
import {
  AuAnnualIncomeTaxCalculation,
  AuIncomeTax2025_26Module,
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
} from "./internal/au-descriptors.js";
import type { CalculationInput } from "./types.js";

export {
  AuAnnualIncomeTaxCalculation,
  AuIncomeTax2025_26Module,
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
} from "./internal/au-descriptors.js";

const createAuClient = () =>
  TaxKit.createClient(AuPay2025_26Module, AuIncomeTax2025_26Module);

export const au = {
  calculations: {
    annualIncomeTax: AuAnnualIncomeTaxCalculation,
    payWithholdings: AuPayWithholdingsCalculation,
    takeHomePay: AuPayTakeHomeCalculation,
  },
  createClient: createAuClient,
  incomeTax: {
    annual: (input: CalculationInput<typeof AuAnnualIncomeTaxCalculation>) =>
      TaxKit.calculate(AuAnnualIncomeTaxCalculation, input),
    calculation: AuAnnualIncomeTaxCalculation,
    safe: {
      annual: (input: CalculationInput<typeof AuAnnualIncomeTaxCalculation>) =>
        TaxKit.safe.calculate(AuAnnualIncomeTaxCalculation, input),
    },
  },
  modules: {
    incomeTax2025_26: AuIncomeTax2025_26Module,
    pay2025_26: AuPay2025_26Module,
  },
  pay: {
    calculations: {
      takeHomePay: AuPayTakeHomeCalculation,
      withholdings: AuPayWithholdingsCalculation,
    },
    safe: {
      takeHomePay: (input: CalculationInput<typeof AuPayTakeHomeCalculation>) =>
        TaxKit.safe.calculate(AuPayTakeHomeCalculation, input),
      withholdings: (
        input: CalculationInput<typeof AuPayWithholdingsCalculation>
      ) => TaxKit.safe.calculate(AuPayWithholdingsCalculation, input),
    },
    takeHomePay: (input: CalculationInput<typeof AuPayTakeHomeCalculation>) =>
      TaxKit.calculate(AuPayTakeHomeCalculation, input),
    withholdings: (
      input: CalculationInput<typeof AuPayWithholdingsCalculation>
    ) => TaxKit.calculate(AuPayWithholdingsCalculation, input),
  },
} as const;
