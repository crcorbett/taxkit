import { CalculatorUsage } from "@taxkit/calculators/service";
import {
  Match,
  Array,
  Context,
  Effect,
  Layer,
  Option,
  Ref,
  Boolean as EffectBoolean,
} from "effect";

import { AnalyticsCaptureError } from "./errors.js";
import { CalculatorAnalyticsName, CalculatorUse } from "./schemas.js";
import type { CollectionPolicy } from "./schemas.js";
// The request owns this collector. Registration must omit it so native MCP
// cannot retain the first visitor's collection policy or event accumulator.
export const ApiCalculatorEvents = Context.Reference<
  Option.Option<{
    readonly collectionPolicy: CollectionPolicy;
    readonly events: Ref.Ref<readonly CalculatorUse[]>;
  }>
>("@taxkit/analytics/ApiCalculatorEvents", { defaultValue: Option.none });
const ApiCalculatorEventLimit = 64;
// One analytics-owned usage observer covers HTTP, RPC and both MCP protocols.
// The public calculator implementation calls it after the checked calculation
// succeeds, outside its tax-work deadline. The pure catalogue and local SDK
// never depend on analytics.
export const ApiCalculatorUsageLive = Layer.succeed(
  CalculatorUsage,
  CalculatorUsage.of({
    record: Effect.fn("CalculatorUsage.record")(function* (result) {
      yield* Option.match(yield* ApiCalculatorEvents, {
        onNone: () => Effect.void,
        onSome: ({ collectionPolicy, events }) =>
          Match.value(collectionPolicy).pipe(
            Match.when("deny", () => Effect.void),
            Match.orElse((matchedValue) =>
              CalculatorAnalyticsName.makeEffect(result.calculator.title).pipe(
                Effect.flatMap((calculatorName) =>
                  Ref.update(events, (current) =>
                    EffectBoolean.match(
                      current.length < ApiCalculatorEventLimit,
                      {
                        onFalse: () => current,
                        onTrue: () =>
                          Array.append(
                            current,
                            CalculatorUse.make({
                              calculatorId: result.calculator.calculatorId,
                              calculatorName,
                              collectionPolicy: matchedValue,
                            })
                          ),
                      }
                    )
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
              )
            )
          ),
      });
    }),
  })
);
