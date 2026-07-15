import { Schema } from "effect";

export const AuPayCalculatorId = Schema.Literals([
  "au.pay.take-home",
  "au.pay.withholdings",
]).pipe(Schema.brand("taxkit/CalculatorId"));

export type AuPayCalculatorId = typeof AuPayCalculatorId.Type;

export const AuPayJurisdiction = Schema.Literals(["AU"]).pipe(
  Schema.brand("taxkit/Jurisdiction")
);

export type AuPayJurisdiction = typeof AuPayJurisdiction.Type;

export const AuPayTaxYear = Schema.Literal("2025-26").pipe(
  Schema.brand("taxkit/TaxYear")
);

export type AuPayTaxYear = typeof AuPayTaxYear.Type;

export const AuPayContext = Schema.Struct({
  jurisdiction: AuPayJurisdiction,
  taxYear: AuPayTaxYear,
});

export type AuPayContext = typeof AuPayContext.Type;
