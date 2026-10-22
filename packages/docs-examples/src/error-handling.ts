import { Console, Effect, Match } from "effect";
import { TaxKit } from "taxkit";
import { GrossPay, au } from "taxkit/au";
import { audFromCents } from "taxkit/core";

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
