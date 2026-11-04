import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Effect, Predicate, Schema } from "effect";

import {
  MoneyFromDecimalString,
  format,
  fromDecimal,
} from "../src/primitives/index.js";
import { Money,  Cents } from "../src/primitives/money.js";

const tagged = (reason: string) => [true, "invalid-money", reason];
describe("dollar text to Money", () => {
  it.effect("reads plain dollars exactly as whole cents", () =>
    Effect.gen(function* () {
      expect(yield* fromDecimal(" 35013.01 ")).toStrictEqual(
        EffectFunction.pipe(Cents.make(3_501_301), Money.fromCents)
      );
      expect(yield* fromDecimal("0")).toStrictEqual(
        EffectFunction.pipe(Cents.make(0), Money.fromCents)
      );
      expect(yield* fromDecimal("80000.5")).toStrictEqual(
        EffectFunction.pipe(Cents.make(8_000_050), Money.fromCents)
      );
      expect(yield* fromDecimal("90071992547409.91")).toStrictEqual(
        EffectFunction.pipe(Cents.make(Number.MAX_SAFE_INTEGER), Money.fromCents)
      );
    })
  );
  it.effect("fails with a typed reason callers can match", () =>
    Effect.gen(function* () {
      const reasons = yield* Effect.forEach(
        ["", "  ", "1,000", "1.001", "$5", "1e3", "90071992547409.92"],
        (text) =>
          fromDecimal(text).pipe(
            Effect.flip,
            Effect.map((error) => [
              Predicate.isTagged(error, "MoneyError"),
              error.code,
              error.reason,
            ])
          )
      );
      expect(reasons).toStrictEqual([
        tagged("empty"),
        tagged("empty"),
        tagged("format"),
        tagged("format"),
        tagged("format"),
        tagged("format"),
        tagged("range"),
      ]);
    })
  );

  it("writes Money as plain dollars that read back unchanged", () => {
    EffectFunction.pipe(
      Cents.make(3_501_301),
      Money.fromCents,
      format,
      (actual) => {
        expect(actual).toBe("35013.01");
      }
    );
    EffectFunction.pipe(Cents.make(5), Money.fromCents, format, (actual) => {
      expect(actual).toBe("0.05");
    });
    EffectFunction.pipe(
      Cents.make(-150),
      Money.fromCents,
      format,
      (actual) => {
        expect(actual).toBe("-1.50");
      }
    );
  });
  it.effect("decodes and encodes through the default-message codec", () =>
    Effect.gen(function* () {
      const decode = Schema.decodeUnknownEffect(MoneyFromDecimalString);
      expect(yield* decode("1234.50")).toStrictEqual(
        EffectFunction.pipe(Cents.make(123_450), Money.fromCents)
      );
      const messages = yield* Effect.forEach(
        ["", "1,000", "90071992547409.92"],
        (text) =>
          decode(text).pipe(
            Effect.flip,
            Effect.map((error) => error.message)
          )
      );
      expect(messages).toStrictEqual([
        "Expected exact decimal AUD dollars in range.",
        "Expected exact decimal AUD dollars in range.",
        "Expected exact decimal AUD dollars in range.",
      ]);
      expect(
        yield* Schema.encodeEffect(MoneyFromDecimalString)(
          EffectFunction.pipe(Cents.make(123_450), Money.fromCents)
        )
      ).toBe("1234.50");
    })
  );
});
