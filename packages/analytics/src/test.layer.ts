import { Array, Effect, Layer, Ref } from "effect";

import type { CalculatorUse } from "./schemas.js";
import { BackendAnalytics } from "./service.js";

export const makeBackendAnalyticsTest = Effect.gen(function* () {
  const uses = yield* Ref.make<readonly CalculatorUse[]>([]);
  return {
    layer: Layer.succeed(
      BackendAnalytics,
      BackendAnalytics.of({
        recordCalculatorUse: Effect.fn("BackendAnalytics.recordCalculatorUse")(
          function* (input) {
            yield* Ref.update(uses, (observed) =>
              Array.append(observed, input)
            );
            return "accepted" as const;
          }
        ),
      })
    ),
    uses,
  } as const;
});
