import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  MoneyFromDollarsString,
  dollarsTextFromMoney,
  moneyFromDollarsText,
} from "../src/primitives/dollars.js";
import { Cents, aud } from "../src/primitives/money.js";

const tagged = (reason: string) => [
  "InvalidDollarsText",
  "invalid-dollars-text",
  reason,
];

describe("dollar text to Money", () => {
  it.effect("reads plain dollars exactly as whole cents", () =>
    Effect.gen(function* () {
      expect(yield* moneyFromDollarsText(" 35013.01 ")).toEqual(
        aud(Cents.make(3_501_301))
      );
      expect(yield* moneyFromDollarsText("0")).toEqual(aud(Cents.make(0)));
      expect(yield* moneyFromDollarsText("80000.5")).toEqual(
        aud(Cents.make(8_000_050))
      );
      expect(yield* moneyFromDollarsText("90071992547409.91")).toEqual(
        aud(Cents.make(Number.MAX_SAFE_INTEGER))
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
            Effect.map((error) => [error._tag, error.code, error.reason])
          )
      );
      expect(reasons).toEqual([
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
    expect(dollarsTextFromMoney(aud(Cents.make(3_501_301)))).toBe("35013.01");
    expect(dollarsTextFromMoney(aud(Cents.make(5)))).toBe("0.05");
    expect(dollarsTextFromMoney(aud(Cents.make(-150)))).toBe("-1.50");
  });

  it.effect("decodes and encodes through the default-message codec", () =>
    Effect.gen(function* () {
      const decode = Schema.decodeUnknownEffect(MoneyFromDollarsString);
      expect(yield* decode("1234.50")).toEqual(aud(Cents.make(123_450)));
      const messages = yield* Effect.forEach(
        ["", "1,000", "90071992547409.92"],
        (text) =>
          decode(text).pipe(
            Effect.flip,
            Effect.map((error) => error.message)
          )
      );
      expect(messages).toEqual([
        "Enter an amount.",
        "Use a dollar amount with up to two decimal places and no commas.",
        "That amount is outside the supported range.",
      ]);
      expect(
        yield* Schema.encodeEffect(MoneyFromDollarsString)(
          aud(Cents.make(123_450))
        )
      ).toBe("1234.50");
    })
  );
});
