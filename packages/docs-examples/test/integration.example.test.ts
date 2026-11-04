import { assert, it } from "@effect/vitest";
import { Effect } from "effect";
import { takeHomePay, AuPayTakeHomeCalculation } from "taxkit/au";
import { TakeHomeScenarioInputSchema } from "taxkit/au/schemas";
import { decodeInput } from "taxkit/effect";
import { Cents, Money, NonNegativeMoney } from "taxkit/money";

it.effect("calculates weekly take-home pay", () => {
  const grossPay = NonNegativeMoney.make(Money.fromCents(Cents.make(165_400)));
  const input = TakeHomeScenarioInputSchema.make({
    grossPay,
    period: "weekly",
    taxFreeThresholdClaimed: true,
  });
  return Effect.promise(() => takeHomePay(input)).pipe(
    Effect.tap((report) =>
      Effect.sync(() => {
        assert.equal(report.netPay.cents, 130_100);
      })
    )
  );
});
it.effect("rejects external input before calculation", () =>
  decodeInput(AuPayTakeHomeCalculation, { taxableIncome: 9_000_000 }).pipe(
    Effect.flip,
    Effect.tap((error) =>
      Effect.sync(() => {
        assert.equal(error.message, "Invalid calculator input.");
      })
    )
  )
);
