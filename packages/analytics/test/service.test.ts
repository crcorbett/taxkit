import { expect, it } from "@effect/vitest";
import {
  Match,
  Function as EffectFunction,
  Array,
  Cause,
  Crypto,
  ConfigProvider,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Ref,
  Predicate,
  Result,
  Stream,
  Boolean as EffectBoolean,
} from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { TestClock } from "effect/testing";

import {
  calculatorUseFixture,
  productionAnalyticsConfig,
} from "../src/__testing__/fixtures.js";
import { BackendAnalyticsLive } from "../src/live.layer.js";
import { BackendAnalytics } from "../src/service.js";
import { makeBackendAnalyticsTest } from "../src/test.layer.js";

const expectedTimestamp: unknown = expect.any(String);
const expectedContentLength: unknown = expect.stringMatching(/^\d+$/u);
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
      const config = productionAnalyticsConfig;
      const input = yield* calculatorUseFixture;
      const seen = yield* Ref.make<readonly unknown[]>([]);
      const transport = HttpClient.make((request, url) =>
        Effect.gen(function* () {
          expect(url.href).toBe("https://us.i.posthog.com/batch/");
          expect(request.method).toBe("POST");
          expect({ ...request.headers }).toStrictEqual({
            "cache-control": "no-store",
            "content-length": expectedContentLength,
            "content-type": "application/json",
          });
          const policy = yield* Effect.serviceOption(
            FetchHttpClient.RequestInit
          );
          EffectFunction.pipe(
            Option.getOrElse(policy, () =>
              expect.fail("Missing native fetch policy")
            ),
            (actual) => {
              expect(actual).toStrictEqual({
                cache: "no-store",
                credentials: "omit",
                redirect: "manual",
              });
            }
          );
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
          BackendAnalyticsLive.pipe(
            Layer.provide(ConfigProvider.layer(config)),
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
            Layer.provide(TestCrypto)
          )
        )
      );
      expect(disposition).toBe("accepted");
      expect(yield* Ref.get(seen)).toStrictEqual([
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
              timestamp: expectedTimestamp,
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
      const config = Match.value(mode).pipe(
        Match.when("disabled", () =>
          ConfigProvider.fromUnknown({ POSTHOG_COLLECTION_MODE: "off" })
        ),
        Match.orElse(() => productionAnalyticsConfig)
      );
      const input = yield* calculatorUseFixture;
      const crypto = yield* Crypto.Crypto;
      const noUseCrypto = Layer.succeed(Crypto.Crypto, {
        ...crypto,
        randomUUIDv4: () =>
          Effect.die("Disabled capture generated an identity"),
      });
      const transport = HttpClient.make(() =>
        Effect.die("Disabled capture made a request")
      );
      expect(
        yield* BackendAnalytics.pipe(
          Effect.flatMap((analytics) =>
            analytics.recordCalculatorUse({
              ...input,
              collectionPolicy: Match.value(mode).pipe(
                Match.when("denied", (): "deny" => "deny"),
                Match.orElse((): "allow" => "allow")
              ),
            })
          ),
          Effect.provide(
            BackendAnalyticsLive.pipe(
              Layer.provide(ConfigProvider.layer(config)),
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
      const config = productionAnalyticsConfig;
      const input = yield* calculatorUseFixture;
      const count = yield* Ref.make(0);
      const transport = HttpClient.make((request) =>
        Ref.update(count, (n) => n + 1).pipe(
          Effect.as(
            HttpServerResponse.toClientResponse(
              Match.value(status).pipe(
                Match.when(204, (matchedValue) =>
                  HttpServerResponse.empty({ status: matchedValue })
                ),
                Match.orElse((matchedValue) =>
                  HttpServerResponse.text("provider-body", {
                    headers: { location: "https://private.invalid/secret" },
                    status: matchedValue,
                  })
                )
              ),
              { request }
            )
          )
        )
      );
      const result = yield* BackendAnalytics.pipe(
        Effect.flatMap((analytics) => analytics.recordCalculatorUse(input)),
        Effect.result,
        Effect.provide(
          BackendAnalyticsLive.pipe(
            Layer.provide(ConfigProvider.layer(config)),
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
            Layer.provide(TestCrypto)
          )
        )
      );
      expect(yield* Ref.get(count)).toBe(1);
      EffectFunction.pipe(
        Result.match(result, {
          onFailure: (error) => error.reason,
          onSuccess: (value) => value,
        }),
        (actual) => {
          expect(actual).toBe(
            EffectBoolean.match(status < 300, {
              onFalse: (): "rejected" => "rejected",
              onTrue: (): "accepted" => "accepted",
            })
          );
        }
      );
    })
);
it.effect.each([200, 204, 302, 500])(
  "closes the native request lifetime, including a bodyless reply, at status %i",
  (status) =>
    Effect.gen(function* () {
      const config = productionAnalyticsConfig;
      const input = yield* calculatorUseFixture;
      const seen = yield* Ref.make<readonly AbortSignal[]>([]);
      const transport = HttpClient.make((request, _address, signal) =>
        Ref.update(seen, (items) => Array.append(items, signal)).pipe(
          Effect.as(
            HttpClientResponse.fromWeb(
              request,
              new Response(
                Match.value(status).pipe(
                  Match.when(204, () => null),
                  Match.orElse((): "provider-body" => "provider-body")
                ),
                { status }
              )
            )
          )
        )
      );
      const result = yield* BackendAnalytics.use((analytics) =>
        analytics.recordCalculatorUse(input)
      ).pipe(
        Effect.result,
        Effect.provide(
          BackendAnalyticsLive.pipe(
            Layer.provide(ConfigProvider.layer(config)),
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
            Layer.provide(TestCrypto)
          )
        )
      );
      EffectFunction.pipe(
        Result.match(result, {
          onFailure: (error) => error.reason,
          onSuccess: (value) => value,
        }),
        (actual) => {
          expect(actual).toBe(
            EffectBoolean.match(status < 300, {
              onFalse: (): "rejected" => "rejected",
              onTrue: (): "accepted" => "accepted",
            })
          );
        }
      );
      const signals = yield* Ref.get(seen);
      expect(signals).toHaveLength(1);
      EffectFunction.pipe(
        EffectFunction.pipe(
          signals,
          Array.every((signal) => signal.aborted)
        ),
        (actual) => {
          expect(actual).toBeTruthy();
        }
      );
    })
);
it.effect.each([65_536, 65_537])(
  "bounds the whole reply across multiple chunks at %i bytes",
  (size) =>
    Effect.gen(function* () {
      const config = productionAnalyticsConfig;
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
          BackendAnalyticsLive.pipe(
            Layer.provide(ConfigProvider.layer(config)),
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
            Layer.provide(TestCrypto)
          )
        )
      );
      EffectFunction.pipe(
        Result.match(result, {
          onFailure: (error) => error.reason,
          onSuccess: (value) => value,
        }),
        (actual) => {
          expect(actual).toBe(
            Match.value(size).pipe(
              Match.when(65_536, (): "accepted" => "accepted"),
              Match.orElse((): "response-size" => "response-size")
            )
          );
        }
      );
    })
);
it.effect.each(["headers", "body"] as const)(
  "one five-second deadline includes stalled %s and closes that work",
  (phase) =>
    Effect.gen(function* () {
      const config = productionAnalyticsConfig;
      const input = yield* calculatorUseFixture;
      const started = yield* Deferred.make<boolean>();
      const released = yield* Deferred.make<boolean>();
      const pending = Deferred.succeed(started, true).pipe(
        Effect.andThen(Effect.never),
        Effect.ensuring(Deferred.succeed(released, true))
      );
      const transport = HttpClient.make((request) =>
        Match.value(phase).pipe(
          Match.when("headers", () => pending),
          Match.orElse(() =>
            Effect.succeed(
              HttpServerResponse.toClientResponse(
                HttpServerResponse.stream(Stream.fromEffect(pending)),
                { request }
              )
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
        expect(!(yield* Deferred.isDone(released))).toBeTruthy();
        yield* TestClock.adjust("1 second");
        expect((yield* Fiber.join(call).pipe(Effect.flip)).reason).toBe(
          "deadline"
        );
        yield* Deferred.await(released);
      }).pipe(
        Effect.provide(
          BackendAnalyticsLive.pipe(
            Layer.provide(ConfigProvider.layer(config)),
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
    const config = productionAnalyticsConfig;
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
        BackendAnalyticsLive.pipe(
          Layer.provide(ConfigProvider.layer(config)),
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
      const config = productionAnalyticsConfig;
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
        EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
          expect(actual).toBeTruthy();
        });
        if (Exit.isFailure(exit)) {
          EffectFunction.pipe(Cause.hasInterrupts(exit.cause), (actual) => {
            expect(actual).toBeTruthy();
          });
          EffectFunction.pipe(Cause.hasFails(exit.cause), (actual) => {
            expect(!actual).toBeTruthy();
          });
        }
        yield* Deferred.await(released);
      }).pipe(
        Effect.provide(
          BackendAnalyticsLive.pipe(
            Layer.provide(ConfigProvider.layer(config)),
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
      expect(yield* Ref.get(test.uses)).toStrictEqual([input]);
    })
);
it.effect(
  "constructs a static Layer and rejects invalid enabled configuration before using transport",
  () =>
    Effect.gen(function* () {
      EffectFunction.pipe(Layer.isLayer(BackendAnalyticsLive), (actual) => {
        expect(actual).toBeTruthy();
      });
      const result = yield* BackendAnalytics.pipe(
        Effect.provide(
          BackendAnalyticsLive.pipe(
            Layer.provide(
              ConfigProvider.layer(
                ConfigProvider.fromUnknown({
                  POSTHOG_COLLECTION_MODE: "production",
                })
              )
            ),
            Layer.provide(
              Layer.succeed(
                HttpClient.HttpClient,
                HttpClient.make(() =>
                  Effect.die("Invalid configuration used transport")
                )
              )
            ),
            Layer.provide(TestCrypto)
          )
        ),
        Effect.result
      );
      const failedAsExpected =
        Result.isFailure(result) &&
        Predicate.isTagged(result.failure, "AnalyticsConfigurationError");
      expect(failedAsExpected).toBeTruthy();
    })
);
