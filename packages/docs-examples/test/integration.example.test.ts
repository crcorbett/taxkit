import { assert, it } from "@effect/vitest";
import { Cents, aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { au } from "@taxkit/sdk/au";
import { Effect, Schema } from "effect";

it.effect("calculates weekly take-home pay", () =>
  Effect.promise(() =>
    au.pay.takeHomePay({
      grossPay: new GrossPay({
        amount: aud(Cents.make(165_400)),
        period: "weekly",
      }),
      taxFreeThresholdClaimed: true,
    })
  ).pipe(
    Effect.tap((report) =>
      Effect.sync(() => {
        assert.equal(report._tag, "TakeHomePayReport");
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
      Effect.sync(() => assert.equal(error._tag, "SchemaError"))
    )
  )
);
