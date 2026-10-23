import { Effect, Match, Schema, SchemaGetter, SchemaIssue } from "effect";

import { Money, aud } from "./money.js";
import { decimalCoefficient, decimalDollarsToCents } from "./tax.js";

/**
 * Why dollar text could not become Money: it was blank, was not plain decimal
 * dollars, or does not fit in safe whole cents.
 *
 * @since 2.2.0
 */
export const DollarsTextIssue = Schema.Literals(["empty", "format", "range"]);

/**
 * Why dollar text could not become Money.
 *
 * @since 2.2.0
 */
export type DollarsTextIssue = typeof DollarsTextIssue.Type;

// Zero or more whole dollars with up to two decimal places. No sign, grouping,
// currency symbol or exponent.
const plainDollars = /^\d+(?:\.\d{1,2})?$/u;

const NonNegativeMoney = Schema.toType(Money).check(
  Schema.makeFilter((money) => money.cents >= 0, {
    expected: "an amount of zero or more",
  })
);

/**
 * Builds a codec between typed dollar text, such as `"80000"` or
 * `"1234.50"`, and non-negative `Money`. Surrounding spaces are ignored; the
 * amount converts exactly to whole cents. Encoding writes plain dollars with
 * two decimal places. Pass `messages` to replace the wording for a reason.
 *
 * @example
 * ```ts
 * import { moneyFromDollarsString } from "taxkit/core";
 * import { Schema } from "effect";
 *
 * const TaxableIncome = moneyFromDollarsString({
 *   messages: { empty: "Enter your annual taxable income." },
 * });
 * const income = Schema.decodeUnknownEffect(TaxableIncome)("80000");
 * ```
 *
 * @since 2.2.0
 */
export const moneyFromDollarsString = (options?: {
  readonly messages?: Partial<Readonly<Record<DollarsTextIssue, string>>>;
}) => {
  const issue = (reason: DollarsTextIssue, text: string) =>
    new SchemaIssue.InvalidValue(
      {
        message: Match.value(reason).pipe(
          Match.when(
            "empty",
            () => options?.messages?.empty ?? "Enter an amount."
          ),
          Match.when(
            "format",
            () =>
              options?.messages?.format ??
              "Use a dollar amount with up to two decimal places and no commas."
          ),
          Match.when(
            "range",
            () =>
              options?.messages?.range ??
              "That amount is outside the supported range."
          ),
          Match.exhaustive
        ),
      },
      text
    );
  return Schema.String.pipe(
    Schema.decodeTo(NonNegativeMoney, {
      decode: SchemaGetter.transformEffect((text: string) => {
        const dollars = text.trim();
        if (dollars.length === 0) {
          return Effect.fail(issue("empty", text));
        }
        if (!plainDollars.test(dollars)) {
          return Effect.fail(issue("format", text));
        }
        return decimalCoefficient(dollars).pipe(
          Effect.flatMap(decimalDollarsToCents),
          Effect.map(aud),
          Effect.mapError(() => issue("range", text))
        );
      }),
      encode: SchemaGetter.transform((money: Money) => {
        const cents = BigInt(money.cents);
        return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
      }),
    })
  );
};

/**
 * Typed dollar text to non-negative `Money`, with TaxKit's default messages.
 *
 * @since 2.2.0
 */
export const MoneyFromDollarsString = moneyFromDollarsString();
