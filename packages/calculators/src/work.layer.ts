import {
  Clock,
  Duration,
  Effect,
  Layer,
  Option,
  Semaphore,
  Boolean as EffectBoolean,
} from "effect";

import {
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
} from "./schemas.js";
import { PublicCalculatorService } from "./service.js";

export const CalculatorConcurrencyLimit = 8;
export const CalculatorOperationBudget = Duration.seconds(5);
// The shared service budget covers completion and scoped cleanup. Every caller
// suspends the service invocation so eager metadata construction is counted.
const withinOperationBudget = Effect.fnUntraced(function* <A, E, R>(
  operation: Effect.Effect<A, E, R>
) {
  const started = yield* Clock.monotonicTimeNanos;
  const result = yield* operation.pipe(
    Effect.scoped,
    Effect.timeoutOrElse({
      duration: CalculatorOperationBudget,
      orElse: () => Effect.fail(new CalculatorOperationTimedOut()),
    })
  );
  const finished = yield* Clock.monotonicTimeNanos;
  // Timers cannot pre-empt synchronous JavaScript. Reject a late result
  // once control returns, without claiming that CPU work was stopped.
  return yield* EffectBoolean.match(
    Duration.isGreaterThanOrEqualTo(
      Duration.nanos(finished - started),
      CalculatorOperationBudget
    ),
    {
      onFalse: () => Effect.succeed(result),
      onTrue: () => Effect.fail(new CalculatorOperationTimedOut()),
    }
  );
});
// The host builds this Layer once over its calculation implementation. Every
// transport shares this pool; each calculation in a batch takes its own place.
export const PublicCalculatorServiceBounded = Layer.effect(
  PublicCalculatorService,
  Effect.gen(function* () {
    const calculator = yield* PublicCalculatorService;
    const places = yield* Semaphore.make(CalculatorConcurrencyLimit);
    return PublicCalculatorService.of({
      calculate: Effect.fn("PublicCalculatorService.calculate")((request) =>
        Effect.suspend(() => calculator.calculate(request)).pipe(
          withinOperationBudget,
          places.withPermitsIfAvailable(1),
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new CalculatorCapacityExceeded()),
              onSome: Effect.succeed,
            })
          )
        )
      ),
      getCalculator: Effect.fn("PublicCalculatorService.getCalculator")(
        (request) =>
          Effect.suspend(() => calculator.getCalculator(request)).pipe(
            withinOperationBudget
          )
      ),
      getCalculatorGraph: Effect.fn(
        "PublicCalculatorService.getCalculatorGraph"
      )((request) =>
        Effect.suspend(() => calculator.getCalculatorGraph(request)).pipe(
          withinOperationBudget
        )
      ),
      getCalculatorSchema: Effect.fn(
        "PublicCalculatorService.getCalculatorSchema"
      )((request) =>
        Effect.suspend(() => calculator.getCalculatorSchema(request)).pipe(
          withinOperationBudget
        )
      ),
      listCalculators: Effect.fn("PublicCalculatorService.listCalculators")(
        (query) =>
          Effect.suspend(() => calculator.listCalculators(query)).pipe(
            withinOperationBudget
          )
      ),
      listFacts: Effect.fn("PublicCalculatorService.listFacts")((query) =>
        Effect.suspend(() => calculator.listFacts(query)).pipe(
          withinOperationBudget
        )
      ),
      listJurisdictions: Effect.fn("PublicCalculatorService.listJurisdictions")(
        () =>
          Effect.suspend(() => calculator.listJurisdictions()).pipe(
            withinOperationBudget
          )
      ),
      listRules: Effect.fn("PublicCalculatorService.listRules")((query) =>
        Effect.suspend(() => calculator.listRules(query)).pipe(
          withinOperationBudget
        )
      ),
      listTaxYears: Effect.fn("PublicCalculatorService.listTaxYears")((query) =>
        Effect.suspend(() => calculator.listTaxYears(query)).pipe(
          withinOperationBudget
        )
      ),
    });
  })
);
