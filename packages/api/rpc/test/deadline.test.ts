import { expect, it } from "@effect/vitest";
import {
  Cause,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Result,
  Schema,
  Stream,
} from "effect";
import { FetchHttpClient, HttpClient, HttpServerResponse } from "effect/http";
import { TestClock } from "effect/testing";

import { CalculationRequest } from "../src/__testing__/fixtures.js";
import { CalculatorRpcDeadlineExceeded } from "../src/errors.js";
import { TaxKitRpcClientLive } from "../src/live.layer.js";
import { CalculatorRpcOrigin } from "../src/schemas.js";
import { TaxKitRpcClient } from "../src/service.js";

const origin = Schema.decodeResult(CalculatorRpcOrigin)(
  "https://api.example.com"
).pipe(Result.getOrThrowWith(() => new Error("Invalid fixture origin")));

it.effect.each(["headers", "body"] as const)(
  "one deadline includes stalled %s and cleans up that work",
  (phase) =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const released = yield* Deferred.make<boolean>();
      const pending = Deferred.succeed(started, true).pipe(
        Effect.andThen(Effect.never),
        Effect.ensuring(Deferred.succeed(released, true))
      );
      const transport = HttpClient.make((request) =>
        phase === "headers"
          ? pending
          : Effect.succeed(
              HttpServerResponse.toClientResponse(
                HttpServerResponse.stream(Stream.fromEffect(pending), {
                  contentType: "application/json",
                }),
                { request }
              )
            )
      );
      yield* Effect.gen(function* () {
        const client = yield* TaxKitRpcClient;
        const call = yield* client
          .calculate(CalculationRequest)
          .pipe(Effect.forkScoped);
        yield* Deferred.await(started);
        yield* TestClock.adjust("5 seconds");
        const error = yield* Fiber.join(call).pipe(Effect.flip);
        expect(Schema.is(CalculatorRpcDeadlineExceeded)(error)).toBe(true);
        yield* Deferred.await(released);
      }).pipe(
        Effect.provide(
          TaxKitRpcClientLive(origin).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
          )
        )
      );
    })
);

it.effect(
  "an earlier caller interruption closes a stalled body and remains interruption",
  () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const released = yield* Deferred.make<boolean>();
      const body = Stream.fromEffect(
        Deferred.succeed(started, true).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Deferred.succeed(released, true))
        )
      );
      const transport = HttpClient.make((request) =>
        Effect.succeed(
          HttpServerResponse.toClientResponse(
            HttpServerResponse.stream(body, {
              contentType: "application/json",
            }),
            { request }
          )
        )
      );
      yield* Effect.gen(function* () {
        const client = yield* TaxKitRpcClient;
        const call = yield* client
          .calculate(CalculationRequest)
          .pipe(Effect.forkScoped);
        yield* Deferred.await(started);
        yield* Fiber.interrupt(call);
        const exit = yield* Fiber.await(call);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Cause.hasInterrupts(exit.cause)).toBe(true);
          expect(Cause.hasFails(exit.cause)).toBe(false);
        }
        yield* Deferred.await(released);
      }).pipe(
        Effect.provide(
          TaxKitRpcClientLive(origin).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
          )
        )
      );
    })
);

it.effect(
  "closing the caller's scope interrupts pending native client work",
  () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const released = yield* Deferred.make<boolean>();
      const transport = HttpClient.make(() =>
        Deferred.succeed(started, true).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Deferred.succeed(released, true))
        )
      );
      yield* Effect.gen(function* () {
        const client = yield* TaxKitRpcClient;
        yield* client.calculate(CalculationRequest).pipe(Effect.forkScoped);
        yield* Deferred.await(started);
      }).pipe(
        Effect.provide(
          TaxKitRpcClientLive(origin).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
          )
        ),
        Effect.scoped
      );
      yield* Deferred.await(released);
    })
);

it.effect(
  "applies credential and redirect policy when the HTTP operation runs",
  () =>
    Effect.gen(function* () {
      const reached = yield* Deferred.make<
        Readonly<{
          credentials: RequestCredentials | undefined;
          redirect: RequestRedirect | undefined;
        }>
      >();
      const transport = HttpClient.make(() =>
        Effect.gen(function* () {
          const policy = yield* Effect.serviceOption(
            FetchHttpClient.RequestInit
          ).pipe(
            Effect.map(
              Option.getOrElse(() =>
                expect.fail("Missing operation fetch policy")
              )
            )
          );
          yield* Deferred.succeed(reached, {
            credentials: policy.credentials,
            redirect: policy.redirect,
          });
          return yield* Effect.never;
        })
      );
      yield* Effect.gen(function* () {
        const client = yield* TaxKitRpcClient;
        const call = yield* client
          .calculate(CalculationRequest)
          .pipe(Effect.forkScoped);
        expect(yield* Deferred.await(reached)).toEqual({
          credentials: "omit",
          redirect: "error",
        });
        yield* Fiber.interrupt(call);
      }).pipe(
        Effect.provide(
          TaxKitRpcClientLive(origin).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
          )
        )
      );
    })
);

it.effect(
  "rejects origins that carry paths, private parameters, credentials or a remote HTTP address",
  () =>
    Effect.gen(function* () {
      yield* Effect.forEach(
        [
          "https://api.example.com/private",
          "https://api.example.com/?credential=secret",
          "https://user:password@api.example.com",
          "https://api.example.com/#secret",
          "http://api.example.com",
        ],
        (value) =>
          Effect.gen(function* () {
            const result = yield* Schema.decodeUnknownEffect(
              CalculatorRpcOrigin
            )(value).pipe(Effect.result);
            expect(Result.isFailure(result)).toBe(true);
          })
      );
      yield* Effect.forEach(
        [
          "https://api.example.com",
          "http://127.0.0.1:4000",
          "http://localhost:4000",
        ],
        (value) => Schema.decodeUnknownEffect(CalculatorRpcOrigin)(value)
      );
    })
);
