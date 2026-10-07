import { expect, it } from "@effect/vitest";
import {
  Array,
  Cause,
  Crypto,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Ref,
  Result,
  Stream,
} from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { TestClock } from "effect/testing";

import {
  calculatorUseFixture,
  disabledAnalyticsFixture,
  productionAnalyticsFixture,
} from "../src/__testing__/fixtures.js";
import { BackendAnalyticsLive } from "../src/live.layer.js";
import { BackendAnalytics } from "../src/service.js";
import { makeBackendAnalyticsTest } from "../src/test.layer.js";

const TestCrypto = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    digest: (_algorithm, bytes) => Effect.succeed(bytes),
    randomBytes: (size) => new Uint8Array(size),
  })
);

it.effect(
  "encodes one minimal event with no caller identity, figures, queries or credentials",
  () =>
    Effect.gen(function* () {
      const settings = yield* productionAnalyticsFixture;
      const input = yield* calculatorUseFixture;
      const seen = yield* Ref.make<readonly unknown[]>([]);
      const transport = HttpClient.make((request, url) =>
        Effect.gen(function* () {
          expect(url.href).toBe("https://us.i.posthog.com/batch/");
          expect(request.method).toBe("POST");
          expect(request.headers).toEqual({
            "cache-control": "no-store",
            "content-length": expect.stringMatching(/^\d+$/u),
            "content-type": "application/json",
          });
          const policy = yield* Effect.serviceOption(
            FetchHttpClient.RequestInit
          );
          expect(
            Option.getOrElse(policy, () =>
              expect.fail("Missing native fetch policy")
            )
          ).toEqual({
            cache: "no-store",
            credentials: "omit",
            redirect: "manual",
          });
          expect(yield* HttpClient.TracerDisabledWhen).toBeTypeOf("function");
          const raw = yield* HttpServerRequest.fromClientRequest(
            request
          ).json.pipe(
            Effect.catchTag("HttpServerError", () =>
              Effect.die("The test capture body is not JSON")
            )
          );
          yield* Ref.update(seen, (items) => Array.append(items, raw));
          return HttpServerResponse.toClientResponse(
            HttpServerResponse.text("1"),
            { request }
          );
        })
      );
      const disposition = yield* BackendAnalytics.pipe(
        Effect.flatMap((analytics) => analytics.recordCalculatorUse(input)),
        Effect.provide(
          BackendAnalyticsLive(settings).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
            Layer.provide(TestCrypto)
          )
        )
      );
      expect(disposition).toBe("accepted");
      expect(yield* Ref.get(seen)).toEqual([
        {
          api_key: "phc_synthetic_taxkit_capture_fixture_only",
          batch: [
            {
              distinct_id: "00000000-0000-4000-8000-000000000000",
              event: "calculator_used",
              properties: {
                $geoip_disable: true,
                $process_person_profile: false,
                application: "api",
                calculator_id: "au.pay.take-home",
                calculator_name: "AU take-home pay",
                project: "taxkit",
                schema_version: 1,
                stage: "prod",
              },
              timestamp: expect.any(String),
              uuid: "00000000-0000-4000-8000-000000000000",
            },
          ],
        },
      ]);
    })
);

it.effect.each(["disabled", "denied"] as const)(
  "$0 collection generates no identity and makes no request",
  (mode) =>
    Effect.gen(function* () {
      const settings = yield* mode === "disabled"
        ? disabledAnalyticsFixture
        : productionAnalyticsFixture;
      const input = yield* calculatorUseFixture;
      const crypto = yield* Crypto.Crypto;
      const noUseCrypto = Layer.succeed(Crypto.Crypto, {
        ...crypto,
        randomUUIDv4: Effect.die("Disabled capture generated an identity"),
      });
      const transport = HttpClient.make(() =>
        Effect.die("Disabled capture made a request")
      );
      expect(
        yield* BackendAnalytics.pipe(
          Effect.flatMap((analytics) =>
            analytics.recordCalculatorUse({
              ...input,
              collectionPolicy: mode === "denied" ? "deny" : "allow",
            })
          ),
          Effect.provide(
            BackendAnalyticsLive(settings).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
              Layer.provide(noUseCrypto)
            )
          )
        )
      ).toBe(mode);
    }).pipe(Effect.provide(TestCrypto))
);

it.effect.each([200, 204, 299, 301, 400, 429, 500])(
  "does not retry, follow or expose a provider response with status %i",
  (status) =>
    Effect.gen(function* () {
      const settings = yield* productionAnalyticsFixture;
      const input = yield* calculatorUseFixture;
      const count = yield* Ref.make(0);
      const transport = HttpClient.make((request) =>
        Ref.update(count, (n) => n + 1).pipe(
          Effect.as(
            HttpServerResponse.toClientResponse(
              status === 204
                ? HttpServerResponse.empty({ status })
                : HttpServerResponse.text("provider-body", {
                    headers: { location: "https://private.invalid/secret" },
                    status,
                  }),
              { request }
            )
          )
        )
      );
      const result = yield* BackendAnalytics.pipe(
        Effect.flatMap((analytics) => analytics.recordCalculatorUse(input)),
        Effect.result,
        Effect.provide(
          BackendAnalyticsLive(settings).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
            Layer.provide(TestCrypto)
          )
        )
      );
      expect(yield* Ref.get(count)).toBe(1);
      expect(
        Result.match(result, {
          onFailure: (error) => error.reason,
          onSuccess: (value) => value,
        })
      ).toBe(status < 300 ? "accepted" : "rejected");
    })
);

it.effect.each([65_536, 65_537])(
  "bounds the whole reply across multiple chunks at %i bytes",
  (size) =>
    Effect.gen(function* () {
      const settings = yield* productionAnalyticsFixture;
      const input = yield* calculatorUseFixture;
      const transport = HttpClient.make((request) =>
        Effect.succeed(
          HttpServerResponse.toClientResponse(
            HttpServerResponse.stream(
              Stream.make(new Uint8Array(32_768), new Uint8Array(size - 32_768))
            ),
            { request }
          )
        )
      );
      const result = yield* BackendAnalytics.pipe(
        Effect.flatMap((analytics) => analytics.recordCalculatorUse(input)),
        Effect.result,
        Effect.provide(
          BackendAnalyticsLive(settings).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
            Layer.provide(TestCrypto)
          )
        )
      );
      expect(
        Result.match(result, {
          onFailure: (error) => error.reason,
          onSuccess: (value) => value,
        })
      ).toBe(size === 65_536 ? "accepted" : "response-size");
    })
);

it.effect.each(["headers", "body"] as const)(
  "one five-second deadline includes stalled %s and closes that work",
  (phase) =>
    Effect.gen(function* () {
      const settings = yield* productionAnalyticsFixture;
      const input = yield* calculatorUseFixture;
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
                HttpServerResponse.stream(Stream.fromEffect(pending)),
                { request }
              )
            )
      );
      yield* Effect.gen(function* () {
        const analytics = yield* BackendAnalytics;
        const call = yield* analytics
          .recordCalculatorUse(input)
          .pipe(Effect.forkScoped);
        yield* Deferred.await(started);
        yield* TestClock.adjust("4 seconds");
        expect(yield* Deferred.isDone(released)).toBe(false);
        yield* TestClock.adjust("1 second");
        expect((yield* Fiber.join(call).pipe(Effect.flip)).reason).toBe(
          "deadline"
        );
        yield* Deferred.await(released);
      }).pipe(
        Effect.provide(
          BackendAnalyticsLive(settings).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
            Layer.provide(TestCrypto)
          )
        ),
        Effect.scoped
      );
    })
);

it.effect("headers and body share one budget after late headers", () =>
  Effect.gen(function* () {
    const settings = yield* productionAnalyticsFixture;
    const input = yield* calculatorUseFixture;
    const started = yield* Deferred.make<boolean>();
    const bodyStarted = yield* Deferred.make<boolean>();
    const released = yield* Deferred.make<boolean>();
    const transport = HttpClient.make((request) =>
      Deferred.succeed(started, true).pipe(
        Effect.andThen(Effect.sleep("4 seconds")),
        Effect.as(
          HttpServerResponse.toClientResponse(
            HttpServerResponse.stream(
              Stream.fromEffect(
                Deferred.succeed(bodyStarted, true).pipe(
                  Effect.andThen(Effect.never),
                  Effect.ensuring(Deferred.succeed(released, true))
                )
              )
            ),
            { request }
          )
        )
      )
    );
    yield* Effect.gen(function* () {
      const analytics = yield* BackendAnalytics;
      const call = yield* analytics
        .recordCalculatorUse(input)
        .pipe(Effect.forkScoped);
      yield* Deferred.await(started);
      yield* TestClock.adjust("4 seconds");
      yield* Deferred.await(bodyStarted);
      yield* TestClock.adjust("1 second");
      expect((yield* Fiber.join(call).pipe(Effect.flip)).reason).toBe(
        "deadline"
      );
      yield* Deferred.await(released);
    }).pipe(
      Effect.provide(
        BackendAnalyticsLive(settings).pipe(
          Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
          Layer.provide(TestCrypto)
        )
      ),
      Effect.scoped
    );
  })
);

it.effect(
  "earlier caller interruption closes pending capture and remains interruption",
  () =>
    Effect.gen(function* () {
      const settings = yield* productionAnalyticsFixture;
      const input = yield* calculatorUseFixture;
      const started = yield* Deferred.make<boolean>();
      const released = yield* Deferred.make<boolean>();
      const transport = HttpClient.make(() =>
        Deferred.succeed(started, true).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Deferred.succeed(released, true))
        )
      );
      yield* Effect.gen(function* () {
        const analytics = yield* BackendAnalytics;
        const call = yield* analytics
          .recordCalculatorUse(input)
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
          BackendAnalyticsLive(settings).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
            Layer.provide(TestCrypto)
          )
        ),
        Effect.scoped
      );
    })
);

it.effect(
  "the deterministic test Layer substitutes the same named operation",
  () =>
    Effect.gen(function* () {
      const input = yield* calculatorUseFixture;
      const test = yield* makeBackendAnalyticsTest;
      expect(
        yield* BackendAnalytics.pipe(
          Effect.flatMap((analytics) => analytics.recordCalculatorUse(input)),
          Effect.provide(test.layer)
        )
      ).toBe("accepted");
      expect(yield* Ref.get(test.uses)).toEqual([input]);
    })
);
