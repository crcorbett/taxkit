import { describe, expect, it } from "@effect/vitest";
import { Deferred, Effect, Exit, Fiber, Option, Ref, Result } from "effect";

import { withMcpRequestCancellation } from "../src/cancellation.boundary.js";
import { McpRequestAbortSignal } from "../src/request.service.js";

describe("MCP request cancellation", () => {
  it.effect("refuses work without the private request capability", () =>
    Effect.gen(function* () {
      const entered = yield* Ref.make(false);
      const result = yield* Ref.set(entered, true).pipe(
        withMcpRequestCancellation,
        Effect.result
      );
      expect(
        Result.getFailure(result).pipe(Option.map((error) => error.code))
      ).toEqual(Option.some("service-unavailable"));
      expect(yield* Ref.get(entered)).toBe(false);
    })
  );

  it.effect(
    "interrupts before starting a request that already disconnected",
    () =>
      Effect.gen(function* () {
        const controller = yield* Effect.sync(() => new AbortController());
        yield* Effect.sync(() => controller.abort());
        const entered = yield* Ref.make(false);
        const exit = yield* Ref.set(entered, true).pipe(
          withMcpRequestCancellation,
          Effect.provideService(
            McpRequestAbortSignal,
            Option.some(controller.signal)
          ),
          Effect.exit
        );
        expect(Exit.hasInterrupts(exit)).toBe(true);
        expect(yield* Ref.get(entered)).toBe(false);
      })
  );

  it.effect("closes only the disconnected request's running work", () =>
    Effect.gen(function* () {
      const disconnected = yield* Effect.sync(() => new AbortController());
      const active = yield* Effect.sync(() => new AbortController());
      const entered = yield* Deferred.make<boolean>();
      const released = yield* Ref.make(false);
      const otherReleased = yield* Ref.make(false);
      const first = yield* Deferred.succeed(entered, true).pipe(
        Effect.andThen(Effect.never),
        Effect.ensuring(Ref.set(released, true)),
        withMcpRequestCancellation,
        Effect.provideService(
          McpRequestAbortSignal,
          Option.some(disconnected.signal)
        ),
        Effect.forkScoped
      );
      const other = yield* Effect.never.pipe(
        Effect.ensuring(Ref.set(otherReleased, true)),
        withMcpRequestCancellation,
        Effect.provideService(
          McpRequestAbortSignal,
          Option.some(active.signal)
        ),
        Effect.forkScoped
      );
      yield* Deferred.await(entered);
      yield* Effect.sync(() => disconnected.abort());
      expect(Exit.hasInterrupts(yield* Fiber.await(first))).toBe(true);
      expect(yield* Ref.get(released)).toBe(true);
      expect(yield* Ref.get(otherReleased)).toBe(false);
      yield* Fiber.interrupt(other);
    }).pipe(Effect.scoped)
  );
});
