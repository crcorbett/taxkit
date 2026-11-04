import {
  Boolean as EffectBoolean,
  Function as EffectFunction,
  Effect,
  Result,
  Schema,
  SchemaGetter,
  SchemaIssue,
} from "effect";

import { MoneyError } from "./errors.js";
import { Money, NonNegativeMoney, fromCents } from "./money.js";

/** Parse exact decimal dollars, including signed adjustments. */
export const fromDecimal = (text: string): Result.Result<Money, MoneyError> => {
  const dollars = text.trim();
  if (dollars.length === 0) {
    return Result.fail(new MoneyError({ reason: "empty" }));
  }
  if (!/^-?\d+(?:\.\d{1,2})?$/u.test(dollars)) {
    return Result.fail(new MoneyError({ reason: "format" }));
  }
  // Restrict size before BigInt acquisition; leading zeroes have no monetary value.
  const normalized = dollars.replace(/^-?0*/u, "");
  if (normalized.length > 18) {
    return Result.fail(new MoneyError({ reason: "range" }));
  }
  const negative = dollars.startsWith("-");
  const magnitude = dollars.replace(/^-?0*/u, "");
  const [whole = "", fraction = ""] = magnitude.split(".");
  const cents =
    EffectFunction.pipe(whole || "0", BigInt) * 100n +
    EffectFunction.pipe(fraction.padEnd(2, "0"), BigInt);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    return Result.fail(new MoneyError({ reason: "range" }));
  }
  return EffectFunction.pipe(
    EffectBoolean.match(negative, {
      onTrue: () => -cents,
      onFalse: () => cents,
    }),
    Number,
    fromCents
  );
};

/** Canonical decimal dollars with two fractional digits. */
export const format = (money: Money): string => {
  const cents = BigInt(money.cents);
  const magnitude = EffectBoolean.match(cents < 0n, {
    onTrue: () => -cents,
    onFalse: () => cents,
  });
  return `${EffectBoolean.match(cents < 0n, { onTrue: () => "-", onFalse: () => "" })}${magnitude / 100n}.${(magnitude % 100n).toString().padStart(2, "0")}`;
};

export const MoneyFromDecimalString = Schema.String.pipe(
  Schema.decodeTo(Schema.toType(Money), {
    decode: SchemaGetter.transformEffect((text: string) =>
      fromDecimal(text).pipe(
        Result.mapError(
          () =>
            new SchemaIssue.InvalidValue({
              message: "Expected exact decimal AUD dollars in range.",
            })
        ),
        Effect.fromResult
      )
    ),
    encode: SchemaGetter.transform(format),
  })
);
export const NonNegativeMoneyFromDecimalString = MoneyFromDecimalString.pipe(
  Schema.decodeTo(Schema.toType(NonNegativeMoney))
);
