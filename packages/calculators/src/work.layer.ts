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
  CalculatorAdmission,
  CalculatorRequestRateKey,
} from "./admission.service.js";
import {
  CalculatorAdmissionUnavailable,
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
} from "./schemas.js";
import type { CalculatorRateLimited } from "./schemas.js";
import {
  CalculatorCatalogue,
  CalculatorUsage,
  PublicCalculatorService,
} from "./service.js";

export const CalculatorConcurrencyLimit = 8;
export const CalculatorOperationBudget = Duration.seconds(5);
// The shared service budget covers completion and scoped cleanup. Every caller
// suspends the catalogue invocation so eager metadata construction is counted.
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
/**
 * The one public calculator implementation. A host builds it once over the
 * catalogue: every transport shares its pool of calculation places, and each
 * calculation in a batch takes its own place. `admit` is the host's
 * calculation admission, checked inside the work budget; successful
 * calculations are then reported to `CalculatorUsage` outside it.
 */
const makePublicCalculatorService = Effect.fnUntraced(function* (
  admit: Effect.Effect<
    void,
    CalculatorRateLimited | CalculatorAdmissionUnavailable
  >
) {
  const catalogue = yield* CalculatorCatalogue;
  const usage = yield* CalculatorUsage;
  const places = yield* Semaphore.make(CalculatorConcurrencyLimit);
  return PublicCalculatorService.of({
    calculate: Effect.fn("PublicCalculatorService.calculate")((request) =>
      admit.pipe(
        Effect.andThen(Effect.suspend(() => catalogue.calculate(request))),
        withinOperationBudget,
        places.withPermitsIfAvailable(1),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new CalculatorCapacityExceeded()),
            onSome: Effect.succeed,
          })
        ),
        Effect.tap(usage.record)
      )
    ),
    getCalculator: Effect.fn("PublicCalculatorService.getCalculator")(
      (request) =>
        Effect.suspend(() => catalogue.getCalculator(request)).pipe(
          withinOperationBudget
        )
    ),
    getCalculatorGraph: Effect.fn("PublicCalculatorService.getCalculatorGraph")(
      (request) =>
        Effect.suspend(() => catalogue.getCalculatorGraph(request)).pipe(
          withinOperationBudget
        )
    ),
    getCalculatorSchema: Effect.fn(
      "PublicCalculatorService.getCalculatorSchema"
    )((request) =>
      Effect.suspend(() => catalogue.getCalculatorSchema(request)).pipe(
        withinOperationBudget
      )
    ),
    listCalculators: Effect.fn("PublicCalculatorService.listCalculators")(
      (query) =>
        Effect.suspend(() => catalogue.listCalculators(query)).pipe(
          withinOperationBudget
        )
    ),
    listFacts: Effect.fn("PublicCalculatorService.listFacts")((query) =>
      Effect.suspend(() => catalogue.listFacts(query)).pipe(
        withinOperationBudget
      )
    ),
    listJurisdictions: Effect.fn("PublicCalculatorService.listJurisdictions")(
      () =>
        Effect.suspend(() => catalogue.listJurisdictions()).pipe(
          withinOperationBudget
        )
    ),
    listRules: Effect.fn("PublicCalculatorService.listRules")((query) =>
      Effect.suspend(() => catalogue.listRules(query)).pipe(
        withinOperationBudget
      )
    ),
    listTaxYears: Effect.fn("PublicCalculatorService.listTaxYears")((query) =>
      Effect.suspend(() => catalogue.listTaxYears(query)).pipe(
        withinOperationBudget
      )
    ),
  });
});
// The public service with the shared work budget and no rate admission, over
// a supplied catalogue. `PublicCalculatorServiceLive` supplies the real one;
// direct and local SDK callers use it.
export const PublicCalculatorServiceBounded = Layer.effect(
  PublicCalculatorService,
  makePublicCalculatorService(Effect.void)
);
// The native host builds this once over the catalogue. Each calculation is
// admitted for its request's checked identity inside the shared work budget;
// metadata stays outside the allowance.
export const PublicCalculatorServiceRateLimited = Layer.effect(
  PublicCalculatorService,
  Effect.gen(function* () {
    const admission = yield* CalculatorAdmission;
    const admit = CalculatorRequestRateKey.pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(new CalculatorAdmissionUnavailable()),
          onSome: admission.admitCalculation,
        })
      )
    );
    return yield* makePublicCalculatorService(admit);
  })
);
