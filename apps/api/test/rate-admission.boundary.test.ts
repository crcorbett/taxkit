import { RateLimit } from "@alchemy.run/cloudflare/Workers";
import { describe, expect, it } from "@effect/vitest";
import { TaxKitApi } from "@taxkit/api-http/api";
import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import {
  CalculatorAdmission,
  CalculatorRequestRateKey,
} from "@taxkit/calculators/admission.service";
import {
  CalculatorRateLimited,
  CalculatorRunRequest,
  CalculationQuery,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import { CalculationRequest } from "@taxkit/calculators/testing/fixtures";
import { edgeCallerKey } from "@taxkit/observability/edge-identity";
import {
  Predicate,
  Match,
  Function as EffectFunction,
  Array,
  ConfigProvider,
  Effect,
  HashMap,
  Layer,
  Option,
  Redacted,
  Ref,
  Result,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import {
  Headers,
  HttpClient,
  HttpClientRequest,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { HttpApiClient } from "effect/http-api";

import { ApiCalculatorAdmission } from "../src/worker-admission.layer.js";
import { ApiWorkerInit } from "../src/worker.js";

const settings = ConfigProvider.fromUnknown({
  API_PUBLIC_ORIGIN: "https://api.example.com",
  TAXKIT_PUBLICATION_ORIGIN: "https://website.example.com",
  WEBSITE_PUBLIC_ORIGIN: "https://website.example.com",
});
describe("shared native host calculation admission", () => {
  it.effect.each([
    { allowed: false, mode: "edge", origin: "http://127.0.0.1:4214" },
    {
      allowed: false,
      mode: "local-emulator",
      origin: "https://api.example.com",
    },
    { allowed: false, mode: "private-canary", origin: "http://127.0.0.1:4214" },
    { allowed: true, mode: "local-emulator", origin: "http://127.0.0.1:4214" },
  ])(
    "local admission requires explicit emulator mode and a loopback origin",
    ({ origin, mode, allowed }) =>
      Effect.gen(function* () {
        const calls = yield* Ref.make(0);
        const app = yield* ApiWorkerInit.pipe(
          Effect.provideService(
            CalculatorAdmission,
            CalculatorAdmission.of({
              admitCalculation: Effect.fn(
                "CalculatorAdmission.admitCalculation"
              )(() => Ref.update(calls, (count) => count + 1)),
            })
          )
        );
        const body = yield* Schema.encodeEffect(
          Schema.fromJsonString(CalculatorRunRequest)
        )(CalculationRequest.payload);
        const response = yield* app.fetch.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(
              new Request(
                `${origin}/api/v1/calculators/au.pay.take-home/calculate`,
                {
                  body,
                  headers: { "content-type": "application/json" },
                  method: "POST",
                }
              )
            )
          )
        );
        expect(response.status).toBe(
          EffectBoolean.match(allowed, {
            onFalse: (): 503 => 503,
            onTrue: (): 200 => 200,
          })
        );
        expect(yield* Ref.get(calls)).toBe(
          EffectBoolean.match(allowed, {
            onFalse: (): 0 => 0,
            onTrue: (): 1 => 1,
          })
        );
      }).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            API_PUBLIC_ORIGIN: origin,
            CALCULATOR_HOST_MODE: mode,
            TAXKIT_PUBLICATION_ORIGIN: "https://website.example.com",
            WEBSITE_PUBLIC_ORIGIN: "https://website.example.com",
          })
        ),
        Effect.scoped
      )
  );
  it.effect.each([
    {},
    { "cf-connecting-ip": "private-canary" },
    { "x-forwarded-for": "203.0.113.75" },
    { "x-real-ip": "203.0.113.75" },
    { "cf-connecting-ip": "203.0.113.75", "cf-worker": "private-canary" },
  ])("rejects absent, invalid and forwarded public identity", (headers) =>
    Effect.gen(function* () {
      const incomingHeaders = Headers.fromInput(headers);
      const caller = edgeCallerKey(incomingHeaders, CalculatorClientRateKey);
      expect({
        caller,
        requestKey: yield* CalculatorRequestRateKey,
      }).toStrictEqual({
        caller: Option.none(),
        requestKey: Option.none(),
      });
    })
  );
  it.effect.each(["", "0", "-1", "01", "1.2", "private-canary"])(
    "rejects an invalid namespace without inventing an account value",
    (value) =>
      CalculatorAdmission.pipe(
        Effect.provide(
          ApiCalculatorAdmission.pipe(
            Layer.provide(
              Layer.succeed(
                RateLimit,
                RateLimit.of(() =>
                  Effect.die("Invalid namespace reached the native limiter")
                )
              )
            )
          )
        ),
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({ CALCULATOR_RATE_NAMESPACE: value })
        ),
        Effect.result,
        Effect.tap((result) =>
          Effect.sync(() => {
            EffectFunction.pipe(Result.isFailure(result), (actual) => {
              expect(actual).toBeTruthy();
            });
            if (Result.isFailure(result)) {
              EffectFunction.pipe(
                Predicate.isTagged(result.failure, "ConfigError"),
                (matches) => {
                  expect(matches).toBeTruthy();
                }
              );
            }
          })
        ),
        Effect.asVoid,
        Effect.scoped
      )
  );
  it.effect(
    "direct HTTP calculations from one caller share one checked allowance",
    () => {
      const proof = Effect.gen(function* () {
        const used = yield* Ref.make(
          HashMap.empty<CalculatorClientRateKey, number>()
        );
        const admission = CalculatorAdmission.of({
          admitCalculation: Effect.fn("CalculatorAdmission.admitCalculation")(
            (key) =>
              Ref.modify(used, (counts) => {
                const count = HashMap.get(counts, key).pipe(
                  Option.getOrElse(() => 0)
                );
                return [
                  count < 60,
                  HashMap.set(counts, key, count + 1),
                ] as const;
              }).pipe(
                Effect.flatMap((allowed) =>
                  EffectBoolean.match(allowed, {
                    onFalse: () => Effect.fail(new CalculatorRateLimited()),
                    onTrue: () => Effect.void,
                  })
                )
              )
          ),
        });
        const app = yield* ApiWorkerInit.pipe(
          Effect.provideService(CalculatorAdmission, admission)
        );
        const http: HttpClient.HttpClient = HttpClient.make((request) =>
          app.fetch.pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              HttpServerRequest.fromClientRequest(
                request.pipe(
                  HttpClientRequest.setHeader(
                    "cf-connecting-ip",
                    "203.0.113.75"
                  )
                )
              )
            ),
            Effect.map((response) =>
              HttpServerResponse.toClientResponse(response, { request })
            ),
            Effect.scoped
          )
        );
        const client = yield* HttpApiClient.makeWith(TaxKitApi, {
          baseUrl: "https://api.example.com",
          httpClient: http,
        });
        const calculate = client.calculatorApi.calculate({
          params: { calculatorId: CalculationRequest.calculatorId },
          payload: CalculationRequest.payload,
          query: CalculationQuery.make({}),
        });
        const first = yield* calculate;
        yield* Effect.forEach(Array.range(1, 57), () => calculate);
        const publicBody = yield* Schema.encodeEffect(
          Schema.fromJsonString(CalculatorRunRequest)
        )(CalculationRequest.payload);
        yield* calculate;
        // The sixtieth call uses the last place; the next one is refused.
        const last = yield* calculate;
        expect(last.report).toBeDefined();
        const rejected = yield* calculate.pipe(Effect.result);
        EffectFunction.pipe(Result.isFailure(rejected), (actual) => {
          expect(actual).toBeTruthy();
        });
        if (Result.isFailure(rejected)) {
          expect(rejected.failure).toStrictEqual({
            error: new CalculatorRateLimited(),
          });
        }
        const raw = yield* http.execute(
          HttpClientRequest.post(
            "https://api.example.com/api/v1/calculators/au.pay.take-home/calculate"
          ).pipe(HttpClientRequest.bodyText(publicBody, "application/json"))
        );
        expect({
          rawStatus: raw.status,
          HeadersGetRawHeadersRetryAfter: Headers.get(
            raw.headers,
            "retry-after"
          ),
          calculatorCount: (yield* client.calculatorApi.listCalculators({
            query: MetadataQuery.make({}),
          })).calculators.length,
        }).toStrictEqual({
          rawStatus: 429,
          HeadersGetRawHeadersRetryAfter: Option.some("60"),
          calculatorCount: 3,
        });
        expect(first.report).toBeDefined();
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.scoped
      );
      return proof;
    }
  );
  it.effect(
    "admits the direct edge key on the canonical HTTP calculation only",
    () =>
      Effect.gen(function* () {
        const keys = yield* Ref.make<readonly string[]>([]);
        const app = yield* ApiWorkerInit.pipe(
          Effect.provideService(
            CalculatorAdmission,
            CalculatorAdmission.of({
              admitCalculation: Effect.fn(
                "CalculatorAdmission.admitCalculation"
              )((key) =>
                Ref.update(keys, (seen) => [
                  ...seen,
                  EffectFunction.pipe(Redacted.value(key), String),
                ])
              ),
            })
          )
        );
        const body = yield* Schema.encodeEffect(
          Schema.fromJsonString(CalculatorRunRequest)
        )(CalculationRequest.payload);
        const direct = {
          "cf-connecting-ip": "203.0.113.75",
          "content-type": "application/json",
        };
        const call = (
          path: string,
          method: string,
          payload: string,
          relayed = false
        ) =>
          app.fetch.pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              HttpServerRequest.fromWeb(
                new Request(`https://api.example.com${path}`, {
                  body: Match.value(method).pipe(
                    Match.when("POST", () => payload),
                    Match.orElse(() => null)
                  ),
                  headers: EffectBoolean.match(relayed, {
                    onFalse: () => direct,
                    onTrue: () => ({
                      ...direct,
                      "cf-worker": "website.example.com",
                    }),
                  }),
                  method,
                })
              )
            ),
            Effect.map(HttpServerResponse.toWeb)
          );
        const accepted = yield* call(
          "/api/v1/calculators/au.pay.take-home/calculate",
          "POST",
          body
        );
        expect({
          acceptedStatus: accepted.status,
          RefGetKeys: yield* Ref.get(keys),
        }).toStrictEqual({
          acceptedStatus: 200,
          RefGetKeys: ["203.0.113.75"],
        });
        // An error reply keeps its real status instead of a rebuilt 200.
        const rejected = yield* call(
          "/api/v1/calculators/au.pay.take-home/calculate",
          "POST",
          "{}"
        );
        expect(rejected.status).toBe(400);
        const text = yield* Effect.promise(() => rejected.text());
        expect(text).not.toContain("203.0.113.75");
        yield* EffectFunction.pipe(
          [
            ["/api/v1/calculators/au.pay.take-home/calculate", "GET", 404],
            ["/api/v1/calculators/not-a-calculator/calculate", "POST", 400],
            ["/api/v1/calculators/au.pay.take-home/calculate/x", "POST", 404],
            ["/api/v1/calculators", "POST", 404],
          ] as const,
          Effect.forEach(([path, method, status]) =>
            call(path, method, body).pipe(
              Effect.tap((response) =>
                Effect.sync(() => {
                  expect(response.status).toBe(status);
                })
              )
            )
          )
        );
        expect(yield* Ref.get(keys)).toHaveLength(1);
        // A Worker subrequest cannot borrow the edge address it carries.
        const relayed = yield* call(
          "/api/v1/calculators/au.pay.take-home/calculate",
          "POST",
          body,
          true
        );
        expect({
          relayedStatus: relayed.status,
          rateKeyCount: (yield* Ref.get(keys)).length,
        }).toStrictEqual({
          relayedStatus: 503,
          rateKeyCount: 1,
        });
        yield* Effect.gen(function* verifyRateLimitedResponse() {
          // A declared 4xx keeps its status, headers and checked body.
          const limited = yield* ApiWorkerInit.pipe(
            Effect.provideService(
              CalculatorAdmission,
              CalculatorAdmission.of({
                admitCalculation: Effect.fn(
                  "CalculatorAdmission.admitCalculation"
                )(() => Effect.fail(new CalculatorRateLimited())),
              })
            )
          );
          const reply = yield* limited.fetch.pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              HttpServerRequest.fromWeb(
                new Request(
                  "https://api.example.com/api/v1/calculators/au.pay.take-home/calculate",
                  {
                    body,
                    headers: {
                      "cf-connecting-ip": "203.0.113.75",
                      "content-type": "application/json",
                    },
                    method: "POST",
                  }
                )
              )
            ),
            Effect.map(HttpServerResponse.toWeb)
          );
          expect({
            replyStatus: reply.status,
            replyHeadersGetRetryAfter: reply.headers.get("retry-after"),
          }).toStrictEqual({
            replyStatus: 429,
            replyHeadersGetRetryAfter: "60",
          });
          expect(yield* Effect.promise(() => reply.text())).toContain(
            "CalculatorRateLimited"
          );
        }).pipe(Effect.withSpan("verifyRateLimitedResponse"));
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.scoped
      )
  );
});
