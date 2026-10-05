import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import {
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
  CalculatorRunServiceRequest,
  CalculatorInputDecodeError,
  CalculatorInputIssue,
} from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { CalculationEngineLive } from "@taxkit/core";
import { aud } from "@taxkit/core/primitives";
import { AuPayCalculatorId, GrossPay } from "@taxkit/rules-au-pay";
import { Cause, Effect, Layer, Match } from "effect";

export const sensitiveSentinel =
  "private-rpc-sentinel-/private/source?credential=hidden";
export const CalculationRequest = CalculatorRunServiceRequest.make({
  calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
  payload: {
    facts: {
      grossPay: new GrossPay({ amount: aud(165_400), period: "weekly" }),
      taxFreeThresholdClaimed: true,
    },
  },
});

export const CalculatorLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

export const CalculatorFixture = (
  mode: "success" | "expected" | "defect" | "mixed" | "capacity" | "timeout"
) =>
  Layer.effect(
    PublicCalculatorService,
    Effect.gen(function* () {
      const calculator = yield* PublicCalculatorService;
      return PublicCalculatorService.of({
        ...calculator,
        calculate: (request) =>
          Match.value(mode).pipe(
            Match.when("capacity", () =>
              Effect.fail(new CalculatorCapacityExceeded())
            ),
            Match.when("timeout", () =>
              Effect.fail(new CalculatorOperationTimedOut())
            ),
            Match.when("success", () => calculator.calculate(request)),
            Match.when("expected", () =>
              Effect.fail(
                new CalculatorInputDecodeError({
                  issues: [
                    new CalculatorInputIssue({
                      message: sensitiveSentinel,
                      path: [sensitiveSentinel],
                    }),
                  ],
                  message: sensitiveSentinel,
                })
              )
            ),
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
          ),
      });
    })
  ).pipe(Layer.provide(CalculatorLive));
