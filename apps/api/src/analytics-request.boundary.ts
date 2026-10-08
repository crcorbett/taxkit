import { collectionPolicyFromHeaders } from "@taxkit/analytics/collection-policy";
import type { CalculatorUse } from "@taxkit/analytics/schemas";
import { BackendAnalytics } from "@taxkit/analytics/service";
import {
  DurableObjectState,
  WorkerExecutionContext,
} from "alchemy/Cloudflare/Workers";
import type { HttpEffect } from "alchemy/Http";
import { RuntimeContext } from "alchemy/RuntimeContext";
import { Context, Effect, Layer, Option, Ref } from "effect";
import { HttpServerRequest } from "effect/http";

import { ApiCalculatorEvents } from "./calculator-analytics.layer.js";

// Native host composition supplies capture. An in-process or local host
// deliberately has no background delivery; it must not borrow another runtime.
export const ApiCalculatorDelivery = Context.Reference<
  Option.Option<{
    readonly recordCalculatorUse: (input: CalculatorUse) => Effect.Effect<void>;
  }>
>("@taxkit/api/ApiCalculatorDelivery", { defaultValue: Option.none });

export const ApiCalculatorDeliveryLive = Layer.effect(
  ApiCalculatorDelivery,
  Effect.gen(function* () {
    const analytics = yield* BackendAnalytics;
    return Option.some({
      recordCalculatorUse: Effect.fn(
        "ApiCalculatorDelivery.recordCalculatorUse"
      )(function* (input) {
        const runtime = yield* Effect.serviceOption(RuntimeContext);
        const worker = yield* Effect.serviceOption(WorkerExecutionContext);
        const session = yield* Effect.serviceOption(DurableObjectState);
        const send = analytics.recordCalculatorUse(input).pipe(
          Effect.catchTag("AnalyticsCaptureError", (error) =>
            Effect.logDebug("Calculator analytics dropped").pipe(
              Effect.annotateLogs({
                operation: error.operation,
                reason: error.reason,
              })
            )
          ),
          Effect.asVoid
        );
        return yield* Option.match(runtime, {
          onNone: () => Effect.void,
          onSome: (native) =>
            Option.match(session, {
              onNone: () =>
                Option.match(worker, {
                  onNone: () => Effect.void,
                  onSome: (background) =>
                    background
                      .waitUntil(send)
                      .pipe(Effect.provideService(RuntimeContext, native)),
                }),
              onSome: (state) =>
                state
                  .waitUntil(send)
                  .pipe(Effect.provideService(RuntimeContext, native)),
            }),
        });
      }),
    });
  })
);

// Only this HTTP header boundary chooses collection. Missing policy allows
// collection; DNT, explicit denial and malformed policy refuse it. The flag
// carries no identity and never changes authentication or calculation admission.
export const withCalculatorAnalytics = Effect.fnUntraced(function* <R>(
  operation: HttpEffect<R>
) {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const collectionPolicy = collectionPolicyFromHeaders(request.headers);
  const events = yield* Ref.make<readonly CalculatorUse[]>([]);
  const response = yield* operation.pipe(
    Effect.provideService(
      ApiCalculatorEvents,
      Option.some({ collectionPolicy, events })
    )
  );
  yield* Option.match(yield* ApiCalculatorDelivery, {
    onNone: () => Effect.void,
    onSome: (delivery) =>
      Ref.get(events).pipe(
        Effect.flatMap((completed) =>
          Effect.forEach(
            completed,
            (input) => delivery.recordCalculatorUse(input),
            { discard: true }
          )
        )
      ),
  });
  return response;
});
