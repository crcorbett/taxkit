import { expect, it } from "@effect/vitest";
import {
  Predicate,
  Function as EffectFunction,
  Deferred,
  Effect,
  Fiber,
  Match,
  Option,
  Ref,
  Result,
  Schema,
} from "effect";

import { AuPayTakeHomeCalculation } from "../src/au.js";
import { createPlainClient } from "../src/client.runtime.js";
import { TaxKitError } from "../src/errors.js";
import { takeHomeFacts } from "./fixtures.js";

class SdkPromiseRejectionError extends Schema.TaggedError<
  SdkPromiseRejectionError,
  {
    readonly brand: unique symbol;
  }
>()("SdkPromiseRejectionError", {
  rejection: Schema.Defect(),
}) {}
const facts = takeHomeFacts;
const sentinel = "taxkit-private-secret:/private/sdk-lifetime/input.json";
interface LifetimeFixture {
  readonly mode:
    | "normal"
    | "operationBlocked"
    | "operationDefect"
    | "finalizerBlocked";
  readonly release: Deferred.Deferred<boolean>;
  readonly resources: Ref.Ref<number>;
  readonly started: Deferred.Deferred<boolean>;
}
// The real definition with one calculation step that owns real scoped
// acquisition and release. Each failure is placed at its lifecycle step, with
// deterministic signals.
const lifetimeCalculation = ({
  mode,
  release,
  resources,
  started,
}: LifetimeFixture) => ({
  ...AuPayTakeHomeCalculation,
  calculate: (input: typeof AuPayTakeHomeCalculation.inputSchema.Type) =>
    Effect.acquireRelease(
      Ref.update(resources, (value) => value + 1),
      () =>
        Match.value(mode)
          .pipe(
            Match.when("finalizerBlocked", () => Deferred.await(release)),
            Match.orElse(() => Effect.void)
          )
          .pipe(Effect.ensuring(Ref.update(resources, (value) => value - 1)))
    ).pipe(
      Effect.andThen(
        Match.value(mode).pipe(
          Match.when("operationBlocked", () =>
            Deferred.succeed(started, true).pipe(Effect.andThen(Effect.never))
          ),
          Match.when("finalizerBlocked", () =>
            Deferred.succeed(started, true).pipe(Effect.andThen(Effect.never))
          ),
          Match.when("operationDefect", () => Effect.die(new Error(sentinel))),
          Match.orElse(() => AuPayTakeHomeCalculation.calculate(input))
        )
      ),
      Effect.scoped
    ),
});
const makeFixture = Effect.fnUntraced(function* ({
  mode,
}: Pick<LifetimeFixture, "mode">) {
  return {
    mode,
    release: yield* Deferred.make<boolean>(),
    resources: yield* Ref.make(0),
    started: yield* Deferred.make<boolean>(),
  } satisfies LifetimeFixture;
});
it.effect("closes an unused client and refuses later work", () =>
  Effect.gen(function* () {
    const client = createPlainClient();
    yield* Effect.promise(() => client.dispose());
    yield* Effect.promise(() => client.dispose());
    const result = yield* Effect.promise(() =>
      client.calculateSafe(AuPayTakeHomeCalculation, facts)
    );
    yield* Match.value(result).pipe(
      Match.tag("Failure", ({ failure: error }) =>
        Effect.sync(() => {
          expect({
            isDisposed: Predicate.isTagged(error, "TaxKitClientDisposedError"),
            errorErrorMessage: error.message,
          }).toStrictEqual({
            isDisposed: true,
            errorErrorMessage: "TaxKit client is closed",
          });
        })
      ),
      Match.tag("Success", () =>
        Effect.sync(() => expect.fail("Closed client succeeded"))
      ),
      Match.exhaustive
    );
  })
);
it.effect("keeps separate client lifetimes", () =>
  Effect.gen(function* () {
    const first = createPlainClient();
    const second = createPlainClient();
    const reports = yield* Effect.all(
      [
        Effect.promise(() => first.calculate(AuPayTakeHomeCalculation, facts)),
        Effect.promise(() => second.calculate(AuPayTakeHomeCalculation, facts)),
      ],
      { concurrency: "unbounded" }
    );
    expect(reports).toHaveLength(2);
    yield* Effect.promise(() => first.dispose());
    const report = yield* Effect.promise(() =>
      second.calculate(AuPayTakeHomeCalculation, facts)
    );
    expect(report.netPay.cents).toBe(130_100);
    const closed = yield* Effect.promise(() =>
      first.calculateSafe(AuPayTakeHomeCalculation, facts)
    );
    expect(
      Result.isFailure(closed) &&
        Predicate.isTagged(closed.failure, "TaxKitClientDisposedError")
    ).toBeTruthy();
    yield* Effect.promise(() => second.dispose());
  })
);
it.effect("closes safe work during a blocked calculation", () =>
  Effect.gen(function* () {
    const fixture = yield* makeFixture({ mode: "operationBlocked" });
    const client = createPlainClient();
    const pending = yield* Effect.promise(() =>
      client.calculateSafe(lifetimeCalculation(fixture), facts)
    ).pipe(Effect.forkChild);
    yield* Deferred.await(fixture.started);
    yield* Effect.promise(() => client.dispose());
    const result = yield* Fiber.join(pending);
    yield* Match.value(result).pipe(
      Match.tag("Failure", ({ failure: error }) =>
        Effect.gen(function* () {
          EffectFunction.pipe(
            Predicate.isTagged(error, "TaxKitClientDisposedError"),
            (matches) => {
              expect(matches).toBeTruthy();
            }
          );
          const text = yield* Schema.encodeEffect(
            Schema.toCodecJson(TaxKitError)
          )(error);
          expect(text).not.toContain(sentinel);
          expect(text).not.toContain("interrupted");
        })
      ),
      Match.tag("Success", () =>
        Effect.sync(() => expect.fail("Interrupted calculation succeeded"))
      ),
      Match.exhaustive
    );
    expect(yield* Ref.get(fixture.resources)).toBe(0);
  })
);
it.effect("rejects normal work safely during a blocked calculation", () =>
  Effect.gen(function* () {
    const fixture = yield* makeFixture({ mode: "operationBlocked" });
    const client = createPlainClient();
    const pending = yield* Effect.tryPromise({
      catch: (rejection) => new SdkPromiseRejectionError({ rejection }),
      try: () => client.calculate(lifetimeCalculation(fixture), facts),
    }).pipe(
      Effect.flip,
      Effect.flatMap((failure) =>
        Schema.decodeUnknownEffect(TaxKitError)(failure.rejection)
      ),
      Effect.forkChild
    );
    yield* Deferred.await(fixture.started);
    yield* Effect.promise(() => client.dispose());
    const error = yield* Fiber.join(pending);
    expect({
      isDisposed: Predicate.isTagged(error, "TaxKitClientDisposedError"),
      RefGetResources: yield* Ref.get(fixture.resources),
    }).toStrictEqual({
      isDisposed: true,
      RefGetResources: 0,
    });
  })
);
it.effect("contains a private calculation defect", () =>
  Effect.gen(function* () {
    const fixture = yield* makeFixture({ mode: "operationDefect" });
    const client = createPlainClient();
    const result = yield* Effect.promise(() =>
      client.calculateSafe(lifetimeCalculation(fixture), facts)
    );
    yield* Match.value(result).pipe(
      Match.tag("Failure", ({ failure: error }) =>
        Effect.gen(function* () {
          EffectFunction.pipe(
            Predicate.isTagged(error, "TaxKitUnexpectedError"),
            (matches) => {
              expect(matches).toBeTruthy();
            }
          );
          const text = yield* Schema.encodeEffect(
            Schema.toCodecJson(TaxKitError)
          )(error);
          expect(text).not.toContain(sentinel);
        })
      ),
      Match.tag("Success", () =>
        Effect.sync(() => expect.fail("Defective calculation succeeded"))
      ),
      Match.exhaustive
    );
    yield* Effect.promise(() => client.dispose());
    expect(yield* Ref.get(fixture.resources)).toBe(0);
  })
);
it.effect("all overlapping dispose calls await the same finalisers", () =>
  Effect.gen(function* () {
    const fixture = yield* makeFixture({ mode: "finalizerBlocked" });
    const client = createPlainClient();
    const pending = yield* Effect.promise(() =>
      client.calculateSafe(lifetimeCalculation(fixture), facts)
    ).pipe(Effect.forkChild);
    yield* Deferred.await(fixture.started);
    const first = yield* Effect.promise(() => client.dispose()).pipe(
      Effect.forkChild
    );
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
    expect(yield* Ref.get(fixture.resources)).toBe(1);
    yield* Deferred.succeed(fixture.release, true);
    yield* Fiber.join(first);
    yield* Fiber.join(second);
    yield* Fiber.join(pending);
    expect(yield* Ref.get(fixture.resources)).toBe(0);
  })
);
