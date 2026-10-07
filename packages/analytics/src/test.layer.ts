import { Array, Effect, Layer, Ref } from "effect";

import type { CalculatorUse, PageView } from "./schemas.js";
import { BackendAnalytics, BrowserAnalytics } from "./service.js";

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
export const makeBrowserAnalyticsTest = Effect.gen(function* () {
  const pages = yield* Ref.make<readonly PageView[]>([]);
  return {
    layer: Layer.succeed(
      BrowserAnalytics,
      BrowserAnalytics.of({
        getCollectionPolicy: Effect.succeed("allow" as const),
        recordPageView: Effect.fn("BrowserAnalytics.recordPageView")(
          function* (input) {
            yield* Ref.update(pages, (observed) =>
              Array.append(observed, input)
            );
            return "accepted" as const;
          }
        ),
      })
    ),
    pages,
  } as const;
});
