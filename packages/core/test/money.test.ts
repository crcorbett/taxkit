import { describe, expect, it } from "@effect/vitest";
import { BigDecimal, Effect, Result, Schema } from "effect";

import {
  ComponentId,
  LedgerComponent,
  sumLedgerComponents,
} from "../src/ledger/component.js";
import {
  InvalidDecimalValue,
  InvalidMoneyValue,
} from "../src/primitives/errors.js";
import {
  Cents,
  Money,
  aud,
  audDollars,
  audFromCents,
  moneyAdd,
  moneySub,
} from "../src/primitives/money.js";
import { roundMoney } from "../src/primitives/rounding.js";
import {
  DecimalCoefficient,
  TaxRate,
  decimalCoefficient,
  decimalDollarsToCents,
  multiplyCentsByDecimal,
  taxRate,
} from "../src/primitives/tax.js";
import { RuleId, TraceNode } from "../src/trace/node.js";

const MoneyResult = Schema.Result(Money, InvalidMoneyValue);
const CentsResult = Schema.Result(Cents, InvalidMoneyValue);
const maximum = aud(Cents.make(Number.MAX_SAFE_INTEGER));
const minimum = aud(Cents.make(Number.MIN_SAFE_INTEGER));
const oneCent = aud(Cents.make(1));
const zero = aud(Cents.make(0));
const two = DecimalCoefficient.make(BigDecimal.make(2n, 0));

const trace = TraceNode.make({
  children: [],
  inputs: {},
  result: 0,
  ruleId: RuleId.make("test.money"),
  sources: [],
  title: "Checked money test",
});

describe("checked money construction", () => {
  it.effect.each([0, 1, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER])(
    "retains safe whole cents %s and the historical Money encoding",
    (cents) =>
      Effect.gen(function* () {
        const value = yield* audFromCents(cents);
        expect(value).toEqual(aud(Cents.make(cents)));
        expect(
          yield* Schema.encodeEffect(Schema.fromJsonString(Money))(value)
        ).toBe(`{"_tag":"Money","cents":${cents},"currency":"AUD"}`);
      })
  );

  it.effect.each([
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
    Number.MIN_SAFE_INTEGER - 1,
  ])("returns a checked safe error for unsupported cents %s", (cents) =>
    Effect.gen(function* () {
      const result = yield* audFromCents(cents).pipe(Effect.result);
      expect(Result.isFailure(result)).toBe(true);
      expect(yield* Schema.encodeEffect(MoneyResult)(result)).toEqual(
        yield* Schema.encodeEffect(MoneyResult)(
          Result.fail(new InvalidMoneyValue())
        )
      );
    })
  );

  it.effect.each([
    { cents: 4250, dollars: 42.5 },
    { cents: 124, dollars: 1.235 },
    { cents: -124, dollars: -1.235 },
  ])(
    "retains the existing dollar rounding for $dollars",
    ({ dollars, cents }) =>
      Effect.gen(function* () {
        expect((yield* audDollars(dollars)).cents).toBe(cents);
      })
  );

  it.effect.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER,
  ])("rejects unsupported dollar conversion %s without a defect", (dollars) =>
    Effect.gen(function* () {
      expect(
        Result.isFailure(yield* audDollars(dollars).pipe(Effect.result))
      ).toBe(true);
    })
  );
});

describe("derived money", () => {
  it.effect("keeps valid addition, subtraction and rounding", () =>
    Effect.gen(function* () {
      expect((yield* moneyAdd(maximum, zero)).cents).toBe(
        Number.MAX_SAFE_INTEGER
      );
      expect((yield* moneySub(minimum, zero)).cents).toBe(
        Number.MIN_SAFE_INTEGER
      );
      expect((yield* moneySub(oneCent, aud(Cents.make(2)))).cents).toBe(-1);
      expect(
        (yield* roundMoney(aud(Cents.make(12_345)), "ato-withholding-rounding"))
          .cents
      ).toBe(12_300);
    })
  );

  it.effect.each([
    { name: "addition", operation: moneyAdd(maximum, oneCent) },
    { name: "subtraction", operation: moneySub(minimum, oneCent) },
    { name: "dollar rounding", operation: roundMoney(maximum, "ceil-dollar") },
  ])("returns the owned failure for overflow during $name", ({ operation }) =>
    Effect.gen(function* () {
      const result = yield* operation.pipe(Effect.result);
      expect(Result.isFailure(result)).toBe(true);
      expect(yield* Schema.encodeEffect(MoneyResult)(result)).toEqual(
        yield* Schema.encodeEffect(MoneyResult)(
          Result.fail(new InvalidMoneyValue())
        )
      );
    })
  );
});

describe("exact decimal operations", () => {
  it.effect(
    "handles admitted extreme exponents without constructing enormous powers",
    () =>
      Effect.gen(function* () {
        const enormous = yield* decimalCoefficient("1e9007199254740991");
        const tiny = yield* decimalCoefficient("1e-9007199254740991");
        expect(
          Result.isFailure(
            yield* multiplyCentsByDecimal(oneCent.cents, enormous).pipe(
              Effect.result
            )
          )
        ).toBe(true);
        expect(
          Result.isFailure(
            yield* decimalDollarsToCents(enormous).pipe(Effect.result)
          )
        ).toBe(true);
        expect(yield* multiplyCentsByDecimal(oneCent.cents, tiny)).toBe(0);
        expect(yield* decimalDollarsToCents(tiny)).toBe(0);
        expect(yield* multiplyCentsByDecimal(zero.cents, enormous)).toBe(0);
      })
  );
  it.effect("retains exact rates and half-away-from-zero cent rounding", () =>
    Effect.gen(function* () {
      const rate = yield* taxRate("0.325");
      expect(BigDecimal.format(yield* Schema.encodeEffect(TaxRate)(rate))).toBe(
        "0.325"
      );
      const coefficient = yield* decimalCoefficient("0.5");
      expect(yield* multiplyCentsByDecimal(Cents.make(3), coefficient)).toBe(2);
      expect(yield* multiplyCentsByDecimal(Cents.make(-3), coefficient)).toBe(
        -2
      );
      expect(
        yield* decimalDollarsToCents(yield* decimalCoefficient("1.235"))
      ).toBe(124);
      expect(
        yield* decimalDollarsToCents(yield* decimalCoefficient("-1.235"))
      ).toBe(-124);
      expect(BigDecimal.format(yield* taxRate(""))).toBe("0");
      expect(BigDecimal.format(yield* decimalCoefficient(""))).toBe("0");
    })
  );

  it.effect.each(["private-decimal-sentinel", "NaN", "Infinity", "1.2.3"])(
    "returns safe checked failures for invalid rate and coefficient %s",
    (value) =>
      Effect.gen(function* () {
        const rate = yield* taxRate(value).pipe(Effect.result);
        const coefficient = yield* decimalCoefficient(value).pipe(
          Effect.result
        );
        expect(Result.isFailure(rate)).toBe(true);
        expect(Result.isFailure(coefficient)).toBe(true);
        const expected = new InvalidDecimalValue();
        expect(
          yield* Schema.encodeEffect(
            Schema.Result(TaxRate, InvalidDecimalValue)
          )(rate)
        ).toEqual(
          yield* Schema.encodeEffect(
            Schema.Result(TaxRate, InvalidDecimalValue)
          )(Result.fail(expected))
        );
        expect(
          yield* Schema.encodeEffect(
            Schema.Result(DecimalCoefficient, InvalidDecimalValue)
          )(coefficient)
        ).toEqual(
          yield* Schema.encodeEffect(
            Schema.Result(DecimalCoefficient, InvalidDecimalValue)
          )(Result.fail(expected))
        );
      })
  );

  it.effect.each([
    {
      name: "multiplication",
      operation: multiplyCentsByDecimal(maximum.cents, two),
    },
    {
      name: "dollars to cents",
      operation: decimalDollarsToCents(
        DecimalCoefficient.make(
          BigDecimal.make(BigInt(Number.MAX_SAFE_INTEGER), 0)
        )
      ),
    },
  ])("rejects a result too large after $name", ({ operation }) =>
    Effect.gen(function* () {
      const result = yield* operation.pipe(Effect.result);
      expect(Result.isFailure(result)).toBe(true);
      expect(yield* Schema.encodeEffect(CentsResult)(result)).toEqual(
        yield* Schema.encodeEffect(CentsResult)(
          Result.fail(new InvalidMoneyValue())
        )
      );
    })
  );
});

describe("ledger totals", () => {
  it.effect(
    "sums active amounts while retaining ignored items in the ledger",
    () =>
      Effect.gen(function* () {
        const components = [
          LedgerComponent.make({
            amount: aud(Cents.make(100)),
            effect: "additive",
            id: ComponentId.make("add"),
            label: "Add",
            status: "active",
            trace,
          }),
          LedgerComponent.make({
            amount: aud(Cents.make(25)),
            effect: "subtractive",
            id: ComponentId.make("subtract"),
            label: "Subtract",
            status: "active",
            trace,
          }),
          LedgerComponent.make({
            amount: maximum,
            effect: "additive",
            id: ComponentId.make("disabled"),
            label: "Disabled",
            status: "disabled",
            trace,
          }),
          LedgerComponent.make({
            amount: maximum,
            effect: "subtractive",
            id: ComponentId.make("zeroed"),
            label: "Zeroed",
            status: "zeroed",
            trace,
          }),
          LedgerComponent.make({
            amount: maximum,
            effect: "informational",
            id: ComponentId.make("information"),
            label: "Information",
            status: "active",
            trace,
          }),
        ];
        expect((yield* sumLedgerComponents(components)).cents).toBe(75);
        expect(components).toHaveLength(5);
        expect((yield* sumLedgerComponents([])).cents).toBe(0);
      })
  );

  it.effect(
    "fails at an overflowing intermediate total even if a later item would cancel it",
    () =>
      Effect.gen(function* () {
        const components = [
          LedgerComponent.make({
            amount: maximum,
            effect: "additive",
            id: ComponentId.make("maximum"),
            label: "Maximum",
            status: "active",
            trace,
          }),
          LedgerComponent.make({
            amount: oneCent,
            effect: "additive",
            id: ComponentId.make("extra"),
            label: "Extra",
            status: "active",
            trace,
          }),
          LedgerComponent.make({
            amount: oneCent,
            effect: "subtractive",
            id: ComponentId.make("cancel"),
            label: "Cancel",
            status: "active",
            trace,
          }),
        ];
        const result = yield* sumLedgerComponents(components).pipe(
          Effect.result
        );
        expect(Result.isFailure(result)).toBe(true);
        expect(yield* Schema.encodeEffect(MoneyResult)(result)).toEqual(
          yield* Schema.encodeEffect(MoneyResult)(
            Result.fail(new InvalidMoneyValue())
          )
        );
      })
  );
});
