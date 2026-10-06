import { describe, expect, it } from "@effect/vitest";
import { CalculationEngineLive } from "@taxkit/core";
import { Money, Cents } from "@taxkit/core/primitives";
import { AuPayCalculatorId, GrossPay } from "@taxkit/rules-au-pay";
import { expectAt } from "@taxkit/testing";
import {
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
} from "effect";
import { TestClock } from "effect/testing";

import { PublicCalculatorServiceLive } from "../src/live.layer.js";
import {
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
  CalculatorRunServiceRequest,
  GetCalculatorRequest,
  GetCalculatorGraphRequest,
  UnsupportedCalculatorError,
} from "../src/schemas.js";
import { PublicCalculatorService } from "../src/service.js";
import { PublicCalculatorServiceBounded } from "../src/work.layer.js";

const Request = CalculatorRunServiceRequest.make({
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
const MetadataWorkCases = [
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service
        .getCalculator(
          GetCalculatorRequest.make({ calculatorId: Request.calculatorId })
        )
        .pipe(Effect.asVoid),
    operation: "getCalculator",
    substitute: (
      service: PublicCalculatorService["Service"],
      work: Effect.Effect<never>
    ) => PublicCalculatorService.of({ ...service, getCalculator: () => work }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service
        .getCalculatorGraph(
          GetCalculatorGraphRequest.make({ calculatorId: Request.calculatorId })
        )
        .pipe(Effect.asVoid),
    operation: "getCalculatorGraph",
    substitute: (
      service: PublicCalculatorService["Service"],
      work: Effect.Effect<never>
    ) =>
      PublicCalculatorService.of({
        ...service,
        getCalculatorGraph: () => work,
      }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service
        .getCalculatorSchema(
          GetCalculatorRequest.make({ calculatorId: Request.calculatorId })
        )
        .pipe(Effect.asVoid),
    operation: "getCalculatorSchema",
    substitute: (
      service: PublicCalculatorService["Service"],
      work: Effect.Effect<never>
    ) =>
      PublicCalculatorService.of({
        ...service,
        getCalculatorSchema: () => work,
      }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service.listCalculators({}).pipe(Effect.asVoid),
    operation: "listCalculators",
    substitute: (
      service: PublicCalculatorService["Service"],
      work: Effect.Effect<never>
    ) =>
      PublicCalculatorService.of({ ...service, listCalculators: () => work }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service.listFacts({}).pipe(Effect.asVoid),
    operation: "listFacts",
    substitute: (
      service: PublicCalculatorService["Service"],
      work: Effect.Effect<never>
    ) => PublicCalculatorService.of({ ...service, listFacts: () => work }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service.listJurisdictions().pipe(Effect.asVoid),
    operation: "listJurisdictions",
    substitute: (
      service: PublicCalculatorService["Service"],
      work: Effect.Effect<never>
    ) =>
      PublicCalculatorService.of({ ...service, listJurisdictions: () => work }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service.listRules({}).pipe(Effect.asVoid),
    operation: "listRules",
    substitute: (
      service: PublicCalculatorService["Service"],
      work: Effect.Effect<never>
    ) => PublicCalculatorService.of({ ...service, listRules: () => work }),
  },
  {
    invoke: (service: PublicCalculatorService["Service"]) =>
      service.listTaxYears({}).pipe(Effect.asVoid),
    operation: "listTaxYears",
    substitute: (
      service: PublicCalculatorService["Service"],
      work: Effect.Effect<never>
    ) => PublicCalculatorService.of({ ...service, listTaxYears: () => work }),
  },
] as const;

const Live = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

// Substitute work at the real service contract; keep the production limit Layer.
const bounded = Effect.fnUntraced(function* (
  implementation: PublicCalculatorService["Service"]
) {
  const context = yield* Layer.build(
    PublicCalculatorServiceBounded.pipe(
      Layer.provide(Layer.succeed(PublicCalculatorService, implementation))
    )
  );
  return Context.get(context, PublicCalculatorService);
});

const failure = <A, E>(exit: Exit.Exit<A, E>) => {
  expect(Exit.isFailure(exit)).toBe(true);
  return Exit.isFailure(exit)
    ? Cause.findErrorOption(exit.cause)
    : Option.none();
};

describe("shared calculation work policy", () => {
  it.effect.each(MetadataWorkCases)(
    "bounds $operation at five seconds and closes its resources",
    ({ invoke, substitute }) =>
      Effect.gen(function* () {
        const live = yield* PublicCalculatorService;
        const started = yield* Deferred.make<boolean>();
        const released = yield* Ref.make(false);
        const work = Deferred.succeed(started, true).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Ref.set(released, true))
        );
        const service = yield* bounded(substitute(live, work));
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
        expect(yield* Ref.get(released)).toBe(false);
        yield* TestClock.adjust("1 second");
        expect(yield* Ref.get(released)).toBe(true);
        expect(failure(yield* Fiber.await(call))).toEqual(
          Option.some(new CalculatorOperationTimedOut())
        );
        yield* Effect.forEach(extra, Fiber.await);
      }).pipe(Effect.provide(Live), Effect.scoped)
  );

  it.effect.each(MetadataWorkCases)(
    "closes $operation on earlier caller cancellation",
    ({ invoke, substitute }) =>
      Effect.gen(function* () {
        const live = yield* PublicCalculatorService;
        const started = yield* Deferred.make<boolean>();
        const released = yield* Ref.make(false);
        const service = yield* bounded(
          substitute(
            live,
            Deferred.succeed(started, true).pipe(
              Effect.andThen(Effect.never),
              Effect.ensuring(Ref.set(released, true))
            )
          )
        );
        const call = yield* invoke(service).pipe(Effect.forkScoped);
        yield* Deferred.await(started);
        yield* TestClock.adjust("1 second");
        yield* Fiber.interrupt(call);
        expect(yield* Ref.get(released)).toBe(true);
      }).pipe(Effect.provide(Live), Effect.scoped)
  );

  it.effect.each(MetadataWorkCases)(
    "rejects late $operation results after control returns",
    ({ invoke }) =>
      Effect.gen(function* () {
        const service = yield* bounded(yield* PublicCalculatorService);
        const clock = yield* Clock.Clock;
        const time = yield* Ref.make(0n);
        const exit = yield* Effect.exit(invoke(service)).pipe(
          Effect.provideService(Clock.Clock, {
            ...clock,
            monotonicTimeNanos: Ref.modify(time, (value) => [
              value,
              5_000_000_000n,
            ]),
          })
        );
        expect(failure(exit)).toEqual(
          Option.some(new CalculatorOperationTimedOut())
        );
      }).pipe(Effect.provide(Live), Effect.scoped)
  );

  it.effect(
    "admits eight calls, rejects the ninth immediately and reuses a cancelled place",
    () =>
      Effect.gen(function* () {
        const live = yield* PublicCalculatorService;
        const active = yield* Ref.make(0);
        const started = yield* Deferred.make<boolean>();
        const release = yield* Deferred.make<boolean>();
        const service = yield* bounded(
          PublicCalculatorService.of({
            ...live,
            calculate: (request) =>
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
              }).pipe(
                Effect.ensuring(Ref.update(active, (value) => value - 1))
              ),
          })
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
        expect(yield* Deferred.isDone(refused)).toBe(true);
        expect(failure(yield* Fiber.join(ninth))).toEqual(
          Option.some(new CalculatorCapacityExceeded())
        );
        expect(yield* Ref.get(active)).toBe(8);
        // Metadata does not occupy a calculation place.
        expect((yield* service.listCalculators({})).calculators).toHaveLength(
          3
        );
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
        const live = yield* PublicCalculatorService;
        const started = yield* Deferred.make<boolean>();
        const released = yield* Ref.make(false);
        const stalled = yield* Ref.make(true);
        const service = yield* bounded(
          PublicCalculatorService.of({
            ...live,
            calculate: (request) =>
              Ref.get(stalled).pipe(
                Effect.flatMap((hold) =>
                  hold
                    ? Deferred.succeed(started, true).pipe(
                        Effect.andThen(Effect.never),
                        Effect.ensuring(Ref.set(released, true))
                      )
                    : live.calculate(request)
                )
              ),
          })
        );
        const call = yield* service.calculate(Request).pipe(Effect.forkScoped);
        yield* Deferred.await(started);
        yield* TestClock.adjust("4 seconds");
        expect(yield* Ref.get(released)).toBe(false);
        yield* TestClock.adjust("1 second");
        expect(yield* Ref.get(released)).toBe(true);
        expect(failure(yield* Fiber.await(call))).toEqual(
          Option.some(new CalculatorOperationTimedOut())
        );
        yield* Ref.set(stalled, false);
        expect((yield* service.calculate(Request)).report).toMatchObject({
          netPay: { cents: 130_100 },
        });
      }).pipe(Effect.provide(Live), Effect.scoped)
  );

  it.effect("rejects a late synchronous result after control returns", () =>
    Effect.gen(function* () {
      const live = yield* PublicCalculatorService;
      const result = yield* live.calculate(Request);
      const service = yield* bounded(
        PublicCalculatorService.of({
          ...live,
          calculate: () => Effect.succeed(result),
        })
      );
      const clock = yield* Clock.Clock;
      const time = yield* Ref.make(0n);
      const exit = yield* Effect.exit(service.calculate(Request)).pipe(
        Effect.provideService(Clock.Clock, {
          ...clock,
          monotonicTimeNanos: Ref.modify(time, (value) => [
            value,
            5_000_000_000n,
          ]),
        })
      );
      expect(failure(exit)).toEqual(
        Option.some(new CalculatorOperationTimedOut())
      );
    }).pipe(Effect.provide(Live), Effect.scoped)
  );

  it.effect(
    "releases places after expected failure, defects and completed work",
    () =>
      Effect.gen(function* () {
        const live = yield* PublicCalculatorService;
        const original = new UnsupportedCalculatorError({
          message: "fixture",
          requestedCalculator: "fixture",
        });
        const defect = { message: "private-defect-sentinel" };
        const mode = yield* Ref.make<"error" | "defect" | "success">("error");
        const service = yield* bounded(
          PublicCalculatorService.of({
            ...live,
            calculate: (request) =>
              Ref.get(mode).pipe(
                Effect.flatMap((current) =>
                  Match.value(current).pipe(
                    Match.when("error", () => Effect.fail(original)),
                    Match.when("defect", () => Effect.die(defect)),
                    Match.when("success", () => live.calculate(request)),
                    Match.exhaustive
                  )
                )
              ),
          })
        );
        yield* Effect.forEach(Array.range(1, 9), () =>
          Effect.gen(function* () {
            yield* Ref.set(mode, "error");
            expect(
              failure(yield* Effect.exit(service.calculate(Request)))
            ).toEqual(Option.some(original));
            yield* Ref.set(mode, "defect");
            const exit = yield* Effect.exit(service.calculate(Request));
            expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(
              true
            );
            if (Exit.isFailure(exit)) {
              Cause.findDefect(exit.cause).pipe(
                Result.match({
                  onFailure: () => expect.fail("Expected the original defect"),
                  onSuccess: (actual) => expect(actual).toBe(defect),
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
      const live = yield* PublicCalculatorService;
      const active = yield* Ref.make(0);
      const held = yield* Ref.make(true);
      const started = yield* Deferred.make<boolean>();
      const service = yield* bounded(
        PublicCalculatorService.of({
          ...live,
          calculate: (request) =>
            Ref.get(held).pipe(
              Effect.flatMap((hold) =>
                hold
                  ? Ref.updateAndGet(active, (count) => count + 1).pipe(
                      Effect.flatMap((count) =>
                        count === 8
                          ? Deferred.succeed(started, true)
                          : Effect.void
                      ),
                      Effect.andThen(Effect.never),
                      Effect.ensuring(Ref.update(active, (count) => count - 1))
                    )
                  : live.calculate(request)
              )
            ),
        })
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
      const live = yield* PublicCalculatorService;
      const count = yield* Ref.make(0);
      const started = yield* Deferred.make<boolean>();
      const fixture = PublicCalculatorService.of({
        ...live,
        calculate: () =>
          Ref.updateAndGet(count, (value) => value + 1).pipe(
            Effect.flatMap((value) =>
              value === 16 ? Deferred.succeed(started, true) : Effect.void
            ),
            Effect.andThen(Effect.never),
            Effect.ensuring(Ref.update(count, (value) => value - 1))
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
      expect(yield* Ref.get(count)).toBe(16);
      expect(failure(yield* Effect.exit(first.calculate(Request)))).toEqual(
        Option.some(new CalculatorCapacityExceeded())
      );
      expect(failure(yield* Effect.exit(second.calculate(Request)))).toEqual(
        Option.some(new CalculatorCapacityExceeded())
      );
    }).pipe(Effect.provide(Live), Effect.scoped)
  );
});
