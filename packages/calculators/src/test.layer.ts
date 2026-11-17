import { InputValidationError } from "@taxkit/core/errors";
import { Context, Cause, Effect, Layer, Match } from "effect";

import { sensitiveSentinel } from "./__testing__/fixtures.js";
import {
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
} from "./errors.js";
import { CalculatorCatalogueLive } from "./live.layer.js";
import { CalculatorCatalogue, PublicCalculatorService } from "./service.js";

// The calculation outcome a host test selects.
export class CalculatorFixtureMode extends Context.Service<
  CalculatorFixtureMode,
  "success" | "expected" | "defect" | "mixed" | "capacity" | "timeout"
>()("taxkit/calculators/testing/CalculatorFixtureMode") {}
// A whole-service substitute for host transport tests: `calculate` answers
// with the selected public outcome, and metadata reuses the static catalogue's
// own operations. Behaviour of the real work policy is proved in this package.
export const PublicCalculatorServiceTest = Layer.effect(
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
