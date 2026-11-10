import { Array, Context, Effect, Layer, Ref } from "effect";

import type { CalculatorUse } from "./schemas.js";
import { BackendAnalytics } from "./service.js";

// The calculator uses the test analytics service has accepted. A test
// supplies its own Ref so it can read what was recorded.
export class BackendAnalyticsUses extends Context.Service<
  BackendAnalyticsUses,
  Ref.Ref<readonly CalculatorUse[]>
>()("taxkit/analytics/testing/BackendAnalyticsUses") {}

export const BackendAnalyticsTest = Layer.effect(
  BackendAnalytics,
  Effect.gen(function* () {
    const uses = yield* BackendAnalyticsUses;
    return BackendAnalytics.of({
      recordCalculatorUse: Effect.fn("BackendAnalytics.recordCalculatorUse")(
        function* (input) {
          yield* Ref.update(uses, (observed) => Array.append(observed, input));
          return "accepted" as const;
        }
      ),
    });
  })
);
