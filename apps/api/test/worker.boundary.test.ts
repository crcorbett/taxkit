import { describe, expect, it } from "@effect/vitest";
import {
  CalculatorRpcPayload,
  CalculatorRpcVersion,
} from "@taxkit/api-rpc/schemas";
import {
  CalculationRequest,
  CalculatorFixture,
  CalculatorLive,
  sensitiveSentinel,
} from "@taxkit/api-rpc/testing/fixtures";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import {
  Array,
  ConfigProvider,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Ref,
  References,
  Schema,
  Scope,
  Stream,
} from "effect";
import {
  Headers,
  HttpClient,
  HttpClientRequest,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { TestClock, TestConsole } from "effect/testing";

import { ApiSafeTelemetryLive } from "../src/worker-telemetry.layer.js";
import { ApiWorkerApplication } from "../src/worker.application.js";
import { ApiWorkerSettingsConfig } from "../src/worker.config.js";
import { ApiWorkerInit } from "../src/worker.js";

const settings = ConfigProvider.fromUnknown({
  API_PUBLIC_ORIGIN: "https://api.example.com",
  WEBSITE_PUBLIC_ORIGIN: "https://website.example.com",
});
const Json = Schema.fromJsonString(Schema.Unknown);
const NativeRequest = Schema.TaggedStruct("Request", {
  headers: Schema.Array(Schema.Tuple([Schema.String, Schema.String])),
  id: Schema.String,
  payload: CalculatorRpcPayload,
  tag: Schema.Literal("Calculate"),
});

describe("native API application", () => {
  it.effect("defers address reads during construction and decodes once", () =>
    Effect.gen(function* () {
      const reads = yield* Ref.make(0);
      const provider = ConfigProvider.make((path) =>
        settings
          .load(path)
          .pipe(Effect.tap(() => Ref.update(reads, (count) => count + 1)))
      );
      const app = yield* ApiWorkerInit.pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, provider)
      );
      expect(yield* Ref.get(reads)).toBe(0);
      const request = HttpServerRequest.fromWeb(
        new Request("https://api.example.com/api/health")
      );
      const first = yield* app.fetch.pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, provider),
        Effect.provideService(HttpServerRequest.HttpServerRequest, request),
        Effect.scoped
      );
      expect(first.status).toBe(200);
      const afterFirst = yield* Ref.get(reads);
      expect(afterFirst).toBeGreaterThan(0);
      const second = yield* app.fetch.pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, provider),
        Effect.provideService(HttpServerRequest.HttpServerRequest, request),
        Effect.scoped
      );
      expect(second.status).toBe(200);
      expect(yield* Ref.get(reads)).toBe(afterFirst);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "serves a checked unavailable response when bound origins are absent",
    () =>
      Effect.gen(function* () {
        const app = yield* ApiWorkerInit;
        const response = yield* app.fetch.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(
              new Request("https://api.example.com/api/health")
            )
          ),
          Effect.scoped
        );
        expect(response.status).toBe(503);
        expect(
          yield* Effect.promise(() => HttpServerResponse.toWeb(response).text())
        ).toBe("");
      }).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({})
        ),
        Effect.scoped
      )
  );

  it.effect(
    "returns safe global protocol errors with no native console output",
    () =>
      Effect.gen(function* () {
        const app = yield* ApiWorkerInit;
        const request = NativeRequest.make({
          headers: [],
          id: "1",
          payload: {
            request: CalculationRequest,
            version: CalculatorRpcVersion,
          },
          tag: "Calculate",
        });
        const wrongTag = yield* Schema.encodeEffect(Json)({
          ...request,
          tag: sensitiveSentinel,
        });
        const wrongId = yield* Schema.encodeEffect(Json)({
          ...request,
          id: sensitiveSentinel,
        });
        yield* Effect.forEach(["{", wrongTag, wrongId], (body) =>
          app.fetch.pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              HttpServerRequest.fromWeb(
                new Request("https://api.example.com/rpc", {
                  body,
                  headers: { "content-type": "application/json" },
                  method: "POST",
                })
              )
            ),
            Effect.flatMap((response) =>
              Effect.promise(() => HttpServerResponse.toWeb(response).text())
            ),
            Effect.tap((text) =>
              Effect.sync(() => {
                expect(text).toContain("Calculation service failed");
                expect(text).not.toContain(sensitiveSentinel);
                expect(text).not.toContain("stack");
              })
            ),
            Effect.scoped
          )
        );
        // These native parser failures send fixed global replies without logging.
        // The separate reporter/formatter fixtures exercise positive log egress.
        expect(yield* TestConsole.logLines).toEqual([]);
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.provideService(References.MinimumLogLevel, "Debug"),
        Effect.provide(TestConsole.layer),
        Effect.scoped
      )
  );

  it.effect("closes a stalled body at its total read deadline", () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const released = yield* Ref.make(false);
      const app = yield* ApiWorkerInit;
      const body = Stream.fromEffect(
        Deferred.succeed(started, true).pipe(Effect.andThen(Effect.never))
      ).pipe(Stream.ensuring(Ref.set(released, true)));
      const request = HttpServerRequest.fromClientRequest(
        HttpClientRequest.post("https://api.example.com/rpc").pipe(
          HttpClientRequest.bodyStream(body, {
            contentType: "application/json",
          })
        )
      );
      const fibre = yield* app.fetch.pipe(
        Effect.provideService(HttpServerRequest.HttpServerRequest, request),
        Effect.scoped,
        Effect.forkChild
      );
      yield* Deferred.await(started);
      yield* TestClock.adjust("5 seconds");
      expect((yield* Fiber.join(fibre)).status).toBe(408);
      expect(yield* Ref.get(released)).toBe(true);
      const next = yield* app.fetch.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request("https://api.example.com/api/health")
          )
        ),
        Effect.scoped
      );
      expect(next.status).toBe(200);
    }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, settings),
      Effect.scoped
    )
  );

  it.effect("preserves earlier body cancellation and closes the source", () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const released = yield* Ref.make(false);
      const app = yield* ApiWorkerInit;
      const body = Stream.fromEffect(
        Deferred.succeed(started, true).pipe(Effect.andThen(Effect.never))
      ).pipe(Stream.ensuring(Ref.set(released, true)));
      const fibre = yield* app.fetch.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromClientRequest(
            HttpClientRequest.post("https://api.example.com/rpc").pipe(
              HttpClientRequest.bodyStream(body, {
                contentType: "application/json",
              })
            )
          )
        ),
        Effect.scoped,
        Effect.forkChild
      );
      yield* Deferred.await(started);
      yield* Fiber.interrupt(fibre);
      const exit = yield* Fiber.await(fibre);
      expect(Exit.isFailure(exit)).toBe(true);
      expect(Exit.hasInterrupts(exit)).toBe(true);
      expect(yield* Ref.get(released)).toBe(true);
    }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, settings),
      Effect.scoped
    )
  );

  it.effect("checks each preflight origin with the native predicate", () =>
    Effect.gen(function* () {
      const app = yield* ApiWorkerInit;
      const matching = yield* app.fetch.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request("https://api.example.com/rpc", {
              headers: {
                "access-control-request-headers": "content-type",
                "access-control-request-method": "POST",
                origin: "https://website.example.com",
              },
              method: "OPTIONS",
            })
          )
        ),
        Effect.scoped
      );
      const other = yield* app.fetch.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request("https://api.example.com/rpc", {
              headers: {
                "access-control-request-headers": "content-type",
                "access-control-request-method": "POST",
                origin: "https://other.example.com",
              },
              method: "OPTIONS",
            })
          )
        ),
        Effect.scoped
      );
      expect(matching.status).toBe(204);
      expect(
        Headers.get(matching.headers, "access-control-allow-origin").pipe(
          Option.getOrUndefined
        )
      ).toBe("https://website.example.com");
      expect(
        Headers.get(matching.headers, "access-control-allow-headers").pipe(
          Option.getOrUndefined
        )
      ).toBe("content-type");
      expect(
        Headers.get(matching.headers, "access-control-allow-credentials").pipe(
          Option.getOrUndefined
        )
      ).toBeUndefined();
      expect(other.status).toBe(204);
      expect(
        Headers.get(other.headers, "access-control-allow-origin").pipe(
          Option.getOrUndefined
        )
      ).toBeUndefined();
    }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, settings),
      Effect.scoped
    )
  );

  it.effect(
    "stops reading an oversized native body and releases its source",
    () =>
      Effect.gen(function* () {
        const released = yield* Ref.make(false);
        const tailRead = yield* Ref.make(false);
        const app = yield* ApiWorkerInit;
        const body = Stream.succeed(new Uint8Array(1024 * 1024 + 1)).pipe(
          Stream.concat(
            Stream.fromEffect(
              Ref.set(tailRead, true).pipe(Effect.as(new Uint8Array([1])))
            )
          ),
          Stream.ensuring(Ref.set(released, true))
        );
        const response = yield* app.fetch.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromClientRequest(
              HttpClientRequest.post("https://api.example.com/rpc").pipe(
                HttpClientRequest.bodyStream(body, {
                  contentType: "application/json",
                })
              )
            )
          ),
          Effect.scoped
        );
        expect(response.status).toBe(413);
        expect(yield* Ref.get(tailRead)).toBe(false);
        expect(yield* Ref.get(released)).toBe(true);
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.scoped
      )
  );

  it.effect("shares one supplied operation across HTTP and native RPC", () =>
    Effect.gen(function* () {
      const calls = yield* Ref.make(0);
      const constructions = yield* Ref.make(0);
      const releases = yield* Ref.make(0);
      const incomingPaths = yield* Ref.make<readonly string[]>([]);
      const calculator = Layer.effect(
        PublicCalculatorService,
        Effect.gen(function* () {
          yield* Ref.update(constructions, (count) => count + 1);
          const live = yield* PublicCalculatorService;
          return PublicCalculatorService.of({
            ...live,
            calculate: (request) =>
              Effect.gen(function* () {
                yield* Ref.update(calls, (count) => count + 1);
                const incoming = yield* Effect.serviceOption(
                  HttpServerRequest.HttpServerRequest
                );
                yield* incoming.pipe(
                  Option.match({
                    onNone: () => Effect.die("Incoming request is missing"),
                    onSome: ({ url }) =>
                      Ref.update(incomingPaths, Array.append(url)),
                  })
                );
                const scope = yield* Effect.serviceOption(Scope.Scope);
                yield* scope.pipe(
                  Option.match({
                    onNone: () =>
                      Effect.die("Incoming request scope is missing"),
                    onSome: (requestScope) =>
                      Scope.addFinalizer(
                        requestScope,
                        Ref.update(releases, (count) => count + 1)
                      ),
                  })
                );
                return yield* live.calculate(request);
              }),
          });
        })
      ).pipe(Layer.provide(CalculatorLive));
      const app = yield* ApiWorkerApplication.pipe(Effect.provide(calculator));
      const transport = HttpClient.make((request) =>
        app.fetch.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromClientRequest(request)
          ),
          Effect.map((response) =>
            HttpServerResponse.toClientResponse(response, { request })
          ),
          Effect.scoped
        )
      );
      const httpBody = yield* Schema.encodeEffect(Json)(
        CalculationRequest.payload
      );
      const rpcBody = yield* Schema.encodeEffect(Json)(
        NativeRequest.make({
          headers: [],
          id: "1",
          payload: {
            request: CalculationRequest,
            version: CalculatorRpcVersion,
          },
          tag: "Calculate",
        })
      );
      const http = yield* transport.execute(
        HttpClientRequest.post(
          "https://api.example.com/api/v1/calculators/au.pay.take-home/calculate"
        ).pipe(HttpClientRequest.bodyText(httpBody, "application/json"))
      );
      const rpc = yield* transport.execute(
        HttpClientRequest.post("https://api.example.com/rpc").pipe(
          HttpClientRequest.bodyText(rpcBody, "application/json")
        )
      );
      expect(http.status).toBe(200);
      expect(rpc.status).toBe(200);
      expect(yield* http.text).toContain('"netPay"');
      expect(yield* rpc.text).toContain('"netPay"');
      expect(yield* Ref.get(calls)).toBe(2);
      expect(yield* Ref.get(constructions)).toBe(1);
      expect(yield* Ref.get(releases)).toBe(2);
      expect(yield* Ref.get(incomingPaths)).toEqual([
        "/api/v1/calculators/au.pay.take-home/calculate",
        "/rpc",
      ]);
    }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, settings),
      Effect.scoped
    )
  );

  it.effect("serves after native instance initialisation returns", () =>
    Effect.gen(function* () {
      const app = yield* ApiWorkerInit;
      const response = yield* app.fetch.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request("https://api.example.com/api/health")
          )
        ),
        Effect.scoped
      );
      expect(response.status).toBe(200);
    }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, settings),
      Effect.scoped
    )
  );

  it.effect("keeps rejected settings out of the native startup error", () =>
    Effect.gen(function* () {
      const exit = yield* ApiWorkerSettingsConfig.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            API_PUBLIC_ORIGIN: sensitiveSentinel,
            WEBSITE_PUBLIC_ORIGIN: "https://website.example.com",
          })
        ),
        Effect.exit
      );
      expect(Exit.isFailure(exit)).toBe(true);
      expect(String(exit)).not.toContain(sensitiveSentinel);
      expect(String(exit)).toContain(
        "API Worker origins are missing or invalid"
      );
    })
  );

  it.effect(
    "replaces native log and reporter fields before console egress",
    () =>
      Effect.gen(function* () {
        yield* Effect.log(sensitiveSentinel).pipe(
          Effect.annotateLogs({ [sensitiveSentinel]: sensitiveSentinel }),
          Effect.withLogSpan(sensitiveSentinel),
          Effect.provide(ApiSafeTelemetryLive)
        );
        yield* Effect.die(sensitiveSentinel).pipe(
          Effect.withErrorReporting,
          Effect.exit,
          Effect.provide(ApiSafeTelemetryLive)
        );
        const lines = yield* TestConsole.logLines;
        expect(lines.length).toBe(2);
        const output = yield* Schema.encodeEffect(Json)(lines);
        expect(output).not.toContain(sensitiveSentinel);
        expect(output).toContain("api.runtime.event");
        expect(output).not.toContain("annotations");
        expect(output).not.toContain("cause");
      }).pipe(Effect.provide(TestConsole.layer))
  );

  it.effect("captures a native RPC defect in the installed safe reporter", () =>
    Effect.gen(function* () {
      const app = yield* ApiWorkerApplication.pipe(
        Effect.provide(CalculatorFixture("defect"))
      );
      const body = yield* Schema.encodeEffect(Json)(
        NativeRequest.make({
          headers: [],
          id: "1",
          payload: {
            request: CalculationRequest,
            version: CalculatorRpcVersion,
          },
          tag: "Calculate",
        })
      );
      const response = yield* app.fetch.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request("https://api.example.com/rpc", {
              body,
              headers: { "content-type": "application/json" },
              method: "POST",
            })
          )
        ),
        Effect.scoped
      );
      const text = yield* Effect.promise(() =>
        HttpServerResponse.toWeb(response).text()
      );
      const lines = yield* TestConsole.logLines;
      expect(text).toContain("Calculation service failed");
      expect(text).not.toContain(sensitiveSentinel);
      expect(lines.length).toBeGreaterThan(0);
      expect(yield* Schema.encodeEffect(Json)(lines)).not.toContain(
        sensitiveSentinel
      );
    }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, settings),
      Effect.provide(TestConsole.layer),
      Effect.scoped
    )
  );
});
