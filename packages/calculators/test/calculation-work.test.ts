import { describe, expect, it } from "@effect/vitest";
import { NonNegativeMoney } from "@taxkit/core";
import { Money, Cents } from "@taxkit/core/primitives";
import {
  AuPayTakeHomeId,
  TakeHomeScenarioInputSchema,
} from "@taxkit/rules-au-pay/schemas";
import { expectAt } from "@taxkit/testing";
import {
  Function as EffectFunction,
  Array,
  Cause,
  Clock,
  Context,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Match,
  Option,
  Ref,
  Result,
  Boolean as EffectBoolean,
} from "effect";
import { TestClock } from "effect/testing";

import { CalculatorCatalogueLive } from "../src/live.layer.js";
import {
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
  CalculatorRunRequest,
  MetadataQuery,
  DescriptorFilterQuery,
  GetCalculatorRequest,
  GetCalculatorGraphRequest,
  UnsupportedCalculatorError,
} from "../src/schemas.js";
import {
  CalculatorCatalogue,
  PublicCalculatorService,
} from "../src/service.js";
import {
  CalculatorUsageDisabled,
  PublicCalculatorServiceBounded,
} from "../src/work.layer.js";

const calculatorId = AuPayTakeHomeId.make("au.pay.take-home");
const Request = CalculatorRunRequest.make({
  calculatorId,
  payload: {
    facts: TakeHomeScenarioInputSchema.make({
      grossPay: NonNegativeMoney.make(
        new Money({ cents: Cents.make(165_400), currency: "AUD" })
      ),
      period: "weekly",
      taxFreeThresholdClaimed: true,
    }),
  },
});
const MetadataWorkCases = [
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service
        .getCalculator(GetCalculatorRequest.make({ calculatorId }))
        .pipe(Effect.asVoid),
    operation: "getCalculator",
    // Substitute the selected catalogue operation where it is acquired.
    substitute: Effect.fnUntraced(function* (work: Effect.Effect<never>) {
      const live = yield* CalculatorCatalogue;
      return CalculatorCatalogue.of({
        ...live,
        getCalculator: Effect.fn("CalculatorCatalogue.getCalculator")(
          () => work
        ),
      });
    }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service
        .getCalculatorGraph(GetCalculatorGraphRequest.make({ calculatorId }))
        .pipe(Effect.asVoid),
    operation: "getCalculatorGraph",
    // Substitute the selected catalogue operation where it is acquired.
    substitute: Effect.fnUntraced(function* (work: Effect.Effect<never>) {
      const live = yield* CalculatorCatalogue;
      return CalculatorCatalogue.of({
        ...live,
        getCalculatorGraph: Effect.fn("CalculatorCatalogue.getCalculatorGraph")(
          () => work
        ),
      });
    }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service
        .getCalculatorSchema(GetCalculatorRequest.make({ calculatorId }))
        .pipe(Effect.asVoid),
    operation: "getCalculatorSchema",
    // Substitute the selected catalogue operation where it is acquired.
    substitute: Effect.fnUntraced(function* (work: Effect.Effect<never>) {
      const live = yield* CalculatorCatalogue;
      return CalculatorCatalogue.of({
        ...live,
        getCalculatorSchema: Effect.fn(
          "CalculatorCatalogue.getCalculatorSchema"
        )(() => work),
      });
    }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service.listCalculators(MetadataQuery.make({})).pipe(Effect.asVoid),
    operation: "listCalculators",
    // Substitute the selected catalogue operation where it is acquired.
    substitute: Effect.fnUntraced(function* (work: Effect.Effect<never>) {
      const live = yield* CalculatorCatalogue;
      return CalculatorCatalogue.of({
        ...live,
        listCalculators: Effect.fn("CalculatorCatalogue.listCalculators")(
          () => work
        ),
      });
    }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service.listFacts(DescriptorFilterQuery.make({})).pipe(Effect.asVoid),
    operation: "listFacts",
    // Substitute the selected catalogue operation where it is acquired.
    substitute: Effect.fnUntraced(function* (work: Effect.Effect<never>) {
      const live = yield* CalculatorCatalogue;
      return CalculatorCatalogue.of({
        ...live,
        listFacts: Effect.fn("CalculatorCatalogue.listFacts")(() => work),
      });
    }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service.listJurisdictions().pipe(Effect.asVoid),
    operation: "listJurisdictions",
    // Substitute the selected catalogue operation where it is acquired.
    substitute: Effect.fnUntraced(function* (work: Effect.Effect<never>) {
      const live = yield* CalculatorCatalogue;
      return CalculatorCatalogue.of({
        ...live,
        listJurisdictions: Effect.fn("CalculatorCatalogue.listJurisdictions")(
          () => work
        ),
      });
    }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service.listRules(DescriptorFilterQuery.make({})).pipe(Effect.asVoid),
    operation: "listRules",
    // Substitute the selected catalogue operation where it is acquired.
    substitute: Effect.fnUntraced(function* (work: Effect.Effect<never>) {
      const live = yield* CalculatorCatalogue;
      return CalculatorCatalogue.of({
        ...live,
        listRules: Effect.fn("CalculatorCatalogue.listRules")(() => work),
      });
    }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service.listTaxYears(MetadataQuery.make({})).pipe(Effect.asVoid),
    operation: "listTaxYears",
    // Substitute the selected catalogue operation where it is acquired.
    substitute: Effect.fnUntraced(function* (work: Effect.Effect<never>) {
      const live = yield* CalculatorCatalogue;
      return CalculatorCatalogue.of({
        ...live,
        listTaxYears: Effect.fn("CalculatorCatalogue.listTaxYears")(() => work),
      });
    }),
  },
] as const;
const Live = CalculatorCatalogueLive;
// Substitute work at the catalogue; keep the production work-policy Layer.
const bounded = Effect.fnUntraced(function* (
  implementation: CalculatorCatalogue["Service"]
) {
  const context = yield* Layer.build(
    PublicCalculatorServiceBounded.pipe(
      Layer.provide(Layer.succeed(CalculatorCatalogue, implementation)),
      Layer.provide(CalculatorUsageDisabled)
    )
  );
  return Context.get(context, PublicCalculatorService);
});
const failure = <A, E>(exit: Exit.Exit<A, E>) => {
  EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
    expect(actual).toBeTruthy();
  });
  return Exit.match(exit, {
    onFailure: Cause.findErrorOption,
    onSuccess: () => Option.none(),
  });
};
describe("shared calculation work policy", () => {
  it.effect.each(MetadataWorkCases)(
    "bounds $operation at five seconds and closes its resources",
    ({ invoke, substitute }) =>
      Effect.gen(function* () {
        const started = yield* Deferred.make<boolean>();
        const released = yield* Ref.make(false);
        const work = Deferred.succeed(started, true).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Ref.set(released, true))
        );
        const service = yield* substitute(work).pipe(Effect.flatMap(bounded));
        const call = yield* invoke(service).pipe(Effect.forkScoped);
        yield* Deferred.await(started);
        // Nine metadata calls can wait without using a calculation place.
        const extra = yield* Effect.forEach(Array.range(1, 8), () =>
          invoke(service).pipe(Effect.forkScoped)
        );
        expect((yield* service.calculate(Request)).report).toMatchObject({
          netPay: { cents: 130_100 },
        });
        yield* TestClock.adjust("4 seconds");
        expect(!(yield* Ref.get(released))).toBeTruthy();
        yield* TestClock.adjust("1 second");
        expect({
          resourcesReleased: yield* Ref.get(released),
          failureYieldFiberAwaitCall: failure(yield* Fiber.await(call)),
        }).toStrictEqual({
          resourcesReleased: true,
          failureYieldFiberAwaitCall: Option.some(
            new CalculatorOperationTimedOut()
          ),
        });
        yield* EffectFunction.pipe(extra, Effect.forEach(Fiber.await));
      }).pipe(Effect.provide(Live), Effect.scoped)
  );
  it.effect.each(MetadataWorkCases)(
    "closes $operation on earlier caller cancellation",
    ({ invoke, substitute }) =>
      Effect.gen(function* () {
        const started = yield* Deferred.make<boolean>();
        const released = yield* Ref.make(false);
        const work = Deferred.succeed(started, true).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Ref.set(released, true))
        );
        const service = yield* substitute(work).pipe(Effect.flatMap(bounded));
        const call = yield* invoke(service).pipe(Effect.forkScoped);
        yield* Deferred.await(started);
        yield* TestClock.adjust("1 second");
        yield* Fiber.interrupt(call);
        expect(yield* Ref.get(released)).toBeTruthy();
      }).pipe(Effect.provide(Live), Effect.scoped)
  );
  it.effect.each(MetadataWorkCases)(
    "rejects late $operation results after control returns",
    ({ invoke }) =>
      Effect.gen(function* () {
        const service = yield* bounded(yield* CalculatorCatalogue);
        const clock = yield* Clock.Clock;
        const time = yield* Ref.make(0n);
        const exit = yield* Effect.exit(invoke(service)).pipe(
          Effect.provideService(Clock.Clock, {
            currentTimeMillis: clock.currentTimeMillis,
            currentTimeMillisUnsafe: () => clock.currentTimeMillisUnsafe(),
            currentTimeNanos: clock.currentTimeNanos,
            currentTimeNanosUnsafe: () => clock.currentTimeNanosUnsafe(),
            monotonicTimeNanos: Ref.modify(time, (value) => [
              value,
              5_000_000_000n,
            ]),
            monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
            sleep: (duration) => clock.sleep(duration),
          })
        );
        EffectFunction.pipe(failure(exit), (actual) => {
          expect(actual).toStrictEqual(
            Option.some(new CalculatorOperationTimedOut())
          );
        });
      }).pipe(Effect.provide(Live), Effect.scoped)
  );
  it.effect(
    "admits eight calls, rejects the ninth immediately and reuses a cancelled place",
    () =>
      Effect.gen(function* () {
        const live = yield* CalculatorCatalogue;
        const active = yield* Ref.make(0);
        const started = yield* Deferred.make<boolean>();
        const release = yield* Deferred.make<boolean>();
        const service = yield* EffectFunction.pipe(
          CalculatorCatalogue.of({
            ...live,
            calculate: Effect.fn("CalculatorCatalogue.calculate")((request) =>
              Effect.gen(function* () {
                const count = yield* Ref.updateAndGet(
                  active,
                  (value) => value + 1
                );
                if (count === 8) {
                  yield* Deferred.succeed(started, true);
                }
                yield* Deferred.await(release);
                return yield* live.calculate(request);
              }).pipe(Effect.ensuring(Ref.update(active, (value) => value - 1)))
            ),
          }),
          bounded
        );
        const calls = yield* Effect.forEach(Array.range(1, 8), () =>
          service.calculate(Request).pipe(Effect.forkScoped)
        );
        yield* Deferred.await(started);
        const refused = yield* Deferred.make<boolean>();
        const ninth = yield* service.calculate(Request).pipe(
          Effect.exit,
          Effect.tap(() => Deferred.succeed(refused, true)),
          Effect.forkScoped
        );
        yield* Effect.yieldNow;
        expect({
          requestRefused: yield* Deferred.isDone(refused),
          failureYieldFiberJoinNinth: failure(yield* Fiber.join(ninth)),
          admissionState: {
            RefGetActive: yield* Ref.get(active),
            length: (yield* service.listCalculators(MetadataQuery.make({})))
              .calculators.length,
          },
        }).toStrictEqual({
          requestRefused: true,
          failureYieldFiberJoinNinth: Option.some(
            new CalculatorCapacityExceeded()
          ),
          admissionState: {
            RefGetActive: 8,
            length: 3,
          },
        });
        yield* Fiber.interrupt(expectAt(calls, 0));
        expect(yield* Ref.get(active)).toBe(7);
        const replacement = yield* service
          .calculate(Request)
          .pipe(Effect.forkScoped);
        yield* Deferred.await(started);
        yield* Effect.yieldNow;
        expect(yield* Ref.get(active)).toBe(8);
        yield* Deferred.succeed(release, true);
        const report = yield* Fiber.join(replacement);
        expect(report.report).toMatchObject({ netPay: { cents: 130_100 } });
        yield* Effect.forEach(Array.drop(calls, 1), Fiber.join);
        expect(yield* Ref.get(active)).toBe(0);
      }).pipe(Effect.provide(Live), Effect.scoped)
  );
  it.effect(
    "times out held work at five seconds, closes it and admits new work",
    () =>
      Effect.gen(function* () {
        const live = yield* CalculatorCatalogue;
        const started = yield* Deferred.make<boolean>();
        const released = yield* Ref.make(false);
        const stalled = yield* Ref.make(true);
        const service = yield* EffectFunction.pipe(
          CalculatorCatalogue.of({
            ...live,
            calculate: Effect.fn("CalculatorCatalogue.calculate")((request) =>
              Ref.get(stalled).pipe(
                Effect.flatMap((hold) =>
                  EffectBoolean.match(hold, {
                    onFalse: () => live.calculate(request),
                    onTrue: () =>
                      Deferred.succeed(started, true).pipe(
                        Effect.andThen(Effect.never),
                        Effect.ensuring(Ref.set(released, true))
                      ),
                  })
                )
              )
            ),
          }),
          bounded
        );
        const call = yield* service.calculate(Request).pipe(Effect.forkScoped);
        yield* Deferred.await(started);
        yield* TestClock.adjust("4 seconds");
        expect(!(yield* Ref.get(released))).toBeTruthy();
        yield* TestClock.adjust("1 second");
        expect({
          resourcesReleased: yield* Ref.get(released),
          failureYieldFiberAwaitCall: failure(yield* Fiber.await(call)),
        }).toStrictEqual({
          resourcesReleased: true,
          failureYieldFiberAwaitCall: Option.some(
            new CalculatorOperationTimedOut()
          ),
        });
        yield* Ref.set(stalled, false);
        expect((yield* service.calculate(Request)).report).toMatchObject({
          netPay: { cents: 130_100 },
        });
      }).pipe(Effect.provide(Live), Effect.scoped)
  );
  it.effect("rejects a late synchronous result after control returns", () =>
    Effect.gen(function* () {
      const live = yield* CalculatorCatalogue;
      const result = yield* live.calculate(Request);
      const service = yield* EffectFunction.pipe(
        CalculatorCatalogue.of({
          ...live,
          calculate: Effect.fn("CalculatorCatalogue.calculate")(() =>
            Effect.succeed(result)
          ),
        }),
        bounded
      );
      const clock = yield* Clock.Clock;
      const time = yield* Ref.make(0n);
      const exit = yield* Effect.exit(service.calculate(Request)).pipe(
        Effect.provideService(Clock.Clock, {
          currentTimeMillis: clock.currentTimeMillis,
          currentTimeMillisUnsafe: () => clock.currentTimeMillisUnsafe(),
          currentTimeNanos: clock.currentTimeNanos,
          currentTimeNanosUnsafe: () => clock.currentTimeNanosUnsafe(),
          monotonicTimeNanos: Ref.modify(time, (value) => [
            value,
            5_000_000_000n,
          ]),
          monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
          sleep: (duration) => clock.sleep(duration),
        })
      );
      EffectFunction.pipe(failure(exit), (actual) => {
        expect(actual).toStrictEqual(
          Option.some(new CalculatorOperationTimedOut())
        );
      });
    }).pipe(Effect.provide(Live), Effect.scoped)
  );
  it.effect(
    "releases places after expected failure, defects and completed work",
    () =>
      Effect.gen(function* () {
        const live = yield* CalculatorCatalogue;
        const original = new UnsupportedCalculatorError({
          message: "fixture",
          requestedCalculator: "fixture",
        });
        const defect = { message: "private-defect-sentinel" };
        const mode = yield* Ref.make<"error" | "defect" | "success">("error");
        const service = yield* EffectFunction.pipe(
          CalculatorCatalogue.of({
            ...live,
            calculate: Effect.fn("CalculatorCatalogue.calculate")((request) =>
              Ref.get(mode).pipe(
                Effect.flatMap((current) =>
                  Match.value(current).pipe(
                    Match.when("error", () => Effect.fail(original)),
                    Match.when("defect", () => Effect.die(defect)),
                    Match.when("success", () => live.calculate(request)),
                    Match.exhaustive
                  )
                )
              )
            ),
          }),
          bounded
        );
        yield* Effect.forEach(Array.range(1, 9), () =>
          Effect.gen(function* () {
            yield* Ref.set(mode, "error");
            EffectFunction.pipe(
              failure(yield* Effect.exit(service.calculate(Request))),
              (actual) => {
                expect(actual).toStrictEqual(Option.some(original));
              }
            );
            yield* Ref.set(mode, "defect");
            const exit = yield* Effect.exit(service.calculate(Request));
            expect(
              Exit.isFailure(exit) && Cause.hasDies(exit.cause)
            ).toBeTruthy();
            if (Exit.isFailure(exit)) {
              Cause.findDefect(exit.cause).pipe(
                Result.match({
                  onFailure: () => expect.fail("Expected the original defect"),
                  onSuccess: (actual) => {
                    expect(actual).toBe(defect);
                  },
                })
              );
            }
            yield* Ref.set(mode, "success");
            expect((yield* service.calculate(Request)).report).toMatchObject({
              netPay: { cents: 130_100 },
            });
          })
        );
      }).pipe(Effect.provide(Live), Effect.scoped)
  );
  it.effect("closes all caller-owned work and frees its places", () =>
    Effect.gen(function* () {
      const live = yield* CalculatorCatalogue;
      const active = yield* Ref.make(0);
      const held = yield* Ref.make(true);
      const started = yield* Deferred.make<boolean>();
      const service = yield* EffectFunction.pipe(
        CalculatorCatalogue.of({
          ...live,
          calculate: Effect.fn("CalculatorCatalogue.calculate")((request) =>
            Ref.get(held).pipe(
              Effect.flatMap((hold) =>
                EffectBoolean.match(hold, {
                  onFalse: () => live.calculate(request),
                  onTrue: () =>
                    Ref.updateAndGet(active, (count) => count + 1).pipe(
                      Effect.flatMap((count) =>
                        Match.value(count).pipe(
                          Match.when(8, () => Deferred.succeed(started, true)),
                          Match.orElse(() => Effect.void)
                        )
                      ),
                      Effect.andThen(Effect.never),
                      Effect.ensuring(Ref.update(active, (count) => count - 1))
                    ),
                })
              )
            )
          ),
        }),
        bounded
      );
      yield* Effect.gen(function* () {
        yield* Effect.forEach(Array.range(1, 8), () =>
          service.calculate(Request).pipe(Effect.forkScoped)
        );
        yield* Deferred.await(started);
        expect(yield* Ref.get(active)).toBe(8);
      }).pipe(Effect.scoped);
      expect(yield* Ref.get(active)).toBe(0);
      yield* Ref.set(held, false);
      expect((yield* service.calculate(Request)).report).toMatchObject({
        netPay: { cents: 130_100 },
      });
    }).pipe(Effect.provide(Live), Effect.scoped)
  );
  it.effect("gives separate host instances separate pools", () =>
    Effect.gen(function* () {
      const live = yield* CalculatorCatalogue;
      const count = yield* Ref.make(0);
      const started = yield* Deferred.make<boolean>();
      const fixture = CalculatorCatalogue.of({
        ...live,
        calculate: Effect.fn("CalculatorCatalogue.calculate")(() =>
          Ref.updateAndGet(count, (value) => value + 1).pipe(
            Effect.flatMap((value) =>
              Match.value(value).pipe(
                Match.when(16, () => Deferred.succeed(started, true)),
                Match.orElse(() => Effect.void)
              )
            ),
            Effect.andThen(Effect.never),
            Effect.ensuring(Ref.update(count, (value) => value - 1))
          )
        ),
      });
      const first = yield* bounded(fixture);
      const second = yield* bounded(fixture);
      yield* Effect.forEach([first, second], (service) =>
        Effect.forEach(Array.range(1, 8), () =>
          service.calculate(Request).pipe(Effect.forkScoped)
        )
      );
      yield* Deferred.await(started);
      expect({
        RefGetCount: yield* Ref.get(count),
        firstFailure: failure(yield* Effect.exit(first.calculate(Request))),
        secondFailure: failure(yield* Effect.exit(second.calculate(Request))),
      }).toStrictEqual({
        RefGetCount: 16,
        firstFailure: Option.some(new CalculatorCapacityExceeded()),
        secondFailure: Option.some(new CalculatorCapacityExceeded()),
      });
    }).pipe(Effect.provide(Live), Effect.scoped)
  );
});
