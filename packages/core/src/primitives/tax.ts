import { Schema } from "effect";

import { Cents } from "./money.js";

/**
 * A stable tax year identifier such as `2025-26`.
 *
 * @since 0.1.0
 */
export const TaxYear = Schema.String.pipe(Schema.brand("whattax/TaxYear"));

/**
 * A stable tax year identifier such as `2025-26`.
 *
 * @since 0.1.0
 */
export type TaxYear = typeof TaxYear.Type;

/**
 * A tax rate stored as a decimal fraction, for example `0.325` for 32.5%.
 *
 * @since 0.1.0
 */
export const TaxRate = Schema.Number.pipe(Schema.brand("whattax/TaxRate"));

/**
 * A tax rate stored as a decimal fraction, for example `0.325` for 32.5%.
 *
 * @since 0.1.0
 */
export type TaxRate = typeof TaxRate.Type;

/**
 * A decimal multiplier used by formula tables and derived calculations.
 *
 * @since 0.1.0
 */
export const DecimalCoefficient = Schema.Number.pipe(
  Schema.brand("whattax/DecimalCoefficient")
);

/**
 * A decimal multiplier used by formula tables and derived calculations.
 *
 * @since 0.1.0
 */
export type DecimalCoefficient = typeof DecimalCoefficient.Type;

/**
 * A cent threshold that may have an open-ended upper bound.
 *
 * @since 0.1.0
 */
export const CentsOrInfinity = Schema.Union([
  Cents,
  Schema.Literals(["infinity"]),
]);

/**
 * A cent threshold that may have an open-ended upper bound.
 *
 * @since 0.1.0
 */
export type CentsOrInfinity = typeof CentsOrInfinity.Type;

/**
 * Brands a string as a tax year identifier.
 *
 * @since 0.1.0
 */
export const taxYear = (value: string): TaxYear => TaxYear.make(value);

/**
 * Brands a number as a decimal tax rate.
 *
 * @since 0.1.0
 */
export const taxRate = (value: number): TaxRate => TaxRate.make(value);

/**
 * Brands a number as a decimal coefficient.
 *
 * @since 0.1.0
 */
export const decimalCoefficient = (value: number): DecimalCoefficient =>
  DecimalCoefficient.make(value);
