import { expect, it } from "@effect/vitest";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { CalculationEngineLive } from "@taxkit/core";
import { Money, Cents } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import {
  Predicate,
  Function as EffectFunction,
  Context,
  Deferred,
  Effect,
  Fiber,
  Layer,
  Match,
  Option,
  Ref,
  Schema,
} from "effect";

import { createPlainClient } from "../src/client.runtime.js";
import {
  TaxKitCalculationError,
  TaxKitClientDisposeError,
} from "../src/errors.js";
import {
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
} from "../src/testing/index.js";

class SdkPromiseRejectionError extends Schema.TaggedError<
  SdkPromiseRejectionError,
  {
    readonly brand: unique symbol;
  }
>()("SdkPromiseRejectionError", {
  rejection: Schema.Defect(),
}) {}
const ServiceLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);
const facts = {
  grossPay: new GrossPay({
    amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};
const sentinel = "taxkit-private-secret:/private/sdk-lifetime/input.json";
class LifetimeFixture extends Context.Service<
  LifetimeFixture,
  {
    readonly mode:
      | "normal"
      | "operationBlocked"
      | "startupBlocked"
      | "startupDefect"
      | "operationDefect"
      | "finalizerBlocked"
      | "finalizerDefect";
    readonly release: Deferred.Deferred<boolean>;
    readonly resources: Ref.Ref<number>;
    readonly started: Deferred.Deferred<boolean>;
  }
>()("@taxkit/sdk/test/LifetimeFixture") {}
// A calculator-service fixture owns real scoped acquisition and release. Each
// failure is placed at its actual lifecycle step, with deterministic signals.
const FixtureLayer = Layer.effect(
  PublicCalculatorService,
  Effect.gen(function* () {
    const { mode, release, resources, started } = yield* LifetimeFixture;
    yield* Effect.acquireRelease(
      Ref.update(resources, (value) => value + 1),
      () =>
        Match.value(mode)
          .pipe(
            Match.when("finalizerBlocked", () =>
              Deferred.succeed(started, true).pipe(
                Effect.andThen(Deferred.await(release))
              )
            ),
            Match.when("finalizerDefect", () =>
              Effect.die(new Error(sentinel))
            ),
            Match.orElse(() => Effect.void)
          )
          .pipe(Effect.ensuring(Ref.update(resources, (value) => value - 1)))
    );
    yield* Match.value(mode).pipe(
      Match.when("startupBlocked", () =>
        Deferred.succeed(started, true).pipe(Effect.andThen(Effect.never))
      ),
      Match.when("startupDefect", () => Effect.die(new Error(sentinel))),
      Match.orElse(() => Effect.void)
    );
    const service = yield* PublicCalculatorService;
    return {
      ...service,
      calculate: Effect.fn("SdkFixture.calculate")((request) =>
        Match.value(mode).pipe(
          Match.when("operationBlocked", () =>
            Deferred.succeed(started, true).pipe(Effect.andThen(Effect.never))
          ),
          Match.when("operationDefect", () => Effect.die(new Error(sentinel))),
          Match.orElse(() => service.calculate(request))
        )
      ),
    };
  })
).pipe(Layer.provide(ServiceLive));
it.effect("closes an unused client without starting its Layer", () =>
  Effect.gen(function* () {
    const resources = yield* Ref.make(0);
    const started = yield* Deferred.make<boolean>();
    const release = yield* Deferred.make<boolean>();
    const layer = FixtureLayer.pipe(
      Layer.provide(
        Layer.succeed(LifetimeFixture)({
          mode: "normal",
          release,
          resources,
          started,
        })
      )
    );
    const client = createPlainClient(layer, AuPay2025_26Module);
    yield* Effect.promise(() => client.dispose());
    yield* Effect.promise(() => client.dispose());
    expect(yield* Ref.get(resources)).toBe(0);
    const result = yield* Effect.promise(() =>
      client.calculations.safe.calculate(AuPayTakeHomeCalculation, facts)
    );
    yield* Match.value(result).pipe(
      Match.tag("TaxKitFailure", ({ error }) =>
        Effect.sync(() => {
          expect({
            isDisposed: Predicate.isTagged(
              error.error,
              "TaxKitClientDisposedError"
            ),
            errorErrorMessage: error.error.message,
          }).toStrictEqual({
            isDisposed: true,
            errorErrorMessage: "TaxKit client is closed",
          });
        })
      ),
      Match.tag("TaxKitSuccess", () =>
        Effect.sync(() => expect.fail("Closed client succeeded"))
      ),
      Match.exhaustive
    );
    expect(yield* Ref.get(resources)).toBe(0);
  })
);
it.effect("keeps separate client lifetimes even with the same Layer", () =>
  Effect.gen(function* () {
    const resources = yield* Ref.make(0);
    const started = yield* Deferred.make<boolean>();
    const release = yield* Deferred.make<boolean>();
    const layer = FixtureLayer.pipe(
      Layer.provide(
        Layer.succeed(LifetimeFixture)({
          mode: "normal",
          release,
          resources,
          started,
        })
      )
    );
    const first = createPlainClient(layer, AuPay2025_26Module);
    const second = createPlainClient(layer, AuPay2025_26Module);
    const reports = yield* Effect.all(
      [
        Effect.promise(() =>
          first.calculations.calculate(AuPayTakeHomeCalculation, facts)
        ),
        Effect.promise(() =>
          second.calculations.calculate(AuPayTakeHomeCalculation, facts)
        ),
      ],
      { concurrency: "unbounded" }
    );
    expect({
      reportCount: reports.length,
      RefGetResources: yield* Ref.get(resources),
    }).toStrictEqual({
      reportCount: 2,
      RefGetResources: 2,
    });
    yield* Effect.promise(() => first.dispose());
    expect(yield* Ref.get(resources)).toBe(1);
    const report = yield* Effect.promise(() =>
      second.calculations.calculate(AuPayTakeHomeCalculation, facts)
    );
    expect(report.netPay.cents).toBe(130_100);
    yield* Effect.promise(() => first.dispose());
    expect(yield* Ref.get(resources)).toBe(1);
    yield* Effect.promise(() => second.dispose());
    expect(yield* Ref.get(resources)).toBe(0);
  })
);
it.effect.each(["operationBlocked", "startupBlocked"] as const)(
  "closes safe work during %s",
  (mode) =>
    Effect.gen(function* () {
      const resources = yield* Ref.make(0);
      const started = yield* Deferred.make<boolean>();
      const release = yield* Deferred.make<boolean>();
      const layer = FixtureLayer.pipe(
        Layer.provide(
          Layer.succeed(LifetimeFixture)({
            mode,
            release,
            resources,
            started,
          })
        )
      );
      const client = createPlainClient(layer, AuPay2025_26Module);
      const pending = yield* Effect.promise(() =>
        client.calculations.safe.calculate(AuPayTakeHomeCalculation, facts)
      ).pipe(Effect.forkChild);
      yield* Deferred.await(started);
      yield* Effect.promise(() => client.dispose());
      const result = yield* Fiber.join(pending);
      yield* Match.value(result).pipe(
        Match.tag("TaxKitFailure", ({ error }) =>
          Effect.gen(function* () {
            EffectFunction.pipe(
              Predicate.isTagged(error.error, "TaxKitClientDisposedError"),
              (matches) => {
                expect(matches).toBeTruthy();
              }
            );
            const text = yield* Schema.encodeEffect(
              Schema.toCodecJson(TaxKitCalculationError)
            )(error);
            expect(text).not.toContain(sentinel);
            expect(text).not.toContain("interrupted");
          })
        ),
        Match.tag("TaxKitSuccess", () =>
          Effect.sync(() => expect.fail("Interrupted calculation succeeded"))
        ),
        Match.exhaustive
      );
      expect(yield* Ref.get(resources)).toBe(0);
    })
);
it.effect.each(["operationBlocked", "startupBlocked"] as const)(
  "rejects normal work safely during %s",
  (mode) =>
    Effect.gen(function* () {
      const resources = yield* Ref.make(0);
      const started = yield* Deferred.make<boolean>();
      const release = yield* Deferred.make<boolean>();
      const layer = FixtureLayer.pipe(
        Layer.provide(
          Layer.succeed(LifetimeFixture)({
            mode,
            release,
            resources,
            started,
          })
        )
      );
      const client = createPlainClient(layer, AuPay2025_26Module);
      const pending = yield* Effect.tryPromise({
        catch: (rejection) => new SdkPromiseRejectionError({ rejection }),
        try: () =>
          client.calculations.calculate(AuPayTakeHomeCalculation, facts),
      }).pipe(
        Effect.flip,
        Effect.flatMap((failure) =>
          Schema.decodeUnknownEffect(TaxKitCalculationError)(failure.rejection)
        ),
        Effect.forkChild
      );
      yield* Deferred.await(started);
      yield* Effect.promise(() => client.dispose());
      const error = yield* Fiber.join(pending);
      expect({
        isDisposed: Predicate.isTagged(
          error.error,
          "TaxKitClientDisposedError"
        ),
        RefGetResources: yield* Ref.get(resources),
      }).toStrictEqual({
        isDisposed: true,
        RefGetResources: 0,
      });
    })
);
it.effect.each(["startupDefect", "operationDefect"] as const)(
  "contains private defects during %s",
  (mode) =>
    Effect.gen(function* () {
      const resources = yield* Ref.make(0);
      const started = yield* Deferred.make<boolean>();
      const release = yield* Deferred.make<boolean>();
      const layer = FixtureLayer.pipe(
        Layer.provide(
          Layer.succeed(LifetimeFixture)({
            mode,
            release,
            resources,
            started,
          })
        )
      );
      const client = createPlainClient(layer, AuPay2025_26Module);
      const result = yield* Effect.promise(() =>
        client.calculations.safe.calculate(AuPayTakeHomeCalculation, facts)
      );
      yield* Match.value(result).pipe(
        Match.tag("TaxKitFailure", ({ error }) =>
          Effect.gen(function* () {
            EffectFunction.pipe(
              Predicate.isTagged(error.error, "TaxKitUnexpectedError"),
              (matches) => {
                expect(matches).toBeTruthy();
              }
            );
            const text = yield* Schema.encodeEffect(
              Schema.toCodecJson(TaxKitCalculationError)
            )(error);
            expect(text).not.toContain(sentinel);
          })
        ),
        Match.tag("TaxKitSuccess", () =>
          Effect.sync(() => expect.fail("Defective calculation succeeded"))
        ),
        Match.exhaustive
      );
      yield* Effect.promise(() => client.dispose());
      expect(yield* Ref.get(resources)).toBe(0);
    })
);
it.effect("all overlapping dispose calls await the same finalisers", () =>
  Effect.gen(function* () {
    const resources = yield* Ref.make(0);
    const started = yield* Deferred.make<boolean>();
    const release = yield* Deferred.make<boolean>();
    const layer = FixtureLayer.pipe(
      Layer.provide(
        Layer.succeed(LifetimeFixture)({
          mode: "finalizerBlocked",
          release,
          resources,
          started,
        })
      )
    );
    const client = createPlainClient(layer, AuPay2025_26Module);
    yield* Effect.promise(() =>
      client.calculations.calculate(AuPayTakeHomeCalculation, facts)
    );
    const first = yield* Effect.promise(() => client.dispose()).pipe(
      Effect.forkChild
    );
    yield* Deferred.await(started);
    const second = yield* Effect.promise(() => client.dispose()).pipe(
      Effect.forkChild
    );
    yield* Effect.yieldNow;
    EffectFunction.pipe(
      Option.isNone(Option.fromUndefinedOr(first.pollUnsafe())),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
    EffectFunction.pipe(
      Option.isNone(Option.fromUndefinedOr(second.pollUnsafe())),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
    expect(yield* Ref.get(resources)).toBe(1);
    yield* Deferred.succeed(release, true);
    yield* Fiber.join(first);
    yield* Fiber.join(second);
    expect(yield* Ref.get(resources)).toBe(0);
  })
);
it.effect(
  "replays a safe disposal failure without private finaliser details",
  () =>
    Effect.gen(function* () {
      const resources = yield* Ref.make(0);
      const started = yield* Deferred.make<boolean>();
      const release = yield* Deferred.make<boolean>();
      const layer = FixtureLayer.pipe(
        Layer.provide(
          Layer.succeed(LifetimeFixture)({
            mode: "finalizerDefect",
            release,
            resources,
            started,
          })
        )
      );
      const client = createPlainClient(layer, AuPay2025_26Module);
      yield* Effect.promise(() =>
        client.calculations.calculate(AuPayTakeHomeCalculation, facts)
      );
      const first = yield* Effect.tryPromise({
        catch: (rejection) => new SdkPromiseRejectionError({ rejection }),
        try: () => client.dispose(),
      }).pipe(
        Effect.flip,
        Effect.flatMap((failure) =>
          Schema.decodeUnknownEffect(TaxKitClientDisposeError)(
            failure.rejection
          )
        )
      );
      const second = yield* Effect.tryPromise({
        catch: (rejection) => new SdkPromiseRejectionError({ rejection }),
        try: () => client.dispose(),
      }).pipe(
        Effect.flip,
        Effect.flatMap((failure) =>
          Schema.decodeUnknownEffect(TaxKitClientDisposeError)(
            failure.rejection
          )
        )
      );
      expect({
        second,
        firstMessage: first.message,
      }).toStrictEqual({
        second: first,
        firstMessage: "TaxKit client could not be closed",
      });
      expect(
        yield* Schema.encodeEffect(
          Schema.toCodecJson(TaxKitClientDisposeError)
        )(first)
      ).not.toContain(sentinel);
      expect(yield* Ref.get(resources)).toBe(0);
    })
);
