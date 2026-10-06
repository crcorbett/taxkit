import { describe, expect, it } from "@effect/vitest";
import {
  CalculatorRequestBodyErrorEnvelope,
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
} from "@taxkit/api-http/request-boundary";
import { CalculatorHostTelemetryLive } from "@taxkit/api-rpc/host-telemetry";
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
import { CalculatorAdmission } from "@taxkit/calculators/admission.service";
import { CalculatorRunRequest } from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { PublicCalculatorServiceBounded } from "@taxkit/calculators/work";
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

import { ApiContentLive } from "../src/content.boundary.js";
import { ApiWorkerApplication } from "../src/worker.application.js";
import { ApiWorkerSettingsConfig } from "../src/worker.config.js";
import { ApiWorkerInit as ApiWorkerApplicationInit } from "../src/worker.js";

// These retained tests isolate body, protocol and lifetime behaviour. Actual
// admission and native provider counters are qualified in their owning tests.
const ApiWorkerInit = ApiWorkerApplicationInit.pipe(
  Effect.provideService(
    CalculatorAdmission,
    CalculatorAdmission.of({
      admitCalculation: () => Effect.void,
    })
  )
);

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
  it.effect("shares eight calculation places across HTTP and RPC batches", () =>
    Effect.gen(function* () {
      const live = yield* PublicCalculatorService;
      const active = yield* Ref.make(0);
      const started = yield* Deferred.make<boolean>();
      const released = yield* Ref.make(0);
      const app = yield* ApiWorkerApplication.pipe(
        Effect.provide(ApiContentLive),
        Effect.provide(
          PublicCalculatorServiceBounded.pipe(
            Layer.provide(
              Layer.succeed(
                PublicCalculatorService,
                PublicCalculatorService.of({
                  ...live,
                  calculate: () =>
                    Ref.updateAndGet(active, (count) => count + 1).pipe(
                      Effect.flatMap((count) =>
                        count === 8
                          ? Deferred.succeed(started, true)
                          : Effect.void
                      ),
                      Effect.andThen(Effect.never),
                      Effect.ensuring(
                        Ref.update(released, (count) => count + 1)
                      )
                    ),
                })
              )
            )
          )
        )
      );
      const invoke = (
        path: "/rpc" | "/api/v1/calculators/au.pay.take-home/calculate",
        body: string
      ) =>
        app.fetch.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(
              new Request(`https://api.example.com${path}`, {
                body,
                headers: {
                  "content-type": "application/json",
                  origin: "https://website.example.com",
                },
                method: "POST",
              })
            )
          ),
          Effect.scoped
        );
      const rpcBody = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.Array(NativeRequest))
      )(
        Array.map(Array.range(1, 7), (id) =>
          NativeRequest.make({
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
      const httpBody = yield* Schema.encodeEffect(
        Schema.fromJsonString(CalculatorRunRequest)
      )(CalculationRequest.payload);
      const http = yield* invoke(
        "/api/v1/calculators/au.pay.take-home/calculate",
        httpBody
      ).pipe(Effect.forkScoped);
      const rpc = yield* invoke("/rpc", rpcBody).pipe(Effect.forkScoped);
      yield* Deferred.await(started).pipe(
        Effect.raceFirst(
          Fiber.join(http).pipe(
            Effect.flatMap((response) =>
              Effect.die(`HTTP fixture ended early: ${response.status}`)
            )
          )
        ),
        Effect.raceFirst(
          Fiber.join(rpc).pipe(
            Effect.flatMap((response) =>
              Effect.die(`RPC fixture ended early: ${response.status}`)
            )
          )
        )
      );
      const busyHttp = yield* invoke(
        "/api/v1/calculators/au.pay.take-home/calculate",
        httpBody
      );
      expect(busyHttp.status).toBe(503);
      const busyHttpText = yield* Effect.promise(() =>
        HttpServerResponse.toWeb(busyHttp).text()
      );
      expect(busyHttpText).toContain("CalculatorCapacityExceeded");
      const busyRpc = yield* invoke("/rpc", rpcBody);
      const busyRpcText = yield* Effect.promise(() =>
        HttpServerResponse.toWeb(busyRpc).text()
      );
      expect(busyRpc.status).toBe(200);
      expect(busyRpcText).toContain("CalculatorCapacityExceeded");
      expect(yield* Ref.get(active)).toBe(8);
      yield* TestClock.adjust("4 seconds");
      expect(yield* Ref.get(released)).toBe(0);
      yield* TestClock.adjust("1 second");
      const timedHttp = yield* Fiber.join(http);
      expect(timedHttp.status).toBe(504);
      const timedHttpText = yield* Effect.promise(() =>
        HttpServerResponse.toWeb(timedHttp).text()
      );
      const timedRpc = yield* Fiber.join(rpc);
      const timedRpcText = yield* Effect.promise(() =>
        HttpServerResponse.toWeb(timedRpc).text()
      );
      expect(timedHttpText).toContain("CalculatorOperationTimedOut");
      expect(timedRpcText).toContain("CalculatorOperationTimedOut");
      expect(yield* Ref.get(released)).toBe(8);
      yield* Effect.forEach(
        [busyHttpText, busyRpcText, timedHttpText, timedRpcText],
        (text) =>
          Effect.sync(() => {
            expect(text).not.toContain(sensitiveSentinel);
            expect(text).not.toContain("165400");
            expect(text).not.toContain("stack");
          })
      );
    }).pipe(
      Effect.provide(CalculatorLive),
      Effect.provideService(ConfigProvider.ConfigProvider, settings),
      Effect.scoped
    )
  );

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
        const request = yield* Schema.encodeEffect(NativeRequest)(
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
                  headers: {
                    "cf-connecting-ip": "203.0.113.75",
                    "content-type": "application/json",
                  },
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
      const response = yield* Fiber.join(fibre);
      expect(response.status).toBe(408);
      const json = yield* HttpServerResponse.toClientResponse(response, {
        request: HttpClientRequest.post("https://api.example.com/rpc"),
      }).json;
      expect(
        yield* Schema.decodeUnknownEffect(CalculatorRequestBodyErrorEnvelope)(
          json
        )
      ).toEqual({ error: new CalculatorRequestBodyTimedOut() });
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

  it.effect.each([
    { pathname: "/rpc", representation: "chunks" },
    { pathname: "/rpc", representation: "utf-8" },
    {
      pathname: "/api/v1/calculators/au.pay.take-home/calculate",
      representation: "chunks",
    },
    {
      pathname: "/api/v1/calculators/au.pay.take-home/calculate",
      representation: "utf-8",
    },
  ])(
    "stops oversized $representation bytes and releases their source for $pathname",
    ({ pathname, representation }) =>
      Effect.gen(function* () {
        const released = yield* Ref.make(false);
        const tailRead = yield* Ref.make(false);
        const app = yield* ApiWorkerInit;
        const chunks =
          representation === "chunks"
            ? Stream.make(
                new Uint8Array(32 * 1024),
                new Uint8Array(32 * 1024 + 1)
              )
            : Stream.succeed(new TextEncoder().encode("é".repeat(32_769)));
        const body = chunks.pipe(
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
              HttpClientRequest.post(`https://api.example.com${pathname}`).pipe(
                HttpClientRequest.bodyStream(body, {
                  contentType: "application/json",
                })
              )
            )
          ),
          Effect.scoped
        );
        expect(response.status).toBe(413);
        const json = yield* HttpServerResponse.toClientResponse(response, {
          request: HttpClientRequest.post(`https://api.example.com${pathname}`),
        }).json;
        expect(
          yield* Schema.decodeUnknownEffect(CalculatorRequestBodyErrorEnvelope)(
            json
          )
        ).toEqual({ error: new CalculatorRequestBodyTooLarge() });
        expect(yield* Ref.get(tailRead)).toBe(false);
        expect(yield* Ref.get(released)).toBe(true);
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.scoped
      )
  );

  it.effect(
    "accepts exactly 64 KiB across HTTP and native RPC with one shared operation",
    () =>
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
        const app = yield* ApiWorkerApplication.pipe(
          Effect.provide(ApiContentLive),
          Effect.provide(calculator)
        );
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
        const httpBody = yield* Schema.encodeEffect(
          Schema.fromJsonString(CalculatorRunRequest)
        )(CalculationRequest.payload);
        const rpcBody = yield* Schema.encodeEffect(
          Schema.fromJsonString(NativeRequest)
        )(
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
          ).pipe(
            HttpClientRequest.bodyText(
              httpBody +
                " ".repeat(
                  65_536 - new TextEncoder().encode(httpBody).byteLength
                ),
              "application/json"
            )
          )
        );
        const rpc = yield* transport.execute(
          HttpClientRequest.post("https://api.example.com/rpc").pipe(
            HttpClientRequest.bodyText(
              rpcBody +
                " ".repeat(
                  65_536 - new TextEncoder().encode(rpcBody).byteLength
                ),
              "application/json"
            )
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

  it.effect.each(["api", "website"] as const)(
    "replaces %s native log and reporter fields before console egress",
    (host) =>
      Effect.gen(function* () {
        yield* Effect.log(sensitiveSentinel).pipe(
          Effect.annotateLogs({ [sensitiveSentinel]: sensitiveSentinel }),
          Effect.withLogSpan(sensitiveSentinel),
          Effect.provide(CalculatorHostTelemetryLive(host))
        );
        yield* Effect.die(sensitiveSentinel).pipe(
          Effect.withErrorReporting,
          Effect.exit,
          Effect.provide(CalculatorHostTelemetryLive(host))
        );
        const lines = yield* TestConsole.logLines;
        expect(lines.length).toBe(2);
        const output = yield* Schema.encodeEffect(Json)(lines);
        expect(output).not.toContain(sensitiveSentinel);
        expect(output).toContain(`${host}.runtime.event`);
        expect(output).not.toContain("annotations");
        expect(output).not.toContain("cause");
      }).pipe(Effect.provide(TestConsole.layer))
  );

  it.effect("captures a native RPC defect in the installed safe reporter", () =>
    Effect.gen(function* () {
      const app = yield* ApiWorkerApplication.pipe(
        Effect.provide(ApiContentLive),
        Effect.provide(CalculatorFixture("defect"))
      );
      const body = yield* Schema.encodeEffect(
        Schema.fromJsonString(NativeRequest)
      )(
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
              headers: {
                "cf-connecting-ip": "203.0.113.75",
                "content-type": "application/json",
              },
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
