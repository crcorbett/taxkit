import { NonNegativeMoney } from "@taxkit/core/primitives";
import { assert, it } from "@effect/vitest";
import { Predicate, Function as EffectFunction, Effect, Schema } from "effect";
import { GrossPay, au } from "taxkit/au";
import { Cents } from "taxkit/core";

it.effect("calculates weekly take-home pay", () =>
  Effect.promise(() =>
    au.pay.takeHomePay({
      grossPay: NonNegativeMoney.make(EffectFunction.pipe(Cents.make(165_400), Money.fromCents)), period: "weekly",
      taxFreeThresholdClaimed: true,
    })
  ).pipe(
    Effect.tap((report) =>
      Effect.sync(() => {
        assert.isTrue(Predicate.isTagged(report, "TakeHomePayReport"));
        assert.equal(report.netPay.cents, 130_100);
      })
    )
  )
);
it.effect("rejects external input before calculation", () =>
  Schema.decodeEffect(
    Schema.fromJsonString(au.calculations.takeHomePay.inputSchema)
  )('{"taxableIncome":{"_tag":"Money","cents":9000000,"currency":"AUD"}}').pipe(
    Effect.flip,
    Effect.tap((error) =>
      Effect.sync(() => {
        assert.isTrue(Predicate.isTagged(error, "SchemaError"));
      })
    )
  )
);
