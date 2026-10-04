import { Schema } from "effect";

/**
 * Whole cents used by all money values in the core package.
 *
 * @since 0.1.0
 */
export const Cents = Schema.Int.pipe(Schema.brand("taxkit/Cents"));

/**
 * Whole cents used by all money values in the core package.
 *
 * @since 0.1.0
 */
export type Cents = typeof Cents.Type;

/**
 * The currency supported by core tax calculations.
 *
 * @since 0.1.0
 */
export const Currency = Schema.Literal("AUD");

/**
 * The currency supported by core tax calculations.
 *
 * @since 0.1.0
 */
export type Currency = typeof Currency.Type;

/**
 * An AUD amount represented as integer cents.
 *
 * @example
 * ```ts
 * import { aud } from "@taxkit/core";
 *
 * const withholding = aud(12_345);
 * ```
 *
 * @since 0.1.0
 */
export class Money extends Schema.TaggedClass<Money>()("Money", {
  cents: Cents,
  currency: Currency,
}) {}

/**
 * Creates an AUD money value from integer cents.
 *
 * @since 0.1.0
 */
export const aud = (cents: number): Money =>
  new Money({ cents: Cents.make(cents), currency: "AUD" });

/**
 * Creates an AUD money value from dollars, rounded to the nearest cent.
 *
 * @example
 * ```ts
 * import { audDollars } from "@taxkit/core";
 *
 * const amount = audDollars(42.5);
 * ```
 *
 * @since 0.1.0
 */
export const audDollars = (dollars: number): Money =>
  aud(Math.round(dollars * 100));

/**
 * Adds two checked AUD money values.
 *
 * @since 0.1.0
 */
export const moneyAdd = (a: Money, b: Money): Money => aud(a.cents + b.cents);

/**
 * Subtracts one checked AUD money value from another.
 *
 * @since 0.1.0
 */
export const moneySub = (a: Money, b: Money): Money => aud(a.cents - b.cents);

/**
 * Tests money values for exact cent and currency equality.
 *
 * @since 0.1.0
 */
export const moneyEquals = (a: Money, b: Money): boolean =>
  a.cents === b.cents && a.currency === b.currency;
