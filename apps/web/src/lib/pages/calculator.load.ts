import { redirect } from "@tanstack/react-router";
import { CalculatorSummaries } from "@taxkit/calculators/summaries";
import { Array, Effect, Function as EffectFunction } from "effect";

import { WebsiteCalculatorMissing } from "../host/errors";
import { routeLoadFailures, withSafeDefects } from "./load.failure";

// The calculator address is checked once against the published summaries.
// The take-home calculator lives at Home, so its old address redirects there;
// an unknown address becomes TanStack's native not-found page.
export const loadCalculatorView = Effect.fn("Website.loadCalculatorView")(
  function* ({ calculatorId }: Readonly<{ calculatorId: string }>) {
    if (calculatorId === "au.pay.take-home") {
      return yield* Effect.fail(redirect({ statusCode: 308, to: "/" }));
    }
    const calculator = yield* EffectFunction.pipe(
      CalculatorSummaries,
      Array.findFirst((entry) => entry.calculatorId === calculatorId),
      Effect.fromOption,
      Effect.mapError(() => new WebsiteCalculatorMissing())
    );
    return { calculator };
  },
  Effect.catchTags(routeLoadFailures({ WebsiteCalculatorMissing: "missing" })),
  withSafeDefects
);
