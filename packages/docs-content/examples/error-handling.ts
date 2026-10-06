import { audFromCents } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { TaxKit } from "@taxkit/sdk";
import { au } from "@taxkit/sdk/au";
import { Console, Effect, Match } from "effect";

export const program = audFromCents(346_200).pipe(
  Effect.flatMap((amount) =>
    Effect.promise(() =>
      TaxKit.safe.calculate(au.calculations.takeHomePay, {
        grossPay: new GrossPay({
          amount,
          period: "fortnightly",
        }),
        taxFreeThresholdClaimed: true,
      })
    )
  ),
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
