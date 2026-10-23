import { Effect, Match, Schema, SchemaGetter, SchemaIssue } from "effect";

import { InvalidDollarsText } from "./errors.js";
import { Money, aud } from "./money.js";
import { decimalCoefficient, decimalDollarsToCents } from "./tax.js";

// Zero or more whole dollars with up to two decimal places. No sign, grouping,
// currency symbol or exponent.
const plainDollars = /^\d+(?:\.\d{1,2})?$/u;

/**
 * Reads typed dollar text, such as `"80000"` or `" 1234.50 "`, as Money.
 * Surrounding spaces are ignored and the amount converts exactly to whole
 * cents. Fails with `InvalidDollarsText` and its reason.
 *
 * @example
 * ```ts
 * import { moneyFromDollarsText } from "taxkit/core";
 * import { Effect, Match } from "effect";
 *
 * const income = moneyFromDollarsText("80000").pipe(
 *   Effect.mapError(({ reason }) =>
 *     Match.value(reason).pipe(
 *       Match.when("empty", () => "Enter your income."),
 *       Match.orElse(() => "Check the amount.")
 *     )
 *   )
 * );
 * ```
 *
 * @since 2.2.0
 */
export const moneyFromDollarsText = (
  text: string
): Effect.Effect<Money, InvalidDollarsText> => {
  const dollars = text.trim();
  if (dollars.length === 0) {
    return Effect.fail(new InvalidDollarsText({ reason: "empty" }));
  }
  if (!plainDollars.test(dollars)) {
    return Effect.fail(new InvalidDollarsText({ reason: "format" }));
  }
  return decimalCoefficient(dollars).pipe(
    Effect.flatMap(decimalDollarsToCents),
    Effect.map(aud),
    Effect.mapError(() => new InvalidDollarsText({ reason: "range" }))
  );
};

/**
 * Writes Money as plain dollars with two decimal places, which
 * `moneyFromDollarsText` reads back unchanged.
 *
 * @since 2.2.0
 */
export const dollarsTextFromMoney = (money: Money): string => {
  const cents = BigInt(money.cents);
  const sign = cents < 0n ? "-" : "";
  const magnitude = cents < 0n ? -cents : cents;
  return `${sign}${magnitude / 100n}.${(magnitude % 100n).toString().padStart(2, "0")}`;
};

/**
 * Schema codec between typed dollar text and non-negative Money, with
 * TaxKit's default messages. For your own wording, build a codec from
 * `moneyFromDollarsText` and match on the failure's `reason`.
 *
 * @since 2.2.0
 */
export const MoneyFromDollarsString = Schema.String.pipe(
  Schema.decodeTo(Schema.toType(Money), {
    decode: SchemaGetter.transformEffect((text: string) =>
      moneyFromDollarsText(text).pipe(
        Effect.mapError(
          ({ reason }) =>
            new SchemaIssue.InvalidValue(
              {
                message: Match.value(reason).pipe(
                  Match.when("empty", () => "Enter an amount."),
                  Match.when(
                    "format",
                    () =>
                      "Use a dollar amount with up to two decimal places and no commas."
                  ),
                  Match.when(
                    "range",
                    () => "That amount is outside the supported range."
                  ),
                  Match.exhaustive
                ),
              },
              text
            )
        )
      )
    ),
    encode: SchemaGetter.transform(dollarsTextFromMoney),
  })
);
