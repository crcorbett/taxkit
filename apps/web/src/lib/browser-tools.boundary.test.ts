import { expect, it } from "@effect/vitest";
import { DocsWebsiteOrigin } from "@taxkit/content/schemas";
import {
  Array,
  Deferred,
  Effect,
  Fiber,
  FiberSet,
  Option,
  Predicate,
  Result,
  Schema,
} from "effect";
import { TestClock } from "effect/testing";
import { vi } from "vitest";
import type { WebMCP } from "webmcp-types";

import { registerWebsiteBrowserTools } from "./browser-tools.boundary";
import { WebsiteBrowserToolFailure } from "./browser-tools.schemas";
import { WebsiteBrowserToolkit } from "./browser-tools.toolkit";

const CallbackPromise = Schema.declare<Promise<unknown>>(Predicate.isPromise);

const websiteOrigin = DocsWebsiteOrigin.make(
  new URL("https://website.example.com")
);
const unavailable = new WebsiteBrowserToolFailure({
  code: "service-unavailable",
  retry: "try-again-manually",
});
const ControlledHandlers = WebsiteBrowserToolkit.toLayer({
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
            mode === "absent"
              ? undefined
              : {
                  modelContext:
                    mode === "unsupported" ? {} : { registerTool: register },
                }
          );
          vi.stubGlobal(
            "location",
            new URL(
              mode === "other-origin"
                ? "https://other.example.com"
                : websiteOrigin.href
            )
          );
        }),
        () => Effect.sync(() => vi.unstubAllGlobals())
      );
      const toolkit = yield* WebsiteBrowserToolkit.pipe(
        Effect.provide(ControlledHandlers)
      );
      yield* registerWebsiteBrowserTools(toolkit, websiteOrigin);
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
      const register = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockImplementationOnce(() =>
          hostRun(Deferred.await(ready).pipe(Effect.asVoid))
        )
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
      const toolkit = yield* WebsiteBrowserToolkit.pipe(
        Effect.provide(ControlledHandlers)
      );
      const registrations = yield* registerWebsiteBrowserTools(
        toolkit,
        websiteOrigin
      ).pipe(Effect.forkChild);
      yield* Effect.promise(() =>
        expect.poll(() => register.mock.calls.length).toBe(5)
      );
      yield* TestClock.adjust("2 seconds");
      yield* Fiber.join(registrations);
      const stalled = yield* Array.head(register.mock.calls).pipe(
        Effect.fromOption,
        Effect.map(([, options]) => Option.fromNullishOr(options?.signal)),
        Effect.flatMap(Effect.fromOption)
      );
      expect(stalled.aborted).toBe(true);
      yield* Deferred.succeed(ready, true);
      expect(register).toHaveBeenCalledTimes(5);
      expect(stalled.aborted).toBe(true);
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
      const started = vi.fn();
      const cancelled = vi.fn();
      const signals = yield* Effect.scoped(
        Effect.gen(function* () {
          const handlers = yield* WebsiteBrowserToolkit.toHandlers({
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
          const toolkit = yield* WebsiteBrowserToolkit.pipe(
            Effect.provide(handlers)
          );
          yield* registerWebsiteBrowserTools(toolkit, websiteOrigin);
          expect(register).toHaveBeenCalledTimes(5);
          expect(
            Array.every(register.mock.contexts, (receiver) => receiver === host)
          ).toBe(true);
          const read = yield* Array.findFirst(
            register.mock.calls,
            ([tool]) => tool.name === "taxkit_read_calculator"
          ).pipe(
            Effect.fromOption,
            Effect.map(([tool]) => tool)
          );
          const result = yield* Array.findFirst(
            register.mock.calls,
            ([tool]) => tool.name === "taxkit_read_result"
          ).pipe(
            Effect.fromOption,
            Effect.map(([tool]) => tool)
          );
          const calculate = yield* Array.findFirst(
            register.mock.calls,
            ([tool]) => tool.name === "taxkit_calculate_visible_form"
          ).pipe(
            Effect.fromOption,
            Effect.map(([tool]) => tool)
          );
          const { signal } = new AbortController();
          const invalidPromise = yield* Schema.decodeUnknownEffect(
            CallbackPromise
          )(read.execute({ extra: "PRIVATE9" }, { signal }));
          const invalid = yield* Effect.promise(() => invalidPromise).pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.toCodecJson(WebsiteBrowserToolFailure)
              )
            )
          );
          expect(invalid.code).toBe("invalid-input");
          const declaredPromise = yield* Schema.decodeUnknownEffect(
            CallbackPromise
          )(read.execute({}, { signal }));
          const declared = yield* Effect.promise(() => declaredPromise).pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.toCodecJson(WebsiteBrowserToolFailure)
              )
            )
          );
          expect(declared).toEqual(unavailable);
          const unexpectedPromise = yield* Schema.decodeUnknownEffect(
            CallbackPromise
          )(result.execute({}, { signal }));
          const unexpected = yield* Effect.promise(
            () => unexpectedPromise
          ).pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.toCodecJson(WebsiteBrowserToolFailure)
              )
            )
          );
          expect(unexpected).toEqual(unavailable);
          const controller = new AbortController();
          const pending = yield* Schema.decodeUnknownEffect(CallbackPromise)(
            calculate.execute({}, { signal: controller.signal })
          );
          yield* Effect.promise(() =>
            expect.poll(() => started.mock.calls.length).toBe(1)
          );
          controller.abort();
          const outcome = yield* Effect.tryPromise({
            catch: () => unavailable,
            try: () => pending,
          }).pipe(Effect.result);
          expect(Result.isFailure(outcome)).toBe(true);
          expect(cancelled).toHaveBeenCalledTimes(1);
          const current = Array.map(register.mock.calls, ([, options]) =>
            Option.fromNullishOr(options?.signal)
          );
          expect(
            Array.every(current, (value) =>
              value.pipe(Option.exists((entry) => !entry.aborted))
            )
          ).toBe(true);
          return current;
        })
      );
      expect(
        Array.every(signals, (value) =>
          value.pipe(Option.exists((entry) => entry.aborted))
        )
      ).toBe(true);
    }).pipe(Effect.scoped)
);
