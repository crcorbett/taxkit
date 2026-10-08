import {
  Crypto,
  DateTime,
  Effect,
  Layer,
  Match,
  Redacted,
  Schema,
  Stream,
} from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";

import { AnalyticsCaptureError } from "./errors.js";
import {
  CalculatorCaptureBatch,
  CaptureResponseByteLimit,
  EventId,
} from "./schemas.js";
import type { AnalyticsSettings } from "./schemas.js";
import { BackendAnalytics } from "./service.js";

// The application supplies native FetchHttpClient. Each operation fixes its
// credential and redirect policy in the calling fibre. No SDK,
// request runner, background fibre or credentials accessor belongs here.
export const BackendAnalyticsLive = (settings: AnalyticsSettings) =>
  Match.value(settings).pipe(
    Match.tag("AnalyticsDisabled", () =>
      Layer.succeed(
        BackendAnalytics,
        BackendAnalytics.of({
          recordCalculatorUse: Effect.fn(
            "BackendAnalytics.recordCalculatorUse"
          )(() => Effect.succeed("disabled" as const)),
        })
      )
    ),
    Match.tag("AnalyticsEnabled", (config) =>
      Layer.effect(
        BackendAnalytics,
        Effect.gen(function* () {
          const http = HttpClient.withScope(yield* HttpClient.HttpClient);
          const crypto = yield* Crypto.Crypto;
          return BackendAnalytics.of({
            recordCalculatorUse: Effect.fn(
              "BackendAnalytics.recordCalculatorUse"
            )(
              function* (input) {
                if (input.collectionPolicy === "deny") {
                  return "denied" as const;
                }
                const uuid = yield* crypto.randomUUIDv4.pipe(
                  Effect.flatMap(EventId.makeEffect),
                  Effect.mapError(
                    () =>
                      new AnalyticsCaptureError({
                        operation: "calculator-use",
                        reason: "identity",
                      })
                  )
                );
                const timestamp = yield* DateTime.now;
                const body = yield* Schema.encodeEffect(
                  Schema.fromJsonString(CalculatorCaptureBatch)
                )({
                  api_key: Redacted.value(config.token),
                  batch: [
                    {
                      distinct_id: uuid,
                      event: "calculator_used",
                      properties: {
                        $geoip_disable: true,
                        $process_person_profile: false,
                        application: "api",
                        calculator_id: input.calculatorId,
                        calculator_name: input.calculatorName,
                        project: "taxkit",
                        schema_version: 1,
                        stage: config.stage,
                      },
                      timestamp,
                      uuid,
                    },
                  ],
                }).pipe(
                  Effect.mapError(
                    () =>
                      new AnalyticsCaptureError({
                        operation: "calculator-use",
                        reason: "encoding",
                      })
                  )
                );
                const response = yield* http
                  .execute(
                    HttpClientRequest.post(
                      "https://us.i.posthog.com/batch/"
                    ).pipe(
                      HttpClientRequest.bodyText(body, "application/json"),
                      HttpClientRequest.setHeader("cache-control", "no-store")
                    )
                  )
                  .pipe(
                    Effect.mapError(
                      () =>
                        new AnalyticsCaptureError({
                          operation: "calculator-use",
                          reason: "transport",
                        })
                    )
                  );
                if (response.status < 200 || response.status >= 300) {
                  return yield* new AnalyticsCaptureError({
                    operation: "calculator-use",
                    reason: "rejected",
                  });
                }
                yield* response.stream.pipe(
                  Stream.catchTag("HttpClientError", (error) =>
                    Match.value(error.reason).pipe(
                      Match.tag("EmptyBodyError", () => Stream.empty),
                      Match.orElse(() => Stream.fail(error))
                    )
                  ),
                  Stream.mapError(
                    () =>
                      new AnalyticsCaptureError({
                        operation: "calculator-use",
                        reason: "transport",
                      })
                  ),
                  Stream.limitBytes(CaptureResponseByteLimit, () =>
                    Stream.fail(
                      new AnalyticsCaptureError({
                        operation: "calculator-use",
                        reason: "response-size",
                      })
                    )
                  ),
                  Stream.runDrain
                );
                return "accepted" as const;
              },
              (effect) =>
                effect.pipe(
                  Effect.scoped,
                  Effect.provideService(
                    HttpClient.TracerDisabledWhen,
                    () => true
                  ),
                  Effect.provideService(FetchHttpClient.RequestInit, {
                    cache: "no-store",
                    credentials: "omit",
                    redirect: "manual",
                  }),
                  Effect.timeoutOrElse({
                    duration: "5 seconds",
                    orElse: () =>
                      Effect.fail(
                        new AnalyticsCaptureError({
                          operation: "calculator-use",
                          reason: "deadline",
                        })
                      ),
                  })
                )
            ),
          });
        })
      )
    ),
    Match.exhaustive
  );
