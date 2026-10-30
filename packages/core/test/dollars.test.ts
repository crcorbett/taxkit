import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Effect, Predicate, Schema } from "effect";

import {
  MoneyFromDollarsString,
  dollarsTextFromMoney,
  moneyFromDollarsText,
} from "../src/primitives/dollars.js";
import { Cents, aud } from "../src/primitives/money.js";

const tagged = (reason: string) => [true, "invalid-dollars-text", reason];
describe("dollar text to Money", () => {
  it.effect("reads plain dollars exactly as whole cents", () =>
    Effect.gen(function* () {
      expect(yield* moneyFromDollarsText(" 35013.01 ")).toStrictEqual(
        EffectFunction.pipe(Cents.make(3_501_301), aud)
      );
      expect(yield* moneyFromDollarsText("0")).toStrictEqual(
        EffectFunction.pipe(Cents.make(0), aud)
      );
      expect(yield* moneyFromDollarsText("80000.5")).toStrictEqual(
        EffectFunction.pipe(Cents.make(8_000_050), aud)
      );
      expect(yield* moneyFromDollarsText("90071992547409.91")).toStrictEqual(
        EffectFunction.pipe(Cents.make(Number.MAX_SAFE_INTEGER), aud)
      );
    })
  );
  it.effect("fails with a typed reason callers can match", () =>
    Effect.gen(function* () {
      const reasons = yield* Effect.forEach(
        ["", "  ", "1,000", "-1", "1.001", "$5", "1e3", "90071992547409.92"],
        (text) =>
          moneyFromDollarsText(text).pipe(
            Effect.flip,
            Effect.map((error) => [
              Predicate.isTagged(error, "InvalidDollarsText"),
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
        tagged("format"),
        tagged("range"),
      ]);
    })
  );

  it("writes Money as plain dollars that read back unchanged", () => {
    EffectFunction.pipe(
      EffectFunction.pipe(
        EffectFunction.pipe(Cents.make(3_501_301), aud),
        dollarsTextFromMoney
      ),
      (actual) => {
        expect(actual).toBe("35013.01");
      }
    );
    EffectFunction.pipe(
      EffectFunction.pipe(
        EffectFunction.pipe(Cents.make(5), aud),
        dollarsTextFromMoney
      ),
      (actual) => {
        expect(actual).toBe("0.05");
      }
    );
    EffectFunction.pipe(
      EffectFunction.pipe(
        EffectFunction.pipe(Cents.make(-150), aud),
        dollarsTextFromMoney
      ),
      (actual) => {
        expect(actual).toBe("-1.50");
      }
    );
  });
  it.effect("decodes and encodes through the default-message codec", () =>
    Effect.gen(function* () {
      const decode = Schema.decodeUnknownEffect(MoneyFromDollarsString);
      expect(yield* decode("1234.50")).toStrictEqual(
        EffectFunction.pipe(Cents.make(123_450), aud)
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
        "Enter an amount.",
        "Use a dollar amount with up to two decimal places and no commas.",
        "That amount is outside the supported range.",
      ]);
      expect(
        yield* Schema.encodeEffect(MoneyFromDollarsString)(
          EffectFunction.pipe(Cents.make(123_450), aud)
        )
      ).toBe("1234.50");
    })
  );
});
