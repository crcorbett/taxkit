import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import {
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  HealthResponse,
} from "@taxkit/api-http";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { MetadataQuery } from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { CalculationEngineLive } from "@taxkit/core";
import { Money, Cents } from "@taxkit/core/primitives";
import {
  AuPayCalculatorId,
  AuPayJurisdiction,
  AuPayTaxYear,
  GrossPay,
} from "@taxkit/rules-au-pay";
import {
  Cause,
  ConfigProvider,
  Deferred,
  Duration,
  Effect,
  Exit,
  Fiber,
  FileSystem,
  Layer,
  Match,
  Option,
  PlatformError,
  Ref,
  Result,
  Schema,
  Sink,
  Stream,
} from "effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientError from "effect/http/HttpClientError";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import { ChildProcessSpawner } from "effect/process";
import { TestClock } from "effect/testing";

import {
  checkApiCalculation,
  checkApiCatalog,
  checkApiOpenApi,
  waitForApiHealth,
} from "./routes.js";
import {
  ApiSmokeConsumerEvidence,
  ApiSmokeOpenApiProjection,
  ApiSmokeSettings,
  ApiSmokeValidationError,
} from "./schemas.js";
import {
  checkApiPublicRoutes,
  loadApiSmokeSettings,
} from "./smoke-public-routes.runtime.js";

const origin = "http://127.0.0.1:4173";
const fault = PlatformError.badArgument({
  description: "TAXKIT_SECRET_SENTINEL",
  method: "controlled-fixture",
  module: "FileSystem",
});
const routeEvidence = [
  "GET /api/health",
  "GET /api/v1/calculators",
  "POST /api/v1/calculators/au.pay.take-home/calculate",
  "POST /api/v1/calculators/au.income-tax.annual/calculate",
  "GET /api/docs/openapi.json",
];
const settings = ApiSmokeSettings.make({
  port: 4173,
  simulateDownstreamFailure: false,
});

const successfulHttpClient = Effect.gen(function* () {
  const service = yield* PublicCalculatorService;
  const catalog = yield* service.listCalculators(MetadataQuery.make({}));
  const calculation = yield* service.calculate({
    calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
    help: Option.none(),
    payload: {
      facts: {
        grossPay: new GrossPay({
          amount: new Money({ cents: Cents.make(346_200), currency: "AUD" }),
          period: "fortnightly",
        }),
        taxFreeThresholdClaimed: true,
      },
      jurisdiction: Option.some(Option.some(AuPayJurisdiction.make("AU"))),
      taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
    },
  });
  const healthJson = yield* Schema.encodeEffect(
    Schema.fromJsonString(HealthResponse)
  )({ service: "taxkit", status: "ok" });
  const catalogJson = yield* Schema.encodeEffect(
    Schema.fromJsonString(CalculatorCatalogResponse)
  )(catalog);
  const calculationJson = yield* Schema.encodeEffect(
    Schema.fromJsonString(CalculatorRunResponse)
  )(calculation);
  const openApiJson = yield* Schema.encodeEffect(
    Schema.fromJsonString(ApiSmokeOpenApiProjection)
  )({
    openapi: "3.1.0",
    paths: { "/api/v1/calculators/{calculatorId}/calculate": {} },
  });
  return HttpClient.make((request, url) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(
          Match.value(url.pathname).pipe(
            Match.when("/api/health", () => healthJson),
            Match.when("/api/v1/calculators", () => catalogJson),
            Match.when("/api/docs/openapi.json", () => openApiJson),
            Match.orElse(() => calculationJson)
          ),
          { headers: { "content-type": "application/json" } }
        )
      )
    )
  );
}).pipe(
  Effect.provide(
    PublicCalculatorServiceLive.pipe(Layer.provide(CalculationEngineLive))
  )
);

it.effect.each([
  { args: [], env: {}, expected: settings },
  {
    args: ["--simulate-downstream-failure"],
    env: { TAXKIT_API_SMOKE_PORT: "5000" },
    expected: ApiSmokeSettings.make({
      port: 5000,
      simulateDownstreamFailure: true,
    }),
  },
])("loads smoke settings %j", ({ args, env, expected }) =>
  Effect.gen(function* () {
    const value = yield* loadApiSmokeSettings(args).pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromUnknown(env)
      )
    );
    expect(value).toEqual(expected);
  })
);
it.effect.each([
  { args: ["TAXKIT_SECRET_SENTINEL"], env: {} },
  { args: [], env: { TAXKIT_API_SMOKE_PORT: "0" } },
  { args: [], env: { TAXKIT_API_SMOKE_PORT: "TAXKIT_SECRET_SENTINEL" } },
])("rejects unchecked smoke input %j", ({ args, env }) =>
  Effect.gen(function* () {
    const result = yield* loadApiSmokeSettings(args).pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromUnknown(env)
      ),
      Effect.result
    );
    expect(result).toEqual(
      Result.fail(
        new ApiSmokeValidationError({
          message: "Invalid API smoke settings or arguments.",
        })
      )
    );
  })
);

it.effect("rejects an OpenAPI document with its calculate path removed", () =>
  Effect.gen(function* () {
    const client = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response('{"openapi":"3.1.0","paths":{}}')
        )
      )
    );
    const result = yield* checkApiOpenApi(origin).pipe(
      Effect.provideService(HttpClient.HttpClient, client),
      Effect.result
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.message).toBe(
        "OpenAPI document did not include the calculate route."
      );
    }
  })
);

it.effect.each([
  { duration: Duration.seconds(15), route: "health" },
  { duration: Duration.seconds(5), route: "catalog" },
  { duration: Duration.seconds(5), route: "calculate" },
  { duration: Duration.seconds(5), route: "openapi" },
])(
  "bounds stalled headers and closes the request: $route",
  ({ route, duration }) =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const closed = yield* Ref.make(false);
      const client = HttpClient.make(() =>
        Deferred.succeed(started, true).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Ref.set(closed, true))
        )
      );
      const operation = Match.value(route).pipe(
        Match.when("health", () => waitForApiHealth(origin)),
        Match.when("catalog", () => checkApiCatalog(origin)),
        Match.when("calculate", () => checkApiCalculation(origin)),
        Match.orElse(() => checkApiOpenApi(origin))
      );
      const fiber = yield* operation.pipe(
        Effect.provideService(HttpClient.HttpClient, client),
        Effect.result,
        Effect.forkChild
      );
      yield* Deferred.await(started);
      yield* TestClock.adjust(duration);
      const result = yield* Fiber.join(fiber);
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure).toMatchObject({ reason: "timeout", route });
      }
      expect(yield* Ref.get(closed)).toBe(true);
    })
);

it.effect.each(["health", "catalog", "calculate", "openapi"])(
  "bounds a stalled response body for %s",
  (route) =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const closed = yield* Ref.make(false);
      const client = HttpClient.make((request) => {
        const response = HttpClientResponse.fromWeb(
          request,
          new Response("{}")
        );
        return Effect.succeed({
          ...response,
          json: Deferred.succeed(started, true).pipe(
            Effect.andThen(Effect.never),
            Effect.ensuring(Ref.set(closed, true))
          ),
          status: response.status,
        });
      });
      const operation = Match.value(route).pipe(
        Match.when("health", () => waitForApiHealth(origin)),
        Match.when("catalog", () => checkApiCatalog(origin)),
        Match.when("calculate", () => checkApiCalculation(origin)),
        Match.orElse(() => checkApiOpenApi(origin))
      );
      const fiber = yield* operation.pipe(
        Effect.provideService(HttpClient.HttpClient, client),
        Effect.result,
        Effect.forkChild
      );
      yield* Deferred.await(started);
      yield* TestClock.adjust(route === "health" ? "15 seconds" : "5 seconds");
      const result = yield* Fiber.join(fiber);
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure).toMatchObject({ reason: "timeout", route });
      }
      expect(yield* Ref.get(closed)).toBe(true);
    })
);

it.effect.each([
  "start",
  "stdout",
  "stderr",
  "exit-read",
  "nonzero",
  "output-limit",
  "evidence",
  "write",
  "cleanup",
  "nonzero-and-cleanup",
  "success",
])(
  "closes both child processes and reports the external consumer outcome: %s",
  (mode) =>
    Effect.gen(function* () {
      const http = yield* successfulHttpClient;
      const calls = yield* Ref.make(0);
      const closed = yield* Ref.make(0);
      const removed = yield* Ref.make(0);
      const evidence = yield* Schema.encodeEffect(
        Schema.fromJsonString(ApiSmokeConsumerEvidence)
      )({ origin, routeEvidence });
      const spawner = ChildProcessSpawner.make(() =>
        Effect.gen(function* () {
          const call = yield* Ref.getAndUpdate(calls, (n) => n + 1);
          if (call === 1 && mode === "start") {
            return yield* Effect.fail(fault);
          }
          const handle = ChildProcessSpawner.makeHandle({
            all: Stream.empty,
            exitCode:
              call === 1 && mode === "exit-read"
                ? Effect.fail(fault)
                : Effect.succeed(
                    ChildProcessSpawner.ExitCode(
                      call === 1 &&
                        (mode === "nonzero" || mode === "nonzero-and-cleanup")
                        ? 1
                        : 0
                    )
                  ),
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
            isRunning: Effect.succeed(false),
            kill: () => Effect.void,
            pid: ChildProcessSpawner.ProcessId(1),
            stderr:
              call === 1 && mode === "stderr"
                ? Stream.fail(fault)
                : Stream.empty,
            stdin: Sink.drain,
            stdout:
              call === 1 && mode === "stdout"
                ? Stream.fail(fault)
                : Stream.make(
                    new TextEncoder().encode(
                      Match.value(mode).pipe(
                        Match.when("output-limit", () => "x".repeat(1_048_577)),
                        Match.when("evidence", () => "TAXKIT_SECRET_SENTINEL"),
                        Match.orElse(() => evidence)
                      )
                    )
                  ),
            unref: Effect.succeed(Effect.void),
          });
          return yield* Effect.acquireRelease(Effect.succeed(handle), () =>
            Ref.update(closed, (n) => n + 1)
          );
        })
      );
      const fs = FileSystem.layerNoop({
        makeTempDirectory: () => Effect.succeed("/fixture/api-consumer"),
        remove: () =>
          Ref.update(removed, (n) => n + 1).pipe(
            Effect.andThen(
              mode === "cleanup" || mode === "nonzero-and-cleanup"
                ? Effect.fail(fault)
                : Effect.void
            )
          ),
        writeFileString: () =>
          mode === "write" ? Effect.fail(fault) : Effect.void,
      });
      const exit = yield* checkApiPublicRoutes(settings).pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provide(Layer.merge(BunServices.layer, fs)),
        Effect.exit
      );
      expect(Exit.isSuccess(exit)).toBe(mode === "success");
      expect(yield* Ref.get(closed)).toBe(
        mode === "start" || mode === "write" ? 1 : 2
      );
      expect(yield* Ref.get(removed)).toBe(1);
      if (Exit.isFailure(exit)) {
        const errors = Cause.pretty(exit.cause);
        expect(errors).not.toContain("TAXKIT_SECRET_SENTINEL");
        if (mode === "cleanup" || mode === "nonzero-and-cleanup") {
          expect(errors).toContain(
            "Failed to remove the external HTTP consumer workspace."
          );
        }
        if (mode === "nonzero-and-cleanup") {
          expect(errors).toContain("ApiSmokeConsumerError");
        }
      }
    })
);

it.effect.each(["catalog", "calculate", "openapi"])(
  "bounds failed HTTP transport and rejects invalid responses: %s",
  (route) =>
    Effect.gen(function* () {
      const operation = Match.value(route).pipe(
        Match.when("catalog", () => checkApiCatalog(origin)),
        Match.when("calculate", () => checkApiCalculation(origin)),
        Match.orElse(() => checkApiOpenApi(origin))
      );
      yield* Effect.forEach(["transport", "status", "json", "schema"], (mode) =>
        Effect.gen(function* () {
          const client = HttpClient.make((request) =>
            mode === "transport"
              ? Effect.fail(
                  new HttpClientError.HttpClientError({
                    reason: new HttpClientError.TransportError({
                      cause: fault,
                      request,
                    }),
                  })
                )
              : Effect.succeed(
                  HttpClientResponse.fromWeb(
                    request,
                    new Response(
                      mode === "json" ? "TAXKIT_SECRET_SENTINEL" : "{}",
                      { status: mode === "status" ? 503 : 200 }
                    )
                  )
                )
          );
          const result = yield* operation.pipe(
            Effect.provideService(HttpClient.HttpClient, client),
            Effect.result
          );
          expect(Result.isFailure(result)).toBe(true);
          if (Result.isFailure(result)) {
            expect(result.failure).toMatchObject({
              reason: "request-or-response",
              route,
            });
          }
        })
      );
    })
);

it.effect(
  "safely reports an API process start failure before creating a workspace",
  () =>
    Effect.gen(function* () {
      const removed = yield* Ref.make(0);
      const spawner = ChildProcessSpawner.make(() => Effect.fail(fault));
      const exit = yield* checkApiPublicRoutes(settings).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provideService(
          HttpClient.HttpClient,
          yield* successfulHttpClient
        ),
        Effect.provide(
          Layer.merge(
            BunServices.layer,
            FileSystem.layerNoop({
              remove: () => Ref.update(removed, (n) => n + 1),
            })
          )
        ),
        Effect.exit
      );
      expect(Exit.isFailure(exit)).toBe(true);
      expect(yield* Ref.get(removed)).toBe(0);
      if (Exit.isFailure(exit)) {
        expect(Cause.pretty(exit.cause)).toContain(
          "Failed to start the API smoke process."
        );
      }
    })
);

it.effect.each(["interrupt", "timeout"])(
  "stops a stalled consumer and API and removes its workspace: %s",
  (mode) =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const calls = yield* Ref.make(0);
      const closed = yield* Ref.make(0);
      const removed = yield* Ref.make(0);
      const spawner = ChildProcessSpawner.make(() =>
        Effect.gen(function* () {
          const call = yield* Ref.getAndUpdate(calls, (n) => n + 1);
          return yield* Effect.acquireRelease(
            Effect.succeed(
              ChildProcessSpawner.makeHandle({
                all: Stream.empty,
                exitCode:
                  call === 1
                    ? Deferred.succeed(started, true).pipe(
                        Effect.andThen(Effect.never)
                      )
                    : Effect.succeed(ChildProcessSpawner.ExitCode(0)),
                getInputFd: () => Sink.drain,
                getOutputFd: () => Stream.empty,
                isRunning: Effect.succeed(true),
                kill: () => Effect.void,
                pid: ChildProcessSpawner.ProcessId(1),
                stderr: Stream.empty,
                stdin: Sink.drain,
                stdout: Stream.empty,
                unref: Effect.succeed(Effect.void),
              })
            ),
            () => Ref.update(closed, (n) => n + 1)
          );
        })
      );
      const fiber = yield* checkApiPublicRoutes(settings).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provideService(
          HttpClient.HttpClient,
          yield* successfulHttpClient
        ),
        Effect.provide(
          Layer.merge(
            BunServices.layer,
            FileSystem.layerNoop({
              makeTempDirectory: () => Effect.succeed("/fixture/api-consumer"),
              remove: () => Ref.update(removed, (n) => n + 1),
              writeFileString: () => Effect.void,
            })
          )
        ),
        Effect.forkChild
      );
      yield* Deferred.await(started);
      yield* mode === "interrupt"
        ? Fiber.interrupt(fiber)
        : TestClock.adjust("30 seconds");
      const exit = yield* Fiber.await(fiber);
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && mode === "timeout") {
        expect(Cause.findErrorOption(exit.cause)).toMatchObject({
          value: { reason: "timeout" },
        });
      }
      expect(yield* Ref.get(closed)).toBe(2);
      expect(yield* Ref.get(removed)).toBe(1);
    })
);
