import { aud } from "@whattax/core/primitives";
import { GrossPay } from "@whattax/rules-au-pay";
import { WhatTax } from "@whattax/sdk";
import { au } from "@whattax/sdk/au";
import { Console, Effect, Match } from "effect";

export const program = Effect.promise(() =>
  WhatTax.safe.calculate(au.calculations.takeHomePay, {
    grossPay: new GrossPay({
      amount: aud(346_200),
      period: "fortnightly",
    }),
    taxFreeThresholdClaimed: true,
  })
).pipe(
  Effect.flatMap((result) =>
    Match.value(result).pipe(
      Match.tag("WhatTaxFailure", (failure) =>
        Console.log(failure.error.error._tag)
      ),
      Match.tag("WhatTaxSuccess", (success) => Console.log(success.value._tag)),
      Match.exhaustive
    )
  )
);
