import { describe, expect, it } from "@effect/vitest";
import { Clock, Deferred, Effect, Fiber, Ref, Schema, Stream } from "effect";
import {
  HttpClientRequest,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { TestClock } from "effect/testing";

import {
  CalculatorRequestBodyErrorEnvelope,
  CalculatorRequestBodyPolicy,
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
  withCalculatorRequestBodyLimit,
} from "../src/request-boundary.js";
import { TaxKitServerLayer } from "../src/server.js";
import { ContentTestLive } from "./content.fixture.js";

const path =
  "http://taxkit.internal/api/v1/calculators/au.pay.take-home/calculate";

describe("shared HTTP request-body policy", () => {
  it.effect(
    "refuses a late synchronous body before entering the request handler",
    () =>
      Effect.gen(function* () {
        const entered = yield* Ref.make(false);
        const clock = yield* Clock.Clock;
        const time = yield* Ref.make(0n);
        const request = HttpClientRequest.post(path).pipe(
          HttpClientRequest.bodyUint8Array(
            new Uint8Array([1]),
            "application/json"
          )
        );
        const response = yield* withCalculatorRequestBodyLimit(
          Ref.set(entered, true).pipe(Effect.as(HttpServerResponse.empty()))
        ).pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromClientRequest(request)
          ),
          Effect.provideService(Clock.Clock, {
            ...clock,
            monotonicTimeNanos: Ref.modify(time, (value) => [
              value,
              5_000_000_000n,
            ]),
          })
        );
        expect(response.status).toBe(408);
        expect(yield* Ref.get(entered)).toBe(false);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "guards the retained standalone HTTP routes before parsing oversized bytes",
    () =>
      Effect.gen(function* () {
        const handler = yield* HttpRouter.toHttpEffect(TaxKitServerLayer).pipe(
          Effect.provide(ContentTestLive)
        );
        const request = HttpClientRequest.post(path).pipe(
          HttpClientRequest.bodyUint8Array(
            new TextEncoder().encode(`PRIVATE9${"é".repeat(32_769)}`),
            "application/json"
          )
        );
        const response = yield* handler.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromClientRequest(request)
          )
        );
        expect(response.status).toBe(413);
        const clientResponse = HttpServerResponse.toClientResponse(response, {
          request,
        });
        expect(
          yield* Schema.decodeUnknownEffect(CalculatorRequestBodyErrorEnvelope)(
            yield* clientResponse.json
          )
        ).toEqual({ error: new CalculatorRequestBodyTooLarge() });
      }).pipe(Effect.scoped)
  );

  it.effect.each(["json", "html"] as const)(
    "closes a stalled source at five seconds and returns safe $0 guidance",
    (responseFormat) =>
      Effect.gen(function* () {
        const started = yield* Deferred.make<boolean>();
        const released = yield* Ref.make(false);
        const entered = yield* Ref.make(false);
        const request = HttpClientRequest.post(path).pipe(
          HttpClientRequest.bodyStream(
            Stream.fromEffect(
              Deferred.succeed(started, true).pipe(Effect.andThen(Effect.never))
            ).pipe(Stream.ensuring(Ref.set(released, true))),
            { contentType: "application/json" }
          )
        );
        const call = yield* withCalculatorRequestBodyLimit(
          Ref.set(entered, true).pipe(
            Effect.as(HttpServerResponse.empty({ status: 200 }))
          ),
          CalculatorRequestBodyPolicy.make({ responseFormat })
        ).pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromClientRequest(request)
          ),
          Effect.forkScoped
        );
        yield* Deferred.await(started);
        yield* TestClock.adjust("4 seconds");
        expect(yield* Ref.get(released)).toBe(false);
        yield* TestClock.adjust("1 second");
        expect(yield* Ref.get(released)).toBe(true);
        const response = yield* Fiber.join(call);
        expect(response.status).toBe(408);
        expect(yield* Ref.get(entered)).toBe(false);
        const body = yield* HttpServerResponse.toClientResponse(response, {
          request,
        }).text;
        if (responseFormat === "json") {
          expect(
            yield* Schema.decodeUnknownEffect(
              Schema.fromJsonString(CalculatorRequestBodyErrorEnvelope)
            )(body)
          ).toEqual({ error: new CalculatorRequestBodyTimedOut() });
        } else {
          expect(body).toContain(new CalculatorRequestBodyTimedOut().message);
          expect(body).toContain('href="/"');
        }
        expect(body).not.toContain("stack");
        expect(body).not.toContain(path);
      }).pipe(Effect.scoped)
  );
});
