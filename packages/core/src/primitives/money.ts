import { Schema } from "effect";

/**
 * Whole cents used by all money values in the core package.
 *
 * @since 0.1.0
 */
export const Cents = Schema.Int.pipe(Schema.brand("whattax/Cents"));

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
 * import { aud } from "@whattax/core";
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
 * import { audDollars } from "@whattax/core";
 *
 * const amount = audDollars(42.5);
 * ```
 *
 * @since 0.1.0
 */
export const audDollars = (dollars: number): Money =>
  aud(Math.round(dollars * 100));

/**
 * Adds two money values after checking they use the same currency.
 *
 * @since 0.1.0
 */
export const moneyAdd = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) {
    throw new Error("whattax/core: cannot add money with different currencies");
  }
  return aud(a.cents + b.cents);
};

/**
 * Subtracts one money value from another after checking currency equality.
 *
 * @since 0.1.0
 */
export const moneySub = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) {
    throw new Error(
      "whattax/core: cannot subtract money with different currencies"
    );
  }
  return aud(a.cents - b.cents);
};

/**
 * Tests money values for exact cent and currency equality.
 *
 * @since 0.1.0
 */
export const moneyEquals = (a: Money, b: Money): boolean =>
  a.cents === b.cents && a.currency === b.currency;
