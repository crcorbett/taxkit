import { NonNegativeMoney, InputValidationError } from "@taxkit/core";
import { Money, Cents } from "@taxkit/core/primitives";
import { TakeHomeScenarioInputSchema } from "@taxkit/rules-au-pay";
import { Context, Cause, Effect, Layer, Match } from "effect";

import { calculatorCatalogue } from "../live.layer.js";
import {
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
  TakeHomeCalculationRequest,
} from "../schemas.js";
import { CalculatorCatalogue } from "../service.js";
import { PublicCalculatorServiceBounded } from "../work.layer.js";

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
// The behaviour a test selects for the substituted catalogue.
export class CalculatorFixtureMode extends Context.Service<
  CalculatorFixtureMode,
  "success" | "expected" | "defect" | "mixed" | "capacity" | "timeout"
>()("taxkit/calculators/testing/CalculatorFixtureMode") {}
// The real public implementation over a catalogue whose selected operations
// fail at the catalogue boundary; other operations use the static catalogue.
const CatalogueFixture = Layer.effect(
  CalculatorCatalogue,
  Effect.gen(function* () {
    const mode = yield* CalculatorFixtureMode;
    const inputFailure = new InputValidationError({
      issues: [{ message: "Invalid input value", path: [sensitiveSentinel] }],
      truncated: false,
    });
    const metadataDefect = Effect.die({
      cause: sensitiveSentinel,
      message: sensitiveSentinel,
    });
    const metadataInterruptedDefect = Effect.failCause(
      Cause.combine(Cause.die(sensitiveSentinel), Cause.interrupt())
    );
    return CalculatorCatalogue.of({
      calculate: Effect.fn("CalculatorCatalogue.calculate")((request) =>
        Match.value(mode).pipe(
          Match.when("capacity", () =>
            Effect.fail(new CalculatorCapacityExceeded())
          ),
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("success", () => calculatorCatalogue.calculate(request)),
          Match.when("expected", () => Effect.fail(inputFailure)),
          Match.when("defect", () =>
            Effect.die({
              cause: sensitiveSentinel,
              message: sensitiveSentinel,
            })
          ),
          Match.when("mixed", () =>
            Effect.failCause(
              Cause.combine(Cause.die(sensitiveSentinel), Cause.interrupt())
            )
          ),
          Match.exhaustive
        )
      ),
      getCalculator: Effect.fn("CalculatorCatalogue.getCalculator")((request) =>
        Match.value(mode).pipe(
          Match.when("expected", () => Effect.fail(inputFailure)),
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("defect", () => metadataDefect),
          Match.when("mixed", () => metadataInterruptedDefect),
          Match.orElse(() => calculatorCatalogue.getCalculator(request))
        )
      ),
      getCalculatorGraph: Effect.fn("CalculatorCatalogue.getCalculatorGraph")(
        (request) =>
          Match.value(mode).pipe(
            Match.when("expected", () => Effect.fail(inputFailure)),
            Match.when("timeout", () =>
              Effect.fail(new CalculatorOperationTimedOut())
            ),
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculatorCatalogue.getCalculatorGraph(request))
          )
      ),
      getCalculatorSchema: Effect.fn("CalculatorCatalogue.getCalculatorSchema")(
        (request) =>
          Match.value(mode).pipe(
            Match.when("expected", () => Effect.fail(inputFailure)),
            Match.when("timeout", () =>
              Effect.fail(new CalculatorOperationTimedOut())
            ),
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculatorCatalogue.getCalculatorSchema(request))
          )
      ),
      listCalculators: Effect.fn("CalculatorCatalogue.listCalculators")(
        (query) =>
          Match.value(mode).pipe(
            Match.when("timeout", () =>
              Effect.fail(new CalculatorOperationTimedOut())
            ),
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculatorCatalogue.listCalculators(query))
          )
      ),
      listFacts: Effect.fn("CalculatorCatalogue.listFacts")((query) =>
        Match.value(mode).pipe(
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("defect", () => metadataDefect),
          Match.when("mixed", () => metadataInterruptedDefect),
          Match.orElse(() => calculatorCatalogue.listFacts(query))
        )
      ),
      listJurisdictions: Effect.fn("CalculatorCatalogue.listJurisdictions")(
        () =>
          Match.value(mode).pipe(
            Match.when("timeout", () =>
              Effect.fail(new CalculatorOperationTimedOut())
            ),
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculatorCatalogue.listJurisdictions())
          )
      ),
      listRules: Effect.fn("CalculatorCatalogue.listRules")((query) =>
        Match.value(mode).pipe(
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("defect", () => metadataDefect),
          Match.when("mixed", () => metadataInterruptedDefect),
          Match.orElse(() => calculatorCatalogue.listRules(query))
        )
      ),
      listTaxYears: Effect.fn("CalculatorCatalogue.listTaxYears")((query) =>
        Match.value(mode).pipe(
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("defect", () => metadataDefect),
          Match.when("mixed", () => metadataInterruptedDefect),
          Match.orElse(() => calculatorCatalogue.listTaxYears(query))
        )
      ),
    });
  })
);
// A fresh instance: hosts may also hold the memoised real implementation, and
// this fixture must not share its pool or its catalogue.
export const CalculatorFixture = Layer.fresh(
  PublicCalculatorServiceBounded
).pipe(Layer.provide(CatalogueFixture));
