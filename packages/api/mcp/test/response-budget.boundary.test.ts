import { describe, expect, it } from "@effect/vitest";
import {
  Match,
  Function as EffectFunction,
  Deferred,
  Effect,
  Fiber,
  Ref,
  Stream,
} from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";
import { TestClock } from "effect/testing";

import { withBoundedMcpReply } from "../src/response-budget.boundary.js";

describe("complete native MCP response budget", () => {
  it.effect.each([2_097_152, 2_097_153])(
    "bounds %i framed bytes and closes the stream",
    (length) =>
      Effect.gen(function* () {
        const released = yield* Ref.make(false);
        const stream = Stream.succeed(new Uint8Array(length)).pipe(
          Stream.ensuring(Ref.set(released, true))
        );
        const response = yield* EffectFunction.pipe(
          Effect.succeed(
            HttpServerResponse.stream(stream, {
              contentType: "text/event-stream",
            })
          ),
          withBoundedMcpReply
        );
        expect(response.status).toBe(
          Match.value(length).pipe(
            Match.when(2_097_152, (): 200 => 200),
            Match.orElse((): 503 => 503)
          )
        );
        expect(yield* Ref.get(released)).toBeTruthy();
      }).pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request("https://api.example.com/mcp", { method: "POST" })
          )
        ),
        Effect.scoped
      )
  );
  it.effect(
    "applies one deadline to a stalled response and closes its resources",
    () =>
      Effect.gen(function* () {
        const entered = yield* Deferred.make<boolean>();
        const released = yield* Ref.make(false);
        const body = Stream.fromEffect(
          Deferred.succeed(entered, true).pipe(Effect.andThen(Effect.never))
        ).pipe(Stream.ensuring(Ref.set(released, true)));
        const call = yield* EffectFunction.pipe(
          Effect.succeed(
            HttpServerResponse.stream(body, {
              contentType: "text/event-stream",
            })
          ),
          withBoundedMcpReply
        ).pipe(Effect.forkScoped);
        yield* Deferred.await(entered);
        yield* TestClock.adjust("9 seconds");
        expect(!(yield* Ref.get(released))).toBeTruthy();
        yield* TestClock.adjust("1 second");
        expect((yield* Fiber.join(call)).status).toBe(503);
        expect(yield* Ref.get(released)).toBeTruthy();
      }).pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request("https://api.example.com/mcp", { method: "POST" })
          )
        ),
        Effect.scoped
      )
  );
});
