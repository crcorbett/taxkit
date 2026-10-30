import { describe, expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  BigDecimal,
  Effect,
  Result,
  Schema,
} from "effect";

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
const maximum = EffectFunction.pipe(Cents.make(Number.MAX_SAFE_INTEGER), aud);
const minimum = EffectFunction.pipe(Cents.make(Number.MIN_SAFE_INTEGER), aud);
const oneCent = EffectFunction.pipe(Cents.make(1), aud);
const zero = EffectFunction.pipe(Cents.make(0), aud);
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
        expect(value).toStrictEqual(
          EffectFunction.pipe(Cents.make(cents), aud)
        );
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
      EffectFunction.pipe(Result.isFailure(result), (actual) => {
        expect(actual).toBeTruthy();
      });
      expect(yield* Schema.encodeEffect(MoneyResult)(result)).toStrictEqual(
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
      EffectFunction.pipe(
        Result.isFailure(yield* audDollars(dollars).pipe(Effect.result)),
        (actual) => {
          expect(actual).toBeTruthy();
        }
      );
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
      expect(
        (yield* EffectFunction.pipe(oneCent, (argument1) =>
          EffectFunction.pipe(
            EffectFunction.pipe(Cents.make(2), aud),
            (argument2) => moneySub(argument1, argument2)
          )
        )).cents
      ).toBe(-1);
      expect(
        (yield* EffectFunction.pipe(
          EffectFunction.pipe(Cents.make(12_345), aud),
          (argument3) => roundMoney(argument3, "ato-withholding-rounding")
        )).cents
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
      EffectFunction.pipe(Result.isFailure(result), (actual) => {
        expect(actual).toBeTruthy();
      });
      expect(yield* Schema.encodeEffect(MoneyResult)(result)).toStrictEqual(
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
        EffectFunction.pipe(
          Result.isFailure(
            yield* multiplyCentsByDecimal(oneCent.cents, enormous).pipe(
              Effect.result
            )
          ),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
        EffectFunction.pipe(
          Result.isFailure(
            yield* decimalDollarsToCents(enormous).pipe(Effect.result)
          ),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
        expect(yield* multiplyCentsByDecimal(oneCent.cents, tiny)).toBe(0);
        expect(yield* decimalDollarsToCents(tiny)).toBe(0);
        expect(yield* multiplyCentsByDecimal(zero.cents, enormous)).toBe(0);
      })
  );
  it.effect("retains exact rates and half-away-from-zero cent rounding", () =>
    Effect.gen(function* () {
      const rate = yield* taxRate("0.325");
      EffectFunction.pipe(
        BigDecimal.format(yield* Schema.encodeEffect(TaxRate)(rate)),
        (actual) => {
          expect(actual).toBe("0.325");
        }
      );
      const coefficient = yield* decimalCoefficient("0.5");
      expect(
        yield* EffectFunction.pipe(Cents.make(3), (argument5) =>
          EffectFunction.pipe(coefficient, (argument6) =>
            multiplyCentsByDecimal(argument5, argument6)
          )
        )
      ).toBe(2);
      expect(
        yield* EffectFunction.pipe(Cents.make(-3), (argument7) =>
          EffectFunction.pipe(coefficient, (argument8) =>
            multiplyCentsByDecimal(argument7, argument8)
          )
        )
      ).toBe(-2);
      expect(
        yield* decimalDollarsToCents(yield* decimalCoefficient("1.235"))
      ).toBe(124);
      expect(
        yield* decimalDollarsToCents(yield* decimalCoefficient("-1.235"))
      ).toBe(-124);
      EffectFunction.pipe(BigDecimal.format(yield* taxRate("")), (actual) => {
        expect(actual).toBe("0");
      });
      EffectFunction.pipe(
        BigDecimal.format(yield* decimalCoefficient("")),
        (actual) => {
          expect(actual).toBe("0");
        }
      );
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
        EffectFunction.pipe(Result.isFailure(rate), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(Result.isFailure(coefficient), (actual) => {
          expect(actual).toBeTruthy();
        });
        const expected = new InvalidDecimalValue();
        expect(
          yield* Schema.encodeEffect(
            Schema.Result(TaxRate, InvalidDecimalValue)
          )(rate)
        ).toStrictEqual(
          yield* Schema.encodeEffect(
            Schema.Result(TaxRate, InvalidDecimalValue)
          )(Result.fail(expected))
        );
        expect(
          yield* Schema.encodeEffect(
            Schema.Result(DecimalCoefficient, InvalidDecimalValue)
          )(coefficient)
        ).toStrictEqual(
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
      operation: EffectFunction.pipe(
        DecimalCoefficient.make(
          BigDecimal.make(BigInt(Number.MAX_SAFE_INTEGER), 0)
        ),
        decimalDollarsToCents
      ),
    },
  ])("rejects a result too large after $name", ({ operation }) =>
    Effect.gen(function* () {
      const result = yield* operation.pipe(Effect.result);
      EffectFunction.pipe(Result.isFailure(result), (actual) => {
        expect(actual).toBeTruthy();
      });
      expect(yield* Schema.encodeEffect(CentsResult)(result)).toStrictEqual(
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
            amount: EffectFunction.pipe(Cents.make(100), aud),
            effect: "additive",
            id: ComponentId.make("add"),
            label: "Add",
            status: "active",
            trace,
          }),
          LedgerComponent.make({
            amount: EffectFunction.pipe(Cents.make(25), aud),
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
        EffectFunction.pipe(Result.isFailure(result), (actual) => {
          expect(actual).toBeTruthy();
        });
        expect(yield* Schema.encodeEffect(MoneyResult)(result)).toStrictEqual(
          yield* Schema.encodeEffect(MoneyResult)(
            Result.fail(new InvalidMoneyValue())
          )
        );
      })
  );
});
