import { Schema } from "effect";

export const AuAnnualTaxCalculatorId = Schema.Literals([
  "au.income-tax.annual",
]).pipe(Schema.brand("whattax/CalculatorId"));

export type AuAnnualTaxCalculatorId = typeof AuAnnualTaxCalculatorId.Type;

export const AuAnnualTaxJurisdiction = Schema.Literals(["AU"]).pipe(
  Schema.brand("whattax/Jurisdiction")
);

export type AuAnnualTaxJurisdiction = typeof AuAnnualTaxJurisdiction.Type;

export const AuAnnualTaxYear = Schema.Literal("2025-26").pipe(
  Schema.brand("whattax/TaxYear")
);

export type AuAnnualTaxYear = typeof AuAnnualTaxYear.Type;

export const AuAnnualTaxContext = Schema.Struct({
  jurisdiction: AuAnnualTaxJurisdiction,
  taxYear: AuAnnualTaxYear,
});

export type AuAnnualTaxContext = typeof AuAnnualTaxContext.Type;
