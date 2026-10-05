import { Clock, Duration, Effect, Layer, Option, Semaphore } from "effect";

import {
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
} from "./schemas.js";
import { PublicCalculatorService } from "./service.js";

export const CalculatorConcurrencyLimit = 8;
export const CalculatorOperationBudget = Duration.seconds(5);

// The host builds this Layer once over its calculation implementation. Every
// transport shares this pool; each calculation in a batch takes its own place.
export const PublicCalculatorServiceBounded = Layer.effect(
  PublicCalculatorService,
  Effect.gen(function* () {
    const calculator = yield* PublicCalculatorService;
    const places = yield* Semaphore.make(CalculatorConcurrencyLimit);

    return PublicCalculatorService.of({
      ...calculator,
      calculate: Effect.fn("PublicCalculatorService.calculateBounded")(
        (request) =>
          Effect.gen(function* () {
            const started = yield* Clock.monotonicTimeNanos;
            const result = yield* calculator.calculate(request).pipe(
              Effect.scoped,
              Effect.timeoutOrElse({
                duration: CalculatorOperationBudget,
                orElse: () => Effect.fail(new CalculatorOperationTimedOut()),
              })
            );
            const finished = yield* Clock.monotonicTimeNanos;
            // Timers cannot pre-empt synchronous JavaScript. Reject a late result
            // once control returns, without claiming that CPU work was stopped.
            return yield* Duration.isGreaterThanOrEqualTo(
              Duration.nanos(finished - started),
              CalculatorOperationBudget
            )
              ? Effect.fail(new CalculatorOperationTimedOut())
              : Effect.succeed(result);
          }).pipe(
            places.withPermitsIfAvailable(1),
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.fail(new CalculatorCapacityExceeded()),
                onSome: Effect.succeed,
              })
            )
          )
      ),
    });
  })
);
