/**
 * Public annual-income-tax calculator entrypoint.
 *
 * @since 0.1.0
 */
export {
  AnnualTaxReport,
  AnnualTaxScenarioInputSchema,
  AnnualTaxScenarioLive,
  CalculateAnnualTax,
  type AnnualTaxScenarioInput,
} from "./annual-tax.js";
export {
  AuAnnualTaxCalculatorId,
  AuAnnualTaxContext,
  AuAnnualTaxJurisdiction,
  AuAnnualTaxYear,
  type AuAnnualTaxCalculatorId as AuAnnualTaxCalculatorIdType,
  type AuAnnualTaxContext as AuAnnualTaxContextType,
  type AuAnnualTaxJurisdiction as AuAnnualTaxJurisdictionType,
  type AuAnnualTaxYear as AuAnnualTaxYearType,
} from "./metadata.js";
