import { Effect } from "effect";
import { AuPayTakeHomeCalculation } from "taxkit/au";
import { TakeHomeScenarioInputSchema } from "taxkit/au/schemas";
import { calculateRun, TaxKitLive } from "taxkit/effect";
import { fromDecimal, nonNegative } from "taxkit/money/effect";

export const program = Effect.gen(function* () {
  const grossPay = yield* fromDecimal("3462.00").pipe(
    Effect.flatMap(nonNegative)
  );
  const input = TakeHomeScenarioInputSchema.make({
    grossPay,
    period: "fortnightly",
    taxFreeThresholdClaimed: true,
  });
  return yield* calculateRun(AuPayTakeHomeCalculation, input);
}).pipe(Effect.provide(TaxKitLive));
