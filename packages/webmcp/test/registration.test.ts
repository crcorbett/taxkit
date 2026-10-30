import { expect, it } from "@effect/vitest";
import { CalculatorToolFailure } from "@taxkit/calculators/page-schemas";
import { CalculatorPageToolkit } from "@taxkit/calculators/page-tools";
import { DocsWebsiteOrigin } from "@taxkit/content/schemas";
import {
  Schedule,
  Match,
  Function as EffectFunction,
  Array,
  Deferred,
  Effect,
  Fiber,
  FiberSet,
  Layer,
  Option,
  Predicate,
  Result,
  Schema,
} from "effect";
import { TestClock } from "effect/testing";
import { vi } from "vitest";
import type { WebMCP } from "webmcp-types";

import { ModelContextHostLive } from "../src/model-context.adapter.layer.js";
import { registerCalculatorPageTools } from "../src/registration.egress.js";
import { WebMcpSite } from "../src/service.js";

const websiteOrigin = DocsWebsiteOrigin.make(
  new URL("https://website.example.com")
);
// The live host adapter for this test page's origin.
const HostLive = ModelContextHostLive.pipe(
  Layer.provide(Layer.succeed(WebMcpSite)({ origin: websiteOrigin }))
);
const registerTools = (toolkit: Effect.Success<typeof CalculatorPageToolkit>) =>
  registerCalculatorPageTools(toolkit).pipe(Effect.provide(HostLive));
const unavailable = new CalculatorToolFailure({
  code: "service-unavailable",
  retry: "try-again-manually",
});
const ControlledHandlers = CalculatorPageToolkit.toLayer({
  taxkit_calculate_visible_form: () => Effect.fail(unavailable),
  taxkit_fill_calculator: () => Effect.fail(unavailable),
  taxkit_find_calculators: () => Effect.fail(unavailable),
  taxkit_read_calculator: () => Effect.fail(unavailable),
  taxkit_read_result: () => Effect.fail(unavailable),
});
it.effect.each(["absent", "unsupported", "other-origin"] as const)(
  "does not register in an $0 host",
  (mode) =>
    Effect.gen(function* () {
      const register = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockResolvedValue();
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          vi.stubGlobal(
            "document",
            Match.value(mode).pipe(
              Match.when("absent", EffectFunction.constUndefined),
              Match.orElse((matchedValue) => ({
                modelContext: Match.value(matchedValue).pipe(
                  Match.when("unsupported", () => ({})),
                  Match.orElse(() => ({ registerTool: register }))
                ),
              }))
            )
          );
          vi.stubGlobal(
            "location",
            new URL(
              Match.value(mode).pipe(
                Match.when(
                  "other-origin",
                  (): "https://other.example.com" => "https://other.example.com"
                ),
                Match.orElse(() => websiteOrigin.href)
              )
            )
          );
        }),
        () => Effect.sync(() => vi.unstubAllGlobals())
      );
      const toolkit = yield* CalculatorPageToolkit.pipe(
        Effect.provide(ControlledHandlers)
      );
      yield* registerTools(toolkit);
      expect(register).not.toHaveBeenCalled();
    }).pipe(Effect.scoped)
);
it.effect(
  "bounds a stalled registration without holding up independent tools",
  () =>
    Effect.gen(function* () {
      const ready = yield* Deferred.make<true>();
      // This test scope owns the controlled host's pending callback, including
      // a host that finishes late after our registration deadline.
      const hostRun = yield* FiberSet.makeRuntimePromise();
      const registration = Deferred.await(ready).pipe(Effect.asVoid, hostRun);
      const register = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockReturnValueOnce(registration)
        .mockResolvedValue();
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          vi.stubGlobal("document", {
            modelContext: { registerTool: register },
          });
          vi.stubGlobal("location", new URL(websiteOrigin.href));
        }),
        () => Effect.sync(() => vi.unstubAllGlobals())
      );
      const toolkit = yield* CalculatorPageToolkit.pipe(
        Effect.provide(ControlledHandlers)
      );
      const registrations = yield* registerTools(toolkit).pipe(
        Effect.forkChild
      );
      yield* Effect.sync(() => register.mock.calls.length).pipe(
        Effect.repeat({
          until: (observed) => observed === 5,
          schedule: Schedule.spaced("50 millis"),
        }),
        Effect.timeout(1000),
        TestClock.withLive,
        Effect.tap((observed) =>
          Effect.sync(() => {
            expect(observed).toBe(5);
          })
        )
      );
      yield* TestClock.adjust("2 seconds");
      yield* Fiber.join(registrations);
      const stalled = yield* Array.head(register.mock.calls).pipe(
        Effect.fromOption,
        Effect.map(([, options]) => Option.fromNullishOr(options?.signal)),
        Effect.flatMap(Effect.fromOption)
      );
      expect(stalled.aborted).toBeTruthy();
      yield* Deferred.succeed(ready, true);
      expect(register).toHaveBeenCalledTimes(5);
      expect(stalled.aborted).toBeTruthy();
    }).pipe(Effect.scoped)
);
it.effect(
  "preserves the host receiver, attempts independent tools and returns only safe failures",
  () =>
    Effect.gen(function* () {
      // A controlled host exercises our adapter policy. Actual browser contract
      // and caller proof belong to native-browser-tools.boundary.test.ts.
      const register = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockRejectedValueOnce(new DOMException("PRIVATE9", "SecurityError"))
        .mockResolvedValue();
      const host = { registerTool: register };
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          vi.stubGlobal("document", { modelContext: host });
          vi.stubGlobal("location", new URL(websiteOrigin.href));
        }),
        () => Effect.sync(() => vi.unstubAllGlobals())
      );
      const started = vi.fn<(...args: readonly unknown[]) => void>();
      const cancelled = vi.fn<(...args: readonly unknown[]) => void>();
      const signals = yield* Effect.scoped(
        Effect.gen(function* () {
          const handlers = yield* CalculatorPageToolkit.toHandlers({
            taxkit_calculate_visible_form: () =>
              Effect.sync(started).pipe(
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() => Effect.sync(cancelled))
              ),
            taxkit_fill_calculator: () => Effect.fail(unavailable),
            taxkit_find_calculators: () => Effect.fail(unavailable),
            taxkit_read_calculator: () => Effect.fail(unavailable),
            taxkit_read_result: () => Effect.die("PRIVATE9"),
          });
          const toolkit = yield* CalculatorPageToolkit.pipe(
            Effect.provide(handlers)
          );
          yield* registerTools(toolkit);
          expect(register).toHaveBeenCalledTimes(5);
          EffectFunction.pipe(
            EffectFunction.pipe(
              register.mock.contexts,
              Array.every((receiver) => receiver === host)
            ),
            (actual) => {
              expect(actual).toBeTruthy();
            }
          );
          const read = yield* EffectFunction.pipe(
            register.mock.calls,
            Array.findFirst(([tool]) => tool.name === "taxkit_read_calculator")
          ).pipe(
            Effect.fromOption,
            Effect.map(([tool]) => tool)
          );
          const result = yield* EffectFunction.pipe(
            register.mock.calls,
            Array.findFirst(([tool]) => tool.name === "taxkit_read_result")
          ).pipe(
            Effect.fromOption,
            Effect.map(([tool]) => tool)
          );
          const calculate = yield* EffectFunction.pipe(
            register.mock.calls,
            Array.findFirst(
              ([tool]) => tool.name === "taxkit_calculate_visible_form"
            )
          ).pipe(
            Effect.fromOption,
            Effect.map(([tool]) => tool)
          );
          const { signal } = new AbortController();
          const invalid = yield* Effect.promise(() => {
            const response = read.execute({ extra: "PRIVATE9" }, { signal });
            if (!Predicate.isPromise(response)) {
              return expect.fail(
                "The native tool callback must return a Promise"
              );
            }
            return response;
          }).pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.toCodecJson(CalculatorToolFailure)
              )
            )
          );
          expect(invalid.code).toBe("invalid-input");
          const declared = yield* Effect.promise(() => {
            const response = read.execute({}, { signal });
            if (!Predicate.isPromise(response)) {
              return expect.fail(
                "The native tool callback must return a Promise"
              );
            }
            return response;
          }).pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.toCodecJson(CalculatorToolFailure)
              )
            )
          );
          expect(declared).toStrictEqual(unavailable);
          const unexpected = yield* Effect.promise(() => {
            const response = result.execute({}, { signal });
            if (!Predicate.isPromise(response)) {
              return expect.fail(
                "The native tool callback must return a Promise"
              );
            }
            return response;
          }).pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.toCodecJson(CalculatorToolFailure)
              )
            )
          );
          expect(unexpected).toStrictEqual(unavailable);
          const controller = new AbortController();
          const pending = yield* Effect.tryPromise({
            catch: () => unavailable,
            try: () => {
              const response = calculate.execute(
                {},
                { signal: controller.signal }
              );
              if (!Predicate.isPromise(response)) {
                return expect.fail(
                  "The native tool callback must return a Promise"
                );
              }
              return response;
            },
          }).pipe(Effect.result, Effect.forkScoped);
          yield* Effect.sync(() => started.mock.calls.length).pipe(
            Effect.repeat({
              until: (observed) => observed === 1,
              schedule: Schedule.spaced("50 millis"),
            }),
            Effect.timeout(1000),
            TestClock.withLive,
            Effect.tap((observed) =>
              Effect.sync(() => {
                expect(observed).toBe(1);
              })
            )
          );
          controller.abort();
          const outcome = yield* Fiber.join(pending);
          EffectFunction.pipe(Result.isFailure(outcome), (actual) => {
            expect(actual).toBeTruthy();
          });
          expect(cancelled).toHaveBeenCalledOnce();
          const current = EffectFunction.pipe(
            register.mock.calls,
            Array.map(([, options]) => Option.fromNullishOr(options?.signal))
          );
          EffectFunction.pipe(
            EffectFunction.pipe(
              current,
              Array.every((value) =>
                value.pipe(Option.exists((entry) => !entry.aborted))
              )
            ),
            (actual) => {
              expect(actual).toBeTruthy();
            }
          );
          return current;
        })
      );
      EffectFunction.pipe(
        EffectFunction.pipe(
          signals,
          Array.every((value) =>
            value.pipe(Option.exists((entry) => entry.aborted))
          )
        ),
        (actual) => {
          expect(actual).toBeTruthy();
        }
      );
    }).pipe(Effect.scoped)
);
