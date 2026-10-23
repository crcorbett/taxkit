import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  MoneyFromDollarsString,
  moneyFromDollarsString,
} from "../src/primitives/dollars.js";
import { Cents, aud } from "../src/primitives/money.js";

const decode = Schema.decodeUnknownEffect(MoneyFromDollarsString);

describe("dollar text to Money", () => {
  it.effect("decodes plain dollars exactly to whole cents", () =>
    Effect.gen(function* () {
      expect(yield* decode(" 35013.01 ")).toEqual(aud(Cents.make(3_501_301)));
      expect(yield* decode("0")).toEqual(aud(Cents.make(0)));
      expect(yield* decode("80000.5")).toEqual(aud(Cents.make(8_000_050)));
      expect(yield* decode("90071992547409.91")).toEqual(
        aud(Cents.make(Number.MAX_SAFE_INTEGER))
      );
    })
  );

  it.effect("refuses blank, unplain and unsafe text with its message", () =>
    Effect.gen(function* () {
      const messages = yield* Effect.forEach(
        ["", "  ", "1,000", "-1", "1.001", "$5", "1e3", "90071992547409.92"],
        (text) =>
          decode(text).pipe(
            Effect.flip,
            Effect.map((error) => error.message)
          )
      );
      expect(messages).toEqual([
        "Enter an amount.",
        "Enter an amount.",
        "Use a dollar amount with up to two decimal places and no commas.",
        "Use a dollar amount with up to two decimal places and no commas.",
        "Use a dollar amount with up to two decimal places and no commas.",
        "Use a dollar amount with up to two decimal places and no commas.",
        "Use a dollar amount with up to two decimal places and no commas.",
        "That amount is outside the supported range.",
      ]);
    })
  );

  it.effect("uses replacement messages for chosen reasons", () =>
    Effect.gen(function* () {
      const TaxableIncome = moneyFromDollarsString({
        messages: { empty: "Enter your annual taxable income." },
      });
      const decodeIncome = Schema.decodeUnknownEffect(TaxableIncome);
      const empty = yield* Effect.flip(decodeIncome(""));
      const format = yield* Effect.flip(decodeIncome("1,000"));
      expect(empty.message).toBe("Enter your annual taxable income.");
      expect(format.message).toBe(
        "Use a dollar amount with up to two decimal places and no commas."
      );
    })
  );

  it.effect("encodes Money back to plain dollars that decode again", () =>
    Effect.gen(function* () {
      const text = yield* Schema.encodeEffect(MoneyFromDollarsString)(
        aud(Cents.make(3_501_301))
      );
      expect(text).toBe("35013.01");
      expect(yield* decode(text)).toEqual(aud(Cents.make(3_501_301)));
      expect(
        yield* Schema.encodeEffect(MoneyFromDollarsString)(aud(Cents.make(5)))
      ).toBe("0.05");
    })
  );
});
