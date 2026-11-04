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
  MoneyError,
} from "../src/primitives/errors.js";
import {
  Cents,
  Money,
  
  fromCents,
  add,
  subtract,
} from "../src/primitives/index.js";
import { round } from "../src/primitives/rounding.js";
import {
  DecimalCoefficient,
  TaxRate,
  decimalCoefficient,
  decimalDollarsToCents,
  multiplyCentsByDecimal,
  taxRate,
} from "../src/primitives/tax.js";
import { RuleId, TraceNode } from "../src/trace/node.js";

const MoneyResult = Schema.Result(Money, MoneyError);
const CentsResult = Schema.Result(Cents, MoneyError);
const maximum = EffectFunction.pipe(Cents.make(Number.MAX_SAFE_INTEGER), Money.fromCents);
const minimum = EffectFunction.pipe(Cents.make(Number.MIN_SAFE_INTEGER), Money.fromCents);
const oneCent = EffectFunction.pipe(Cents.make(1), Money.fromCents);
const zero = EffectFunction.pipe(Cents.make(0), Money.fromCents);
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
        const value = yield* fromCents(cents);
        expect(value).toStrictEqual(
          EffectFunction.pipe(Cents.make(cents), Money.fromCents)
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
      const result = yield* fromCents(cents).pipe(Effect.result);
      EffectFunction.pipe(Result.isFailure(result), (actual) => {
        expect(actual).toBeTruthy();
      });
      expect(yield* Schema.encodeEffect(MoneyResult)(result)).toStrictEqual(
        yield* Schema.encodeEffect(MoneyResult)(
          Result.fail(new MoneyError({ reason: !Number.isFinite(cents) ? "non-finite" : !Number.isInteger(cents) ? "fractional-cents" : "range" }))
        )
      );
    })
  );

});
describe("derived money", () => {
  it.effect("keeps valid addition, subtraction and rounding", () =>
    Effect.gen(function* () {
      expect((yield* add(maximum, zero)).cents).toBe(
        Number.MAX_SAFE_INTEGER
      );
      expect((yield* subtract(minimum, zero)).cents).toBe(
        Number.MIN_SAFE_INTEGER
      );
      const twoCents = EffectFunction.pipe(Cents.make(2), Money.fromCents);
      expect((yield* subtract(oneCent, twoCents)).cents).toBe(-1);
      const unrounded = EffectFunction.pipe(Cents.make(12_345), Money.fromCents);
      expect(
        (yield* round(unrounded, "ato-withholding-rounding")).cents
      ).toBe(12_300);
    })
  );
  it.effect.each([
    { name: "addition", operation: add(maximum, oneCent) },
    { name: "subtraction", operation: subtract(minimum, oneCent) },
    { name: "dollar rounding", operation: round(maximum, "ceil-dollar") },
  ])("returns the owned failure for overflow during $name", ({ operation }) =>
    Effect.gen(function* () {
      const result = yield* operation.pipe(Effect.result);
      EffectFunction.pipe(Result.isFailure(result), (actual) => {
        expect(actual).toBeTruthy();
      });
      expect(yield* Schema.encodeEffect(MoneyResult)(result)).toStrictEqual(
        yield* Schema.encodeEffect(MoneyResult)(
          Result.fail(new MoneyError())
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
      const positive = Cents.make(3);
      const negative = Cents.make(-3);
      expect(yield* multiplyCentsByDecimal(positive, coefficient)).toBe(2);
      expect(yield* multiplyCentsByDecimal(negative, coefficient)).toBe(-2);
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
          Result.fail(new MoneyError())
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
            amount: EffectFunction.pipe(Cents.make(100), Money.fromCents),
            effect: "additive",
            id: ComponentId.make("add"),
            label: "Add",
            status: "active",
            trace,
          }),
          LedgerComponent.make({
            amount: EffectFunction.pipe(Cents.make(25), Money.fromCents),
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
            Result.fail(new MoneyError())
          )
        );
      })
  );
});
