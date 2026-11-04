import { Effect, Match } from "effect";
import { TaxKit } from "taxkit";
import { GrossPay, au } from "taxkit/au";
import { fromCents } from "taxkit/core";

export const program = fromCents(346_200).pipe(
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
        Effect.logError(failure.error.message)
      ),
      Match.tag("TaxKitSuccess", (_success) =>
        Effect.logInfo("Calculated take-home pay")
      ),
      Match.exhaustive
    )
  )
);
