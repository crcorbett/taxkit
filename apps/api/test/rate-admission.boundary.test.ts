import { describe, expect, it } from "@effect/vitest";
import { createTaxKitApiClient } from "@taxkit/api-http/client";
import type { CalculatorClientRateKey } from "@taxkit/api-rpc/rate-identity";
import {
  CalculatorRequestRateKey,
  calculatorEdgeRateKey,
} from "@taxkit/api-rpc/rate-identity";
import {
  CalculatorRpcPayload,
  CalculatorRpcVersion,
  MetadataQuery,
} from "@taxkit/api-rpc/schemas";
import { CalculationRequest } from "@taxkit/api-rpc/testing/fixtures";
import { CalculatorAdmission } from "@taxkit/calculators/admission.service";
import {
  CalculatorRateLimited,
  CalculationQuery,
} from "@taxkit/calculators/schemas";
import { RateLimit } from "alchemy/Cloudflare/Workers";
import {
  Array,
  ConfigProvider,
  Effect,
  HashMap,
  Layer,
  Option,
  Ref,
  Result,
  Schema,
} from "effect";
import {
  Headers,
  HttpClient,
  HttpClientRequest,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { ApiCalculatorAdmission } from "../src/worker-admission.layer.js";
import { ApiWorkerInit } from "../src/worker.js";

const Frame = Schema.TaggedStruct("Request", {
  headers: Schema.Array(Schema.Tuple([Schema.String, Schema.String])),
  id: Schema.String,
  payload: CalculatorRpcPayload,
  tag: Schema.Literal("Calculate"),
});
const Json = Schema.fromJsonString(Schema.Unknown);
const settings = ConfigProvider.fromUnknown({
  API_PUBLIC_ORIGIN: "https://api.example.com",
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
              admitCalculation: () => Ref.update(calls, (count) => count + 1),
            })
          )
        );
        const body = yield* Schema.encodeEffect(
          Schema.fromJsonString(
            CalculatorRpcPayload.fields.request.fields.payload
          )
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
        expect(response.status).toBe(allowed ? 200 : 503);
        expect(yield* Ref.get(calls)).toBe(allowed ? 1 : 0);
      }).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            API_PUBLIC_ORIGIN: origin,
            CALCULATOR_HOST_MODE: mode,
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
      expect(
        Option.isNone(calculatorEdgeRateKey(Headers.fromInput(headers)))
      ).toBe(true);
      expect(yield* CalculatorRequestRateKey).toEqual(Option.none());
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
            expect(Result.isFailure(result)).toBe(true);
            if (Result.isFailure(result)) {
              expect(result.failure._tag).toBe("ConfigError");
            }
          })
        ),
        Effect.asVoid,
        Effect.scoped
      )
  );

  it.effect(
    "HTTP, private calls and batch members share one checked allowance",
    () =>
      Effect.gen(function* () {
        const used = yield* Ref.make(
          HashMap.empty<CalculatorClientRateKey, number>()
        );
        const admission = CalculatorAdmission.of({
          admitCalculation: (key) =>
            Ref.modify(used, (counts) => {
              const count = HashMap.get(counts, key).pipe(
                Option.getOrElse(() => 0)
              );
              return [count < 60, HashMap.set(counts, key, count + 1)] as const;
            }).pipe(
              Effect.flatMap((allowed) =>
                allowed ? Effect.void : Effect.fail(new CalculatorRateLimited())
              )
            ),
        });
        const app = yield* ApiWorkerInit.pipe(
          Effect.provideService(CalculatorAdmission, admission)
        );
        const http = HttpClient.make((request) =>
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
        const client = yield* createTaxKitApiClient({
          baseUrl: "https://api.example.com",
        }).pipe(Effect.provideService(HttpClient.HttpClient, http));
        const calculate = client.calculatorApi.calculate({
          params: { calculatorId: CalculationRequest.calculatorId },
          payload: CalculationRequest.payload,
          query: CalculationQuery.make({}),
        });
        const first = yield* calculate;
        yield* Effect.forEach(Array.range(1, 58), () => calculate);
        const batch = yield* Effect.forEach(Array.range(1, 3), (id) =>
          Schema.encodeEffect(Frame)(
            Frame.make({
              headers: [],
              id: String(id),
              payload: {
                request: CalculationRequest,
                version: CalculatorRpcVersion,
              },
              tag: "Calculate",
            })
          )
        );
        const body = yield* Schema.encodeEffect(Json)(batch);
        const reply = yield* app.calculatorRequest(
          new Request("https://api.example.com/rpc", {
            body,
            headers: {
              "cf-connecting-ip": "198.51.100.99",
              "content-type": "application/json",
            },
            method: "POST",
          }),
          "203.0.113.75"
        );
        const text = yield* Effect.promise(() => reply.text());
        expect(reply.status).toBe(200);
        expect(text.match(/CalculatorRateLimited/gu)?.length).toBe(2);
        expect(text).toContain('"Success"');
        expect(text).not.toContain("203.0.113.75");
        expect(text).not.toContain("198.51.100.99");
        const rejected = yield* calculate.pipe(Effect.result);
        expect(Result.isFailure(rejected)).toBe(true);
        if (Result.isFailure(rejected)) {
          expect(rejected.failure).toEqual({
            error: new CalculatorRateLimited(),
          });
        }
        const publicBody = yield* Schema.encodeEffect(
          Schema.fromJsonString(
            CalculatorRpcPayload.fields.request.fields.payload
          )
        )(CalculationRequest.payload);
        const raw = yield* http.execute(
          HttpClientRequest.post(
            "https://api.example.com/api/v1/calculators/au.pay.take-home/calculate"
          ).pipe(HttpClientRequest.bodyText(publicBody, "application/json"))
        );
        expect(raw.status).toBe(429);
        expect(Headers.get(raw.headers, "retry-after")).toEqual(
          Option.some("60")
        );
        expect(
          (yield* client.calculatorApi.listCalculators({
            query: MetadataQuery.make({}),
          })).calculators.length
        ).toBe(3);
        expect(first.report).toBeDefined();
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.scoped
      )
  );
});
