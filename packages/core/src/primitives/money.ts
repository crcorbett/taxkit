import { Schema } from "effect";

export const Cents = Schema.Int.pipe(Schema.brand("whattax/Cents"));
export type Cents = typeof Cents.Type;

export const Currency = Schema.Literal("AUD");
export type Currency = typeof Currency.Type;

export class Money extends Schema.TaggedClass<Money>()("Money", {
  cents: Cents,
  currency: Currency,
}) {}

export const aud = (cents: number): Money =>
  new Money({ cents: Cents.make(cents), currency: "AUD" });

export const audDollars = (dollars: number): Money =>
  aud(Math.round(dollars * 100));

export const moneyAdd = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) {
    throw new Error(
      `whattax/core: cannot add money in ${a.currency} and ${b.currency}`,
    );
  }
  return aud(a.cents + b.cents);
};

export const moneySub = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) {
    throw new Error(
      `whattax/core: cannot subtract money in ${a.currency} and ${b.currency}`,
    );
  }
  return aud(a.cents - b.cents);
};

export const moneyEquals = (a: Money, b: Money): boolean =>
  a.cents === b.cents && a.currency === b.currency;
