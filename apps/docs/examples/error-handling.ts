import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { TaxKit } from "@taxkit/sdk";
import { au } from "@taxkit/sdk/au";
import { Console, Effect, Match } from "effect";

export const program = Effect.promise(() =>
  TaxKit.safe.calculate(au.calculations.takeHomePay, {
    grossPay: new GrossPay({
      amount: aud(346_200),
      period: "fortnightly",
    }),
    taxFreeThresholdClaimed: true,
  })
).pipe(
  Effect.flatMap((result) =>
    Match.value(result).pipe(
      Match.tag("TaxKitFailure", (failure) =>
        Console.log(failure.error.error._tag)
      ),
      Match.tag("TaxKitSuccess", (success) => Console.log(success.value._tag)),
      Match.exhaustive
    )
  )
);
