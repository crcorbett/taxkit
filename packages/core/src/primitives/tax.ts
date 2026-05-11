import { Schema } from "effect";
import { Cents } from "./money.js";

export const TaxYear = Schema.String.pipe(Schema.brand("whattax/TaxYear"));
export type TaxYear = typeof TaxYear.Type;

export const TaxRate = Schema.Number.pipe(Schema.brand("whattax/TaxRate"));
export type TaxRate = typeof TaxRate.Type;

export const DecimalCoefficient = Schema.Number.pipe(
  Schema.brand("whattax/DecimalCoefficient"),
);
export type DecimalCoefficient = typeof DecimalCoefficient.Type;

export const CentsOrInfinity = Schema.Union([
  Cents,
  Schema.Literals(["infinity"]),
]);
export type CentsOrInfinity = typeof CentsOrInfinity.Type;

export const taxYear = (value: string): TaxYear => TaxYear.make(value);
export const taxRate = (value: number): TaxRate => TaxRate.make(value);
export const decimalCoefficient = (value: number): DecimalCoefficient =>
  DecimalCoefficient.make(value);
