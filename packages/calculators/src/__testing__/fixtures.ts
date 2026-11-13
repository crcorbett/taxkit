import { NonNegativeMoney, InputValidationError } from "@taxkit/core";
import { Money, Cents } from "@taxkit/core/primitives";
import { TakeHomeScenarioInputSchema } from "@taxkit/rules-au-pay";
import { Context, Cause, Effect, Layer, Match } from "effect";

import { CalculatorCatalogueLive } from "../live.layer.js";
import {
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
  TakeHomeCalculationRequest,
} from "../schemas.js";
import { CalculatorCatalogue, PublicCalculatorService } from "../service.js";

export const sensitiveSentinel =
  "private-calculator-sentinel-/private/source?credential=hidden";
export const CalculationRequest = TakeHomeCalculationRequest.make({
  calculatorId:
    TakeHomeCalculationRequest.fields.calculatorId.make("au.pay.take-home"),
  payload: {
    facts: TakeHomeScenarioInputSchema.make({
      grossPay: NonNegativeMoney.make(
        new Money({ cents: Cents.make(165_400), currency: "AUD" })
      ),
      period: "weekly",
      taxFreeThresholdClaimed: true,
    }),
  },
});
export { PublicCalculatorServiceLive as CalculatorLive } from "../live.layer.js";
// The calculation outcome a host test selects.
export class CalculatorFixtureMode extends Context.Service<
  CalculatorFixtureMode,
  "success" | "expected" | "defect" | "mixed" | "capacity" | "timeout"
>()("taxkit/calculators/testing/CalculatorFixtureMode") {}
// A whole-service substitute for host transport tests: `calculate` answers
// with the selected public outcome, and metadata reuses the static catalogue's
// own operations. Behaviour of the real work policy is proved in this package.
export const CalculatorFixture = Layer.effect(
  PublicCalculatorService,
  Effect.gen(function* () {
    const mode = yield* CalculatorFixtureMode;
    const catalogue = yield* CalculatorCatalogue;
    const inputFailure = new InputValidationError({
      issues: [{ message: "Invalid input value", path: [sensitiveSentinel] }],
      truncated: false,
    });
    return PublicCalculatorService.of({
      getCalculator: catalogue.getCalculator,
      getCalculatorGraph: catalogue.getCalculatorGraph,
      getCalculatorSchema: catalogue.getCalculatorSchema,
      listCalculators: catalogue.listCalculators,
      listFacts: catalogue.listFacts,
      listJurisdictions: catalogue.listJurisdictions,
      listRules: catalogue.listRules,
      listTaxYears: catalogue.listTaxYears,
      calculate: Effect.fn("PublicCalculatorService.calculate")((request) =>
        Match.value(mode).pipe(
          Match.when("success", () => catalogue.calculate(request)),
          Match.when("expected", () => Effect.fail(inputFailure)),
          Match.when("capacity", () =>
            Effect.fail(new CalculatorCapacityExceeded())
          ),
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("defect", () =>
            Effect.die({ cause: sensitiveSentinel, message: sensitiveSentinel })
          ),
          Match.when("mixed", () =>
            Effect.failCause(
              Cause.combine(Cause.die(sensitiveSentinel), Cause.interrupt())
            )
          ),
          Match.exhaustive
        )
      ),
    });
  })
).pipe(Layer.provide(CalculatorCatalogueLive));
