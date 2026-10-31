import { CalculationEngineLive } from "@taxkit/core";
import { Money, Cents } from "@taxkit/core/primitives";
import { AuPayCalculatorId, GrossPay } from "@taxkit/rules-au-pay";
import { Context, Cause, Effect, Layer, Match } from "effect";

import { PublicCalculatorServiceLive } from "../live.layer.js";
import {
  CalculatorCapacityExceeded,
  CalculatorInputDecodeError,
  CalculatorInputIssue,
  CalculatorOperationTimedOut,
  CalculatorRunServiceRequest,
} from "../schemas.js";
import { PublicCalculatorService } from "../service.js";

export const sensitiveSentinel =
  "private-calculator-sentinel-/private/source?credential=hidden";
export const CalculationRequest = CalculatorRunServiceRequest.make({
  calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
  payload: {
    facts: {
      grossPay: new GrossPay({
        amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
        period: "weekly",
      }),
      taxFreeThresholdClaimed: true,
    },
  },
});
export const CalculatorLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);
// The behaviour a test selects for the wrapped calculator.
export class CalculatorFixtureMode extends Context.Service<
  CalculatorFixtureMode,
  "success" | "expected" | "defect" | "mixed" | "capacity" | "timeout"
>()("taxkit/calculators/testing/CalculatorFixtureMode") {}
export const CalculatorFixture = Layer.effect(
  PublicCalculatorService,
  Effect.gen(function* () {
    const mode = yield* CalculatorFixtureMode;
    const calculator = yield* PublicCalculatorService;
    const inputFailure = new CalculatorInputDecodeError({
      issues: [
        new CalculatorInputIssue({
          message: sensitiveSentinel,
          path: [sensitiveSentinel],
        }),
      ],
      message: sensitiveSentinel,
    });
    const metadataDefect = Effect.die({
      cause: sensitiveSentinel,
      message: sensitiveSentinel,
    });
    const metadataInterruptedDefect = Effect.failCause(
      Cause.combine(Cause.die(sensitiveSentinel), Cause.interrupt())
    );
    return PublicCalculatorService.of({
      calculate: Effect.fn("PublicCalculatorService.calculate")((request) =>
        Match.value(mode).pipe(
          Match.when("capacity", () =>
            Effect.fail(new CalculatorCapacityExceeded())
          ),
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("success", () => calculator.calculate(request)),
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
      getCalculator: Effect.fn("PublicCalculatorService.getCalculator")(
        (request) =>
          Match.value(mode).pipe(
            Match.when("expected", () => Effect.fail(inputFailure)),
            Match.when("timeout", () =>
              Effect.fail(new CalculatorOperationTimedOut())
            ),
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.getCalculator(request))
          )
      ),
      getCalculatorGraph: Effect.fn(
        "PublicCalculatorService.getCalculatorGraph"
      )((request) =>
        Match.value(mode).pipe(
          Match.when("expected", () => Effect.fail(inputFailure)),
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("defect", () => metadataDefect),
          Match.when("mixed", () => metadataInterruptedDefect),
          Match.orElse(() => calculator.getCalculatorGraph(request))
        )
      ),
      getCalculatorSchema: Effect.fn(
        "PublicCalculatorService.getCalculatorSchema"
      )((request) =>
        Match.value(mode).pipe(
          Match.when("expected", () => Effect.fail(inputFailure)),
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("defect", () => metadataDefect),
          Match.when("mixed", () => metadataInterruptedDefect),
          Match.orElse(() => calculator.getCalculatorSchema(request))
        )
      ),
      listCalculators: Effect.fn("PublicCalculatorService.listCalculators")(
        (query) =>
          Match.value(mode).pipe(
            Match.when("timeout", () =>
              Effect.fail(new CalculatorOperationTimedOut())
            ),
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.listCalculators(query))
          )
      ),
      listFacts: Effect.fn("PublicCalculatorService.listFacts")((query) =>
        Match.value(mode).pipe(
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("defect", () => metadataDefect),
          Match.when("mixed", () => metadataInterruptedDefect),
          Match.orElse(() => calculator.listFacts(query))
        )
      ),
      listJurisdictions: Effect.fn("PublicCalculatorService.listJurisdictions")(
        () =>
          Match.value(mode).pipe(
            Match.when("timeout", () =>
              Effect.fail(new CalculatorOperationTimedOut())
            ),
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.listJurisdictions())
          )
      ),
      listRules: Effect.fn("PublicCalculatorService.listRules")((query) =>
        Match.value(mode).pipe(
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("defect", () => metadataDefect),
          Match.when("mixed", () => metadataInterruptedDefect),
          Match.orElse(() => calculator.listRules(query))
        )
      ),
      listTaxYears: Effect.fn("PublicCalculatorService.listTaxYears")((query) =>
        Match.value(mode).pipe(
          Match.when("timeout", () =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          Match.when("defect", () => metadataDefect),
          Match.when("mixed", () => metadataInterruptedDefect),
          Match.orElse(() => calculator.listTaxYears(query))
        )
      ),
    });
  })
).pipe(Layer.provide(CalculatorLive));
