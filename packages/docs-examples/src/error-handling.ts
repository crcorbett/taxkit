import { Effect, Result } from "effect";
import { calculateSafe } from "taxkit";
import { AuPayTakeHomeCalculation } from "taxkit/au";
import { TakeHomeScenarioInputSchema } from "taxkit/au/schemas";
import { fromDecimal, nonNegative } from "taxkit/money/effect";

export const program = Effect.gen(function* () {
  const grossPay = yield* fromDecimal("3462.00").pipe(
    Effect.flatMap(nonNegative)
  );
  const scenario = TakeHomeScenarioInputSchema.make({
    grossPay,
    period: "fortnightly",
    taxFreeThresholdClaimed: true,
  });
  const result = yield* Effect.promise(() =>
    calculateSafe(AuPayTakeHomeCalculation, scenario)
  );
  return yield* Result.match(result, {
    onFailure: (failure) => Effect.logError(failure.message),
    onSuccess: () => Effect.logInfo("Calculated take-home pay"),
  });
});
