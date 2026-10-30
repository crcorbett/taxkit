import { TaxKit } from "./index.js";
import {
  AuAnnualIncomeTaxCalculation,
  AuIncomeTax2025_26Module,
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
} from "./internal/au-descriptors.js";
import type { CalculationInput } from "./types.js";

export { GrossPay } from "@taxkit/rules-au-pay";
export { default as PayRules } from "./internal/compatibility/pay-rules.js";
export { default as IncomeTaxRules } from "./internal/compatibility/income-tax-rules.js";
export { default as StslRules } from "./internal/compatibility/stsl-rules.js";
export {
  AtoSchedule1Table,
  AtoSchedule1TableDescriptor,
  AtoSchedule1_2024_25_Live,
  AtoSchedule1_2025_26_Live,
  Schedule1Artifact2025_26,
  Schedule1Row,
  Schedule1Scale,
  Schedule1Source2025_26,
  Schedule1Table,
} from "@taxkit/rules-au-pay/parameters";
export {
  AtoIncomeTaxTable,
  AtoIncomeTaxTableDescriptor,
  AtoIncomeTax_2025_26_Live,
  AtoLitoTable,
  AtoLitoTableDescriptor,
  AtoLito_2025_26_Live,
  AtoMedicareLevyTable,
  AtoMedicareLevyTableDescriptor,
  AtoMedicareLevy_2025_26_Live,
  IncomeTaxArtifact2025_26,
  IncomeTaxBracket,
  IncomeTaxSource2025_26,
  IncomeTaxTable,
  LitoArtifact2025_26,
  LitoBracket,
  LitoSource2025_26,
  LitoTable,
  MedicareLevyArtifact2025_26,
  MedicareLevySource2025_26,
  MedicareLevyTable,
} from "@taxkit/rules-au-income-tax/parameters";
export {
  AtoStslNoThresholdTable,
  AtoStslNoThresholdTableDescriptor,
  AtoStslTable,
  AtoStslTableDescriptor,
  AtoStsl_2025_26_Live,
  StslArtifact2025_26,
  StslRow,
  StslSource2025_26,
  StslTable,
} from "@taxkit/rules-au-stsl/parameters";

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
