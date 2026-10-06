import { Clock, Duration, Effect, Layer, Option, Semaphore } from "effect";

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
  return yield* Duration.isGreaterThanOrEqualTo(
    Duration.nanos(finished - started),
    CalculatorOperationBudget
  )
    ? Effect.fail(new CalculatorOperationTimedOut())
    : Effect.succeed(result);
});

// The host builds this Layer once over its calculation implementation. Every
// transport shares this pool; each calculation in a batch takes its own place.
export const PublicCalculatorServiceBounded = Layer.effect(
  PublicCalculatorService,
  Effect.gen(function* () {
    const calculator = yield* PublicCalculatorService;
    const places = yield* Semaphore.make(CalculatorConcurrencyLimit);

    return PublicCalculatorService.of({
      calculate: Effect.fn("PublicCalculatorService.calculateBounded")(
        (request) =>
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
      getCalculator: Effect.fn("PublicCalculatorService.getCalculatorBounded")(
        (request) =>
          Effect.suspend(() => calculator.getCalculator(request)).pipe(
            withinOperationBudget
          )
      ),
      getCalculatorGraph: Effect.fn(
        "PublicCalculatorService.getCalculatorGraphBounded"
      )((request) =>
        Effect.suspend(() => calculator.getCalculatorGraph(request)).pipe(
          withinOperationBudget
        )
      ),
      getCalculatorSchema: Effect.fn(
        "PublicCalculatorService.getCalculatorSchemaBounded"
      )((request) =>
        Effect.suspend(() => calculator.getCalculatorSchema(request)).pipe(
          withinOperationBudget
        )
      ),
      listCalculators: Effect.fn(
        "PublicCalculatorService.listCalculatorsBounded"
      )((query) =>
        Effect.suspend(() => calculator.listCalculators(query)).pipe(
          withinOperationBudget
        )
      ),
      listFacts: Effect.fn("PublicCalculatorService.listFactsBounded")(
        (query) =>
          Effect.suspend(() => calculator.listFacts(query)).pipe(
            withinOperationBudget
          )
      ),
      listJurisdictions: Effect.fn(
        "PublicCalculatorService.listJurisdictionsBounded"
      )(() =>
        Effect.suspend(() => calculator.listJurisdictions()).pipe(
          withinOperationBudget
        )
      ),
      listRules: Effect.fn("PublicCalculatorService.listRulesBounded")(
        (query) =>
          Effect.suspend(() => calculator.listRules(query)).pipe(
            withinOperationBudget
          )
      ),
      listTaxYears: Effect.fn("PublicCalculatorService.listTaxYearsBounded")(
        (query) =>
          Effect.suspend(() => calculator.listTaxYears(query)).pipe(
            withinOperationBudget
          )
      ),
    });
  })
);
