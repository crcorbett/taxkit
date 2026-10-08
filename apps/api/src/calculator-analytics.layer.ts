import { AnalyticsCaptureError } from "@taxkit/analytics/errors";
import {
  CalculatorAnalyticsName,
  CalculatorUse,
} from "@taxkit/analytics/schemas";
import type { CollectionPolicy } from "@taxkit/analytics/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { Array, Context, Effect, Layer, Option, Ref } from "effect";

// The request owns this collector. Registration must omit it so native MCP
// cannot retain the first visitor's collection policy or event accumulator.
export const ApiCalculatorEvents = Context.Reference<
  Option.Option<{
    readonly collectionPolicy: CollectionPolicy;
    readonly events: Ref.Ref<readonly CalculatorUse[]>;
  }>
>("@taxkit/api/ApiCalculatorEvents", { defaultValue: Option.none });
const ApiCalculatorEventLimit = 64;

// One app-owned decorator covers HTTP, RPC and both MCP protocols. It runs
// after the checked calculation succeeds, outside its tax-work deadline. The
// pure calculator service and local SDK never depend on analytics.
export const ApiCalculatorAnalyticsLive = Layer.effect(
  PublicCalculatorService,
  Effect.gen(function* () {
    const calculator = yield* PublicCalculatorService;
    return PublicCalculatorService.of({
      ...calculator,
      calculate: Effect.fn("ApiCalculatorAnalytics.calculate")(
        function* (request) {
          const result = yield* calculator.calculate(request);
          yield* Option.match(yield* ApiCalculatorEvents, {
            onNone: () => Effect.void,
            onSome: ({ collectionPolicy, events }) =>
              collectionPolicy === "deny"
                ? Effect.void
                : CalculatorAnalyticsName.makeEffect(
                    result.calculator.title
                  ).pipe(
                    Effect.flatMap((calculatorName) =>
                      Ref.update(events, (current) =>
                        current.length < ApiCalculatorEventLimit
                          ? Array.append(
                              current,
                              CalculatorUse.make({
                                calculatorId: result.calculator.calculatorId,
                                calculatorName,
                                collectionPolicy,
                              })
                            )
                          : current
                      )
                    ),
                    Effect.mapError(
                      () =>
                        new AnalyticsCaptureError({
                          operation: "calculator-use",
                          reason: "encoding",
                        })
                    ),
                    Effect.catchTag("AnalyticsCaptureError", () =>
                      Effect.logDebug("Calculator analytics name refused")
                    )
                  ),
          });
          return result;
        }
      ),
    });
  })
);
