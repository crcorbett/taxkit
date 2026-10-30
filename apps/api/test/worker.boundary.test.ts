import { describe, expect, it } from "@effect/vitest";
import {
  CalculatorRequestBodyErrorEnvelope,
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
} from "@taxkit/api-http/request-boundary";
import { CalculatorAdmission } from "@taxkit/calculators/admission.service";
import { CalculatorRunRequest } from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import {
  CalculationRequest,
  CalculatorFixture,
  CalculatorFixtureMode,
  CalculatorLive,
  sensitiveSentinel,
} from "@taxkit/calculators/testing/fixtures";
import { PublicCalculatorServiceBounded } from "@taxkit/calculators/work";
import {
  ApiHostTelemetryLive,
  HostRequestRecord,
  WebsiteHostTelemetryLive,
  observeHostRequest,
} from "@taxkit/observability/host-telemetry";
import {
  Match,
  Function as EffectFunction,
  Array,
  ConfigProvider,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Order,
  Record,
  Ref,
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
      admitCalculation: Effect.fn("CalculatorAdmission.admitCalculation")(
        () => Effect.void
      ),
    })
  )
);
const settings = ConfigProvider.fromUnknown({
  API_PUBLIC_ORIGIN: "https://api.example.com",
  TAXKIT_PUBLICATION_ORIGIN: "https://website.example.com",
  WEBSITE_PUBLIC_ORIGIN: "https://website.example.com",
});
const Json = Schema.fromJsonString(Schema.Unknown);
const calculatePath = "/api/v1/calculators/au.pay.take-home/calculate";
// Each request writes one checked fixed-field record; anything else is a
// runtime log line.
const runtimeLines = (lines: readonly unknown[]) =>
  EffectFunction.pipe(
    lines,
    Array.filter((line) =>
      Option.isNone(
        Schema.decodeUnknownOption(Schema.fromJsonString(HostRequestRecord))(
          line
        )
      )
    )
  );
const header = (
  response: HttpServerResponse.HttpServerResponse,
  name: string
) => Headers.get(response.headers, name).pipe(Option.getOrUndefined);
const allowOrigin = (response: HttpServerResponse.HttpServerResponse) =>
  Headers.get(response.headers, "access-control-allow-origin").pipe(
    Option.getOrUndefined
  );
describe("native API application", () => {
  it.effect("serves discovery and shares only public reads", () =>
    Effect.gen(function* () {
      const app = yield* ApiWorkerInit;
      const send = (path: string, method: string, body: string | null) =>
        app.fetch.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(
              new Request(`https://api.example.com${path}`, {
                body,
                headers: {
                  "cf-connecting-ip": "203.0.113.7",
                  "content-type": "application/json",
                  origin: "https://other.example.com",
                },
                method,
              })
            )
          ),
          Effect.scoped
        );
      const llms = yield* send("/api/v1/docs/discovery/llms.txt", "GET", null);
      expect(llms.status).toBe(200);
      EffectFunction.pipe(header(llms, "content-type"), (actual) => {
        expect(actual).toBe("text/plain; charset=utf-8");
      });
      EffectFunction.pipe(header(llms, "cache-control"), (actual) => {
        expect(actual).toBe("public, max-age=0");
      });
      EffectFunction.pipe(
        header(llms, "cloudflare-cdn-cache-control"),
        (actual) => {
          expect(actual).toBe("public, max-age=604800, stale-if-error=0");
        }
      );
      const text = yield* Effect.promise(() =>
        HttpServerResponse.toWeb(llms).text()
      );
      expect(text).toContain("https://website.example.com");
      const head = yield* send(
        "/api/v1/docs/discovery/sitemap.xml",
        "HEAD",
        null
      );
      expect(head.status).toBe(200);
      EffectFunction.pipe(header(head, "cache-control"), (actual) => {
        expect(actual).toBe("public, max-age=0");
      });
      const metadata = yield* send("/api/v1/calculators", "GET", null);
      EffectFunction.pipe(header(metadata, "cache-control"), (actual) => {
        expect(actual).toBe("public, max-age=0");
      });
      const health = yield* send("/api/health", "GET", null);
      EffectFunction.pipe(header(health, "cache-control"), (actual) => {
        expect(actual).toBe("no-store");
      });
      const missing = yield* send(
        "/api/v1/docs/discovery/other.txt",
        "GET",
        null
      );
      expect(missing.status).toBe(404);
      EffectFunction.pipe(
        header(missing, "cloudflare-cdn-cache-control"),
        (actual) => {
          expect(actual).toBe("no-store");
        }
      );
      const calculated = yield* send(
        "/api/v1/calculators/au.pay.take-home/calculate",
        "POST",
        yield* Schema.encodeEffect(Schema.fromJsonString(CalculatorRunRequest))(
          CalculationRequest.payload
        )
      );
      expect(calculated.status).toBe(200);
      EffectFunction.pipe(header(calculated, "cache-control"), (actual) => {
        expect(actual).toBe("no-store");
      });
      EffectFunction.pipe(
        header(calculated, "cloudflare-cdn-cache-control"),
        (actual) => {
          expect(actual).toBe("no-store");
        }
      );
    }).pipe(Effect.provideService(ConfigProvider.ConfigProvider, settings))
  );
  it.effect("shares eight calculation places across HTTP calls", () =>
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
                  getCalculator: Effect.fn(
                    "PublicCalculatorService.getCalculator"
                  )(live.getCalculator),
                  getCalculatorGraph: Effect.fn(
                    "PublicCalculatorService.getCalculatorGraph"
                  )(live.getCalculatorGraph),
                  getCalculatorSchema: Effect.fn(
                    "PublicCalculatorService.getCalculatorSchema"
                  )(live.getCalculatorSchema),
                  listCalculators: Effect.fn(
                    "PublicCalculatorService.listCalculators"
                  )(live.listCalculators),
                  listFacts: Effect.fn("PublicCalculatorService.listFacts")(
                    live.listFacts
                  ),
                  listJurisdictions: Effect.fn(
                    "PublicCalculatorService.listJurisdictions"
                  )(live.listJurisdictions),
                  listRules: Effect.fn("PublicCalculatorService.listRules")(
                    live.listRules
                  ),
                  listTaxYears: Effect.fn(
                    "PublicCalculatorService.listTaxYears"
                  )(live.listTaxYears),
                  calculate: Effect.fn("PublicCalculatorService.calculate")(
                    () =>
                      Ref.updateAndGet(active, (count) => count + 1).pipe(
                        Effect.flatMap((count) =>
                          Match.value(count).pipe(
                            Match.when(8, () =>
                              Deferred.succeed(started, true)
                            ),
                            Match.orElse(() => Effect.void)
                          )
                        ),
                        Effect.andThen(Effect.never),
                        Effect.ensuring(
                          Ref.update(released, (count) => count + 1)
                        )
                      )
                  ),
                })
              )
            )
          )
        )
      );
      const httpBody = yield* Schema.encodeEffect(
        Schema.fromJsonString(CalculatorRunRequest)
      )(CalculationRequest.payload);
      // A request body can be read once, so each call builds its own request.
      const invoke = Effect.suspend(() =>
        app.fetch.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(
              new Request(
                "https://api.example.com/api/v1/calculators/au.pay.take-home/calculate",
                {
                  body: httpBody,
                  headers: {
                    "content-type": "application/json",
                    origin: "https://website.example.com",
                  },
                  method: "POST",
                }
              )
            )
          ),
          Effect.scoped
        )
      );
      const running = yield* Effect.forEach(Array.range(1, 8), () =>
        invoke.pipe(Effect.forkScoped)
      );
      yield* Deferred.await(started);
      const busy = yield* invoke;
      expect(busy.status).toBe(503);
      const busyText = yield* Effect.promise(() =>
        HttpServerResponse.toWeb(busy).text()
      );
      expect(busyText).toContain("CalculatorCapacityExceeded");
      expect(yield* Ref.get(active)).toBe(8);
      yield* TestClock.adjust("4 seconds");
      expect(yield* Ref.get(released)).toBe(0);
      yield* TestClock.adjust("1 second");
      const timed = yield* EffectFunction.pipe(
        running,
        Effect.forEach((fibre) =>
          Fiber.join(fibre).pipe(
            Effect.flatMap((response) =>
              Effect.promise(() =>
                HttpServerResponse.toWeb(response).text()
              ).pipe(Effect.map((text) => ({ status: response.status, text })))
            )
          )
        )
      );
      yield* EffectFunction.pipe(
        timed,
        Effect.forEach(({ status, text }) =>
          Effect.sync(() => {
            expect(status).toBe(504);
            expect(text).toContain("CalculatorOperationTimedOut");
          })
        )
      );
      expect(yield* Ref.get(released)).toBe(8);
      yield* Effect.forEach(
        [
          busyText,
          ...EffectFunction.pipe(
            timed,
            Array.map(({ text }) => text)
          ),
        ],
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
        expect({
          responseStatus: response.status,
          responseBody: yield* Effect.promise(() =>
            HttpServerResponse.toWeb(response).text()
          ),
        }).toStrictEqual({
          responseStatus: 503,
          responseBody: "",
        });
      }).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({})
        ),
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
        HttpClientRequest.post(`https://api.example.com${calculatePath}`).pipe(
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
        request: HttpClientRequest.post(
          `https://api.example.com${calculatePath}`
        ),
      }).json;
      expect(
        yield* Schema.decodeUnknownEffect(CalculatorRequestBodyErrorEnvelope)(
          json
        )
      ).toStrictEqual({ error: new CalculatorRequestBodyTimedOut() });
      expect(yield* Ref.get(released)).toBeTruthy();
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
            HttpClientRequest.post(
              `https://api.example.com${calculatePath}`
            ).pipe(
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
      EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
        expect(actual).toBeTruthy();
      });
      EffectFunction.pipe(Exit.hasInterrupts(exit), (actual) => {
        expect(actual).toBeTruthy();
      });
      expect(yield* Ref.get(released)).toBeTruthy();
    }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, settings),
      Effect.scoped
    )
  );
  it.effect("admits public browser origins without credentials", () =>
    Effect.gen(function* () {
      const app = yield* ApiWorkerInit;
      const preflight = (path: string, origin: string) =>
        app.fetch.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(
              new Request(`https://api.example.com${path}`, {
                headers: {
                  "access-control-request-headers": "content-type,traceparent",
                  "access-control-request-method": "POST",
                  origin,
                },
                method: "OPTIONS",
              })
            )
          ),
          Effect.scoped
        );
      const other = yield* preflight(
        calculatePath,
        "https://other.example.com"
      );
      expect(other.status).toBe(204);
      EffectFunction.pipe(allowOrigin(other), (actual) => {
        expect(actual).toBe("https://other.example.com");
      });
      EffectFunction.pipe(
        Headers.get(other.headers, "access-control-allow-headers").pipe(
          Option.getOrUndefined
        ),
        (actual) => {
          expect(actual).toBe(
            "x-taxkit-collection-policy,b3,content-type,traceparent"
          );
        }
      );
      EffectFunction.pipe(
        Headers.get(other.headers, "access-control-allow-credentials").pipe(
          Option.getOrUndefined
        ),
        (actual) => {
          expect(actual).toBeUndefined();
        }
      );
      const http = yield* preflight(
        "/api/v1/calculators/au.pay.take-home/calculate",
        "http://127.0.0.1:3000"
      );
      EffectFunction.pipe(allowOrigin(http), (actual) => {
        expect(actual).toBe("http://127.0.0.1:3000");
      });
      // A malformed or non-HTTP origin is never echoed.
      const malformed = yield* preflight(
        calculatePath,
        "https://other.example.com/"
      );
      EffectFunction.pipe(allowOrigin(malformed), (actual) => {
        expect(actual).toBeUndefined();
      });
      const opaque = yield* preflight(calculatePath, "null");
      EffectFunction.pipe(allowOrigin(opaque), (actual) => {
        expect(actual).toBeUndefined();
      });
      // Remote MCP keeps its exact browser list.
      const mcpListed = yield* preflight("/mcp", "https://website.example.com");
      EffectFunction.pipe(allowOrigin(mcpListed), (actual) => {
        expect(actual).toBe("https://website.example.com");
      });
      const mcpOther = yield* preflight("/mcp", "https://other.example.com");
      EffectFunction.pipe(allowOrigin(mcpOther), (actual) => {
        expect(actual).toBeUndefined();
      });
    }).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, settings),
      Effect.scoped
    )
  );
  it.effect.each([
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
        const chunks = Match.value(representation).pipe(
          Match.when("chunks", () =>
            Stream.make(
              new Uint8Array(32 * 1024),
              new Uint8Array(32 * 1024 + 1)
            )
          ),
          Match.orElse(() =>
            Stream.succeed(new TextEncoder().encode("é".repeat(32_769)))
          )
        );
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
        ).toStrictEqual({ error: new CalculatorRequestBodyTooLarge() });
        expect(!(yield* Ref.get(tailRead))).toBeTruthy();
        expect(yield* Ref.get(released)).toBeTruthy();
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.scoped
      )
  );
  it.effect(
    "accepts exactly 64 KiB and shares one calculator operation across requests",
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
              getCalculator: Effect.fn("PublicCalculatorService.getCalculator")(
                live.getCalculator
              ),
              getCalculatorGraph: Effect.fn(
                "PublicCalculatorService.getCalculatorGraph"
              )(live.getCalculatorGraph),
              getCalculatorSchema: Effect.fn(
                "PublicCalculatorService.getCalculatorSchema"
              )(live.getCalculatorSchema),
              listCalculators: Effect.fn(
                "PublicCalculatorService.listCalculators"
              )(live.listCalculators),
              listFacts: Effect.fn("PublicCalculatorService.listFacts")(
                live.listFacts
              ),
              listJurisdictions: Effect.fn(
                "PublicCalculatorService.listJurisdictions"
              )(live.listJurisdictions),
              listRules: Effect.fn("PublicCalculatorService.listRules")(
                live.listRules
              ),
              listTaxYears: Effect.fn("PublicCalculatorService.listTaxYears")(
                live.listTaxYears
              ),
              calculate: Effect.fn("PublicCalculatorService.calculate")(
                (request) =>
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
                  })
              ),
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
        const second = yield* transport.execute(
          HttpClientRequest.post(
            `https://api.example.com${calculatePath}`
          ).pipe(HttpClientRequest.bodyText(httpBody, "application/json"))
        );
        expect({
          httpStatus: http.status,
          secondStatus: second.status,
        }).toStrictEqual({
          httpStatus: 200,
          secondStatus: 200,
        });
        expect(yield* http.text).toContain('"netPay"');
        expect(yield* second.text).toContain('"netPay"');
        expect({
          RefGetCalls: yield* Ref.get(calls),
          RefGetConstructions: yield* Ref.get(constructions),
          RefGetReleases: yield* Ref.get(releases),
          RefGetIncomingPaths: yield* Ref.get(incomingPaths),
        }).toStrictEqual({
          RefGetCalls: 2,
          RefGetConstructions: 1,
          RefGetReleases: 2,
          RefGetIncomingPaths: [
            "/api/v1/calculators/au.pay.take-home/calculate",
            "/api/v1/calculators/au.pay.take-home/calculate",
          ],
        });
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
            TAXKIT_PUBLICATION_ORIGIN: "https://website.example.com",
            WEBSITE_PUBLIC_ORIGIN: "https://website.example.com",
          })
        ),
        Effect.exit
      );
      EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
        expect(actual).toBeTruthy();
      });
      EffectFunction.pipe(String(exit), (actual) => {
        expect(actual).not.toContain(sensitiveSentinel);
      });
      EffectFunction.pipe(String(exit), (actual) => {
        expect(actual).toContain("API Worker origins are missing or invalid");
      });
    })
  );
  it.effect.each(["api", "website"] as const)(
    "replaces %s native log and reporter fields before console egress",
    (host) =>
      Effect.gen(function* () {
        yield* Effect.log(sensitiveSentinel).pipe(
          Effect.annotateLogs({ [sensitiveSentinel]: sensitiveSentinel }),
          Effect.withLogSpan(sensitiveSentinel),
          Effect.provide(
            Match.value(host).pipe(
              Match.when("api", () => ApiHostTelemetryLive),
              Match.orElse(() => WebsiteHostTelemetryLive)
            )
          )
        );
        yield* Effect.die(sensitiveSentinel).pipe(
          Effect.withErrorReporting,
          Effect.exit,
          Effect.provide(
            Match.value(host).pipe(
              Match.when("api", () => ApiHostTelemetryLive),
              Match.orElse(() => WebsiteHostTelemetryLive)
            )
          )
        );
        const lines = yield* TestConsole.logLines;
        expect(lines).toHaveLength(2);
        const output = yield* Schema.encodeEffect(Json)(lines);
        expect(output).not.toContain(sensitiveSentinel);
        expect(output).toContain(`${host}.runtime.event`);
        expect(output).not.toContain("annotations");
        expect(output).not.toContain("cause");
      }).pipe(Effect.provide(TestConsole.layer))
  );
  it.effect(
    "writes one fixed request record without URL, headers or body",
    () =>
      Effect.gen(function* () {
        const app = yield* ApiWorkerInit;
        const send = (path: string, method: string, body: string | null) =>
          app.fetch.pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              HttpServerRequest.fromWeb(
                new Request(`https://api.example.com${path}`, {
                  body,
                  headers: {
                    "cf-connecting-ip": "203.0.113.7",
                    "content-type": "application/json",
                    cookie: `session=${sensitiveSentinel}`,
                    "user-agent": sensitiveSentinel,
                  },
                  method,
                })
              )
            ),
            Effect.scoped
          );
        const query = `?gross=165400&note=${encodeURIComponent(sensitiveSentinel)}`;
        yield* send(
          `/api/v1/calculators/au.pay.take-home/calculate${query}`,
          "POST",
          `{"grossDollars":165400,"note":"${sensitiveSentinel}"}`
        );
        yield* send(`/api/health${query}`, "GET", null);
        yield* send(`/api/v1/calculators${query}`, "GET", null);
        const lines = yield* TestConsole.logLines;
        EffectFunction.pipe(runtimeLines(lines), (actual) => {
          expect(actual).toStrictEqual([]);
        });
        const records = yield* EffectFunction.pipe(
          lines,
          Effect.forEach((line) =>
            Schema.decodeUnknownEffect(
              Schema.fromJsonString(
                Schema.Record(Schema.String, Schema.Unknown)
              )
            )(line)
          )
        );
        EffectFunction.pipe(
          records,
          Array.map((record) =>
            EffectFunction.pipe(Record.keys(record), Array.sort(Order.String))
          ),
          (actual) => {
            expect(actual).toStrictEqual(
              Array.makeBy(3, () => [
                "durationMs",
                "event",
                "level",
                "method",
                "outcome",
                "route",
                "service",
                "status",
                "statusClass",
                "timestamp",
              ])
            );
          }
        );
        const decoded = yield* EffectFunction.pipe(
          lines,
          Effect.forEach((line) =>
            Schema.decodeUnknownEffect(
              Schema.fromJsonString(HostRequestRecord)
            )(line)
          )
        );
        EffectFunction.pipe(
          decoded,
          Array.map(({ method, outcome, route, service }) => ({
            method,
            outcome,
            route,
            service,
          })),
          (actual) => {
            expect(actual).toStrictEqual([
              {
                method: "POST",
                outcome: "completed",
                route: "calculate",
                service: "taxkit-api",
              },
              {
                method: "GET",
                outcome: "completed",
                route: "health",
                service: "taxkit-api",
              },
              {
                method: "GET",
                outcome: "completed",
                route: "catalogue",
                service: "taxkit-api",
              },
            ]);
          }
        );
        const output = yield* Schema.encodeEffect(Json)(lines);
        expect(output).not.toContain(sensitiveSentinel);
        expect(output).not.toContain("165400");
        expect(output).not.toContain("203.0.113.7");
        expect(output).not.toContain("api.example.com");
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.provide(TestConsole.layer),
        Effect.scoped
      )
  );
  it.effect("records failures and cancellation without their causes", () =>
    Effect.gen(function* () {
      const observe = observeHostRequest("taxkit-web", {
        method: sensitiveSentinel,
        route: "calculate",
      });
      yield* Effect.fail(sensitiveSentinel).pipe(observe, Effect.exit);
      yield* Effect.interrupt.pipe(observe, Effect.exit);
      yield* Effect.succeed({ status: 503 }).pipe(observe);
      // A record claiming another host keeps none of its fields.
      yield* Effect.logInfo(
        HostRequestRecord.make({
          durationMs: 0,
          event: "taxkit.request",
          method: "GET",
          outcome: "completed",
          route: "docs",
          service: "taxkit-api",
          status: Option.some(200),
          statusClass: "2xx",
        })
      );
      const lines = yield* TestConsole.logLines;
      const decoded = yield* Effect.forEach(Array.take(lines, 3), (line) =>
        Schema.decodeUnknownEffect(Schema.fromJsonString(HostRequestRecord))(
          line
        )
      );
      EffectFunction.pipe(
        decoded,
        Array.map(({ method, outcome, status, statusClass }) => ({
          method,
          outcome,
          status,
          statusClass,
        })),
        (actual) => {
          expect(actual).toStrictEqual([
            {
              method: "other",
              outcome: "failed",
              status: Option.none(),
              statusClass: "none",
            },
            {
              method: "other",
              outcome: "interrupted",
              status: Option.none(),
              statusClass: "none",
            },
            {
              method: "other",
              outcome: "completed",
              status: Option.some(503),
              statusClass: "5xx",
            },
          ]);
        }
      );
      EffectFunction.pipe(runtimeLines(lines), (actual) => {
        expect(actual).toHaveLength(1);
      });
      const output = yield* Schema.encodeEffect(Json)(lines);
      expect(output).not.toContain(sensitiveSentinel);
      expect(output).toContain("website.runtime.event");
    }).pipe(
      Effect.provide(WebsiteHostTelemetryLive),
      Effect.provide(TestConsole.layer)
    )
  );
  it.effect(
    "captures a calculation defect in the installed safe reporter",
    () =>
      Effect.gen(function* () {
        const app = yield* ApiWorkerApplication.pipe(
          Effect.provide(ApiContentLive),
          Effect.provide(
            CalculatorFixture.pipe(
              Layer.provide(Layer.succeed(CalculatorFixtureMode)("defect"))
            )
          )
        );
        const body = yield* Schema.encodeEffect(
          Schema.fromJsonString(CalculatorRunRequest)
        )(CalculationRequest.payload);
        const response = yield* app.fetch.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(
              new Request(`https://api.example.com${calculatePath}`, {
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
        expect({
          responseStatus: response.status,
          text,
        }).toStrictEqual({
          responseStatus: 500,
          text: "",
        });
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
