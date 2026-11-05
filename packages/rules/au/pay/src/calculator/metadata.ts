import { Schema } from "effect";

export const AuPayTakeHomeId = Schema.Literal("au.pay.take-home").pipe(
  Schema.brand("taxkit/CalculatorId")
);
export const AuPayWithholdingsId = Schema.Literal("au.pay.withholdings").pipe(
  Schema.brand("taxkit/CalculatorId")
);
export const AuPayWithSacrificeId = Schema.Literal(
  "au.pay.take-home-with-sacrifice"
).pipe(Schema.brand("taxkit/CalculatorId"));
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
