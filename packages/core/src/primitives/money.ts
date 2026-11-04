import { Result, Schema, Match, Function as EffectFunction } from "effect";

import { MoneyError } from "./errors.js";
import { roundCentsToDollar } from "./rounding.js";
import type { RoundingMode } from "./rounding.js";

/** Whole, safe integer AUD cents. */
export const Cents = Schema.Int.pipe(Schema.brand("taxkit/Cents"));
export type Cents = typeof Cents.Type;
export const Currency = Schema.Literal("AUD");
export type Currency = typeof Currency.Type;

/** Signed AUD money. Construct trusted constants from checked cents. */
export class Money extends Schema.TaggedClass<
  Money,
  { readonly brand: unique symbol }
>()("Money", {
  cents: Cents,
  currency: Currency,
}) {
  static readonly fromCents = (cents: Cents): Money =>
    new Money({ cents, currency: "AUD" });
}

/** An amount admitted only after checking that it is non-negative. */
export const NonNegativeMoney = Money.check(
  Schema.makeFilter((money) => money.cents >= 0, {
    expected: "non-negative AUD money",
  })
).pipe(Schema.brand("taxkit/NonNegativeMoney"));
export type NonNegativeMoney = typeof NonNegativeMoney.Type;

/** Check arbitrary cents without silently rounding fractional values. */
export const fromCents = (cents: number): Result.Result<Money, MoneyError> =>
  Schema.decodeResult(Cents)(cents).pipe(
    Result.map(Money.fromCents),
    Result.mapError(
      () =>
        new MoneyError({
          reason: Match.value(cents).pipe(
            Match.when(
              (value) => !Number.isFinite(value),
              (): "non-finite" => "non-finite"
            ),
            Match.when(
              (value) => !Number.isInteger(value),
              (): "fractional-cents" => "fractional-cents"
            ),
            Match.orElse((): "range" => "range")
          ),
        })
    )
  );

export const nonNegative = (
  money: Money
): Result.Result<NonNegativeMoney, MoneyError> =>
  Schema.decodeUnknownResult(Schema.toType(NonNegativeMoney))(money).pipe(
    Result.mapError(() => new MoneyError({ reason: "negative" }))
  );

export const add = (a: Money, b: Money): Result.Result<Money, MoneyError> =>
  fromCents(a.cents + b.cents).pipe(
    Result.mapError(() => new MoneyError({ reason: "overflow" }))
  );
export const subtract = (
  a: Money,
  b: Money
): Result.Result<Money, MoneyError> =>
  fromCents(a.cents - b.cents).pipe(
    Result.mapError(() => new MoneyError({ reason: "overflow" }))
  );
export const moneyEquals = (a: Money, b: Money): boolean =>
  a.cents === b.cents && a.currency === b.currency;

export const round = (
  money: Money,
  policy: RoundingMode
): Result.Result<Money, MoneyError> =>
  EffectFunction.pipe(
    roundCentsToDollar(money.cents, policy),
    fromCents,
    Result.mapError(() => new MoneyError({ reason: "overflow" }))
  );
