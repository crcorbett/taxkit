import { expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Arbitrary,
  Effect,
  Predicate,
  Result,
  Schema,
} from "effect";

import { Cents, Money, fromDecimal, format } from "../src/money.js";

// Effect 4.0.7's unstable Arbitrary API is qualified only by these test laws.
const cents = Arbitrary.schema(
  Cents.check(
    Schema.isBetween({ minimum: -1_000_000_000, maximum: 1_000_000_000 })
  )
);
const equivalent = Schema.toEquivalence(Money);
it.effect("signed decimal money round-trips generated checked cents", () =>
  Arbitrary.checkEffect(
    cents,
    (value) => {
      const money = Money.fromCents(value);
      return EffectFunction.pipe(format(money), fromDecimal).pipe(
        Result.match({
          onFailure: () => false,
          onSuccess: (decoded) => equivalent(money, decoded),
        })
      );
    },
    { runs: 200, seed: 20_261_104 }
  ).pipe(
    Effect.tap((result) =>
      Effect.sync(() => {
        EffectFunction.pipe(Predicate.isTagged(result, "Passed"), (passed) => {
          expect(passed).toBeTruthy();
        });
      })
    )
  )
);
