import { BigDecimal, Effect, Schema } from "effect";

import { InvalidDecimalValue, InvalidMoneyValue } from "./errors.js";
import { Cents } from "./money.js";

/**
 * A stable calculator identifier such as `au.pay.take-home`.
 *
 * @since 0.1.0
 */
export const CalculatorId = Schema.String.pipe(
  Schema.brand("taxkit/CalculatorId")
);

/**
 * A stable calculator identifier such as `au.pay.take-home`.
 *
 * @since 0.1.0
 */
export type CalculatorId = typeof CalculatorId.Type;

/**
 * A stable jurisdiction identifier such as `AU`.
 *
 * @since 0.1.0
 */
export const Jurisdiction = Schema.String.pipe(
  Schema.brand("taxkit/Jurisdiction")
);

/**
 * A stable jurisdiction identifier such as `AU`.
 *
 * @since 0.1.0
 */
export type Jurisdiction = typeof Jurisdiction.Type;

/**
 * A stable tax year identifier such as `2025-26`.
 *
 * @since 0.1.0
 */
export const TaxYear = Schema.String.pipe(Schema.brand("taxkit/TaxYear"));

/**
 * A stable tax year identifier such as `2025-26`.
 *
 * @since 0.1.0
 */
export type TaxYear = typeof TaxYear.Type;

/**
 * A tax rate stored as an exact decimal fraction, for example `0.325` for
 * 32.5%.
 *
 * @since 0.1.0
 */
export const TaxRate = Schema.BigDecimal.pipe(Schema.brand("taxkit/TaxRate"));

/**
 * A tax rate stored as an exact decimal fraction, for example `0.325` for
 * 32.5%.
 *
 * @since 0.1.0
 */
export type TaxRate = typeof TaxRate.Type;

/**
 * A decimal multiplier used by formula tables and derived calculations.
 *
 * @since 0.1.0
 */
export const DecimalCoefficient = Schema.BigDecimal.pipe(
  Schema.brand("taxkit/DecimalCoefficient")
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
 * Brands a string as a calculator identifier.
 *
 * @since 0.1.0
 */
export const calculatorId = (value: string): CalculatorId =>
  CalculatorId.make(value);

/**
 * Brands a string as a jurisdiction identifier.
 *
 * @since 0.1.0
 */
export const jurisdiction = (value: string): Jurisdiction =>
  Jurisdiction.make(value);

/**
 * Brands a string as a tax year identifier.
 *
 * @since 0.1.0
 */
export const taxYear = (value: string): TaxYear => TaxYear.make(value);

/**
 * Parses and brands a string as a decimal tax rate.
 *
 * @since 0.1.0
 */
export const taxRate = (
  value: string
): Effect.Effect<TaxRate, InvalidDecimalValue> =>
  BigDecimal.fromString(value).pipe(
    Effect.fromOption(() => new InvalidDecimalValue()),
    Effect.map((decimal) => TaxRate.make(decimal))
  );

/**
 * Parses and brands a string as a decimal coefficient.
 *
 * @since 0.1.0
 */
export const decimalCoefficient = (
  value: string
): Effect.Effect<DecimalCoefficient, InvalidDecimalValue> =>
  BigDecimal.fromString(value).pipe(
    Effect.fromOption(() => new InvalidDecimalValue()),
    Effect.map((decimal) => DecimalCoefficient.make(decimal))
  );

const roundScaledInteger = (value: bigint, scale: number): bigint => {
  if (scale === 0) {
    return value;
  }

  const divisor = 10n ** BigInt(scale);
  const half = divisor / 2n;
  return value >= 0n ? (value + half) / divisor : (value - half) / divisor;
};

// Bound the power before constructing it. The decimal parser admits very large
// exponents; they must produce a checked result rather than a BigInt defect.
const roundDecimalToCents = (
  value: BigDecimal.BigDecimal
): Effect.Effect<Cents, InvalidMoneyValue> => {
  const magnitude = value.value < 0n ? -value.value : value.value;
  const digits = magnitude.toString().length;
  if (magnitude === 0n || value.scale > digits) {
    return Effect.succeed(Cents.make(0));
  }
  if (digits - value.scale > Number.MAX_SAFE_INTEGER.toString().length) {
    return Effect.fail(new InvalidMoneyValue());
  }
  const rounded =
    value.scale <= 0
      ? value.value * 10n ** BigInt(Math.abs(value.scale))
      : roundScaledInteger(value.value, value.scale);
  return Cents.makeEffect(Number(rounded)).pipe(
    Effect.mapError(() => new InvalidMoneyValue())
  );
};

/**
 * Multiplies integer cents by a decimal coefficient and rounds once to cents.
 *
 * The coefficient is an Effect `BigDecimal`, so rule formulas avoid binary
 * floating-point operations. This is the preferred helper for tax rates,
 * phase-out rates, and official formula coefficients.
 *
 * @since 0.1.0
 */
export const multiplyCentsByDecimal = (
  cents: Cents,
  coefficient: TaxRate | DecimalCoefficient
): Effect.Effect<Cents, InvalidMoneyValue> => {
  const product = BigDecimal.multiply(
    BigDecimal.make(BigInt(cents), 0),
    coefficient
  );
  return roundDecimalToCents(product);
};

/**
 * Converts a decimal dollar amount from an official table into integer cents.
 *
 * @since 0.1.0
 */
export const decimalDollarsToCents = (
  dollars: DecimalCoefficient
): Effect.Effect<Cents, InvalidMoneyValue> => {
  const cents = BigDecimal.multiply(dollars, BigDecimal.make(100n, 0));
  return roundDecimalToCents(cents);
};
