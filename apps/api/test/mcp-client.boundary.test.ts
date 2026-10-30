import { describe, expect, it } from "@effect/vitest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { McpRequestAbortSignal } from "@taxkit/api-mcp/request";
import {
  McpDocsSearchResponse,
  McpToolUnavailable,
} from "@taxkit/api-mcp/schemas";
import { CalculatorAdmission } from "@taxkit/calculators/admission.service";
import {
  CalculatorCatalogResponse,
  CalculatorSchemaResponse,
  GetCalculatorRequest,
  CalculatorRateLimited,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import {
  CalculationRequest,
  CalculatorLive,
  CalculatorFixture,
  CalculatorFixtureMode,
  sensitiveSentinel,
} from "@taxkit/calculators/testing/fixtures";
import {
  CalculatorConcurrencyLimit,
  PublicCalculatorServiceBounded,
} from "@taxkit/calculators/work";
import {
  DocsPublicNavigation,
  DocsPublicPage,
  DocsPublicPagePath,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import { ContentService } from "@taxkit/content/service";
import { HostRequestRecord } from "@taxkit/observability/host-telemetry";
import {
  Predicate,
  Match,
  Function as EffectFunction,
  Array,
  ConfigProvider,
  Deferred,
  Effect,
  HashMap,
  Fiber,
  Layer,
  Option,
  Order,
  Redacted,
  Ref,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import type { Scope } from "effect";
import { McpSchema } from "effect/ai";
import { Headers, HttpEffect } from "effect/http";
import type { HttpServerRequest } from "effect/http";
import { NetAddress } from "effect/net";
import { TestConsole } from "effect/testing";

import { ApiContentLive } from "../src/content.boundary.js";
import { ApiWorkerApplication } from "../src/worker.application.js";
import { ApiWorkerInit } from "../src/worker.js";

class McpClientProbeFailed extends Schema.TaggedError<
  McpClientProbeFailed,
  {
    readonly brand: unique symbol;
  }
>()("McpClientProbeFailed", {
  operation: Schema.Literals([
    "connect",
    "list",
    "catalogue",
    "schema",
    "navigation",
    "search",
    "calculate",
    "read",
    "limit",
  ]),
}) {}
const settings = ConfigProvider.fromUnknown({
  API_PUBLIC_ORIGIN: "https://api.example.com",
  TAXKIT_PUBLICATION_ORIGIN: "https://publication.example.com",
  WEBSITE_PUBLIC_ORIGIN: "https://website.example.com",
});
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
describe("real MCP client against the native API application", () => {
  it.effect.each([
    { headers: { origin: "https://foreign.example.com" }, status: 403 },
    { headers: { "mcp-protocol-version": "2025-11-25" }, status: 400 },
    { headers: { "mcp-method": "tools/call" }, status: 400 },
    { headers: { "mcp-name": "unexpected-tool" }, status: 400 },
  ] as const)(
    "refuses actual client routing headers $headers with HTTP $status",
    ({ headers, status }) =>
      Effect.gen(function* () {
        const observed = yield* Ref.make(Option.none<number>());
        const app = yield* ApiWorkerApplication.pipe(
          Effect.provide(ApiContentLive)
        );
        const context = yield* Effect.context();
        const handler = HttpEffect.toWebHandlerWith<
          never,
          Scope.Scope | HttpServerRequest.HttpServerRequest
        >(context)(
          app.fetch.pipe(
            Effect.tap((response) =>
              Ref.set(observed, Option.some(response.status))
            )
          )
        );
        const client = yield* Effect.acquireRelease(
          Effect.sync(
            () =>
              new Client(
                { name: "taxkit-header-probe", version: "1" },
                { versionNegotiation: { mode: { pin: "2026-07-28" } } }
              )
          ),
          (value) => Effect.promise(() => value.close())
        );
        const transport = new StreamableHTTPClientTransport(
          new URL("https://api.example.com/mcp"),
          {
            // Fault injection keeps the official client's real frame and changes
            // only these HTTP headers before the native host receives it.
            fetch: (request, init) => {
              const original = new Request(request, init);
              return handler(
                new Request(original, {
                  headers: Headers.merge(
                    Headers.fromInput(original.headers),
                    Headers.fromInput(headers)
                  ),
                })
              );
            },
          }
        );
        const input = yield* Schema.encodeEffect(CalculatorRunServiceRequest)(
          CalculationRequest
        );
        const refused = yield* Effect.tryPromise({
          catch: () => new McpClientProbeFailed({ operation: "connect" }),
          try: () => client.connect(transport),
        }).pipe(
          Effect.andThen(
            Effect.tryPromise({
              catch: () => new McpClientProbeFailed({ operation: "calculate" }),
              try: () =>
                client.callTool({ arguments: input, name: "taxkit_calculate" }),
            })
          ),
          Effect.result
        );
        expect({
          refusedRequest: {
            refused_tag: Predicate.isTagged(refused, "Failure"),
            RefGetObserved: yield* Ref.get(observed),
          },
          runtimeLinesYieldTestConsoleLogLines: runtimeLines(
            yield* TestConsole.logLines
          ),
        }).toStrictEqual({
          refusedRequest: {
            refused_tag: true,
            RefGetObserved: Option.some(status),
          },
          runtimeLinesYieldTestConsoleLogLines: [],
        });
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.provide(CalculatorLive),
        Effect.provide(TestConsole.layer),
        Effect.scoped
      )
  );
  it.effect.each([
    { admitted: true, origin: "https://website.example.com" },
    { admitted: false, origin: "https://publication.example.com" },
    { admitted: false, origin: "https://website.example.com.evil.test" },
    { admitted: false, origin: "https://website.example.com/" },
    { admitted: false, origin: "null" },
  ])(
    "uses the modern browser header contract for $origin",
    ({ origin, admitted }) =>
      Effect.gen(function* () {
        const app = yield* ApiWorkerApplication.pipe(
          Effect.provide(ApiContentLive)
        );
        const context = yield* Effect.context();
        const handler = HttpEffect.toWebHandlerWith<
          never,
          Scope.Scope | HttpServerRequest.HttpServerRequest
        >(context)(app.fetch);
        const response = yield* Effect.promise(() =>
          handler(
            new Request("https://api.example.com/mcp", {
              headers: {
                "access-control-request-headers":
                  "content-type,mcp-method,mcp-name,mcp-protocol-version,traceparent,b3",
                "access-control-request-method": "POST",
                origin,
              },
              method: "OPTIONS",
            })
          )
        );
        EffectFunction.pipe(
          response.headers.get("access-control-allow-origin"),
          (actual) => {
            expect(actual).toBe(
              EffectBoolean.match(admitted, {
                onFalse: () => null,
                onTrue: () => origin,
              })
            );
          }
        );
        EffectFunction.pipe(
          response.headers.get("access-control-allow-credentials"),
          (actual) => {
            expect(actual).toBeNull();
          }
        );
        if (admitted) {
          const headers = response.headers.get("access-control-allow-headers");
          Array.forEach((marker: string) => {
            expect(headers).toContain(marker);
          })(["mcp-method", "mcp-name", "mcp-protocol-version"]);
          expect(headers).not.toContain("mcp-session-id");
        }
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.provide(CalculatorLive),
        Effect.provide(TestConsole.layer),
        Effect.scoped
      )
  );
  it.effect.each([
    { message: "invalid-calculation", mode: "expected" },
    { message: "capacity-exceeded", mode: "capacity" },
    { message: "operation-timeout", mode: "timeout" },
    {
      message: "Tool execution failed due to an internal server error.",
      mode: "defect",
    },
  ] as const)(
    "keeps $mode calculator failures safe in actual client replies and logs",
    ({ mode, message }) =>
      Effect.gen(function* () {
        const app = yield* ApiWorkerApplication.pipe(
          Effect.provide(ApiContentLive),
          Effect.provide(
            CalculatorFixture.pipe(
              Layer.provide(Layer.succeed(CalculatorFixtureMode)(mode))
            )
          )
        );
        const context = yield* Effect.context();
        const handler = HttpEffect.toWebHandlerWith<
          never,
          Scope.Scope | HttpServerRequest.HttpServerRequest
        >(context)(app.fetch);
        const client = yield* Effect.acquireRelease(
          Effect.sync(
            () =>
              new Client(
                { name: "taxkit-safe-error-probe", version: "1" },
                { versionNegotiation: { mode: { pin: "2026-07-28" } } }
              )
          ),
          (value) => Effect.promise(() => value.close())
        );
        const transport = new StreamableHTTPClientTransport(
          new URL("https://api.example.com/mcp"),
          { fetch: (request, init) => handler(new Request(request, init)) }
        );
        yield* Effect.tryPromise({
          catch: () => new McpClientProbeFailed({ operation: "connect" }),
          try: () => client.connect(transport),
        });
        const input = yield* Schema.encodeEffect(CalculatorRunServiceRequest)(
          CalculationRequest
        );
        const response = yield* Effect.tryPromise({
          catch: () => new McpClientProbeFailed({ operation: "calculate" }),
          try: () =>
            client.callTool({ arguments: input, name: "taxkit_calculate" }),
        });
        const checked = yield* Schema.decodeUnknownEffect(
          McpSchema.CallToolResult
        )(response);
        expect(checked.isError === true).toBeTruthy();
        const text = yield* Schema.encodeEffect(
          Schema.fromJsonString(McpSchema.CallToolResult)
        )(checked);
        expect(text).toContain(message);
        Array.forEach((marker: string) => {
          expect(text).not.toContain(marker);
        })([sensitiveSentinel, "165400"]);
        const lines = yield* TestConsole.logLines;
        EffectFunction.pipe(runtimeLines(lines), (actual) => {
          expect(actual).toHaveLength(
            Match.value(mode).pipe(
              Match.when("defect", (): 2 => 2),
              Match.orElse((): 0 => 0)
            )
          );
        });
        const logged = yield* Schema.encodeEffect(
          Schema.fromJsonString(Schema.Unknown)
        )(lines);
        Array.forEach((marker: string) => {
          expect(logged).not.toContain(marker);
        })([sensitiveSentinel, "165400"]);
        if (mode === "defect") {
          expect(logged).toContain("api.runtime.event");
        }
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.provide(CalculatorLive),
        Effect.provide(TestConsole.layer),
        Effect.scoped
      )
  );
  it.effect(
    "cancels actual client work and releases its calculation place",
    () =>
      Effect.gen(function* () {
        const entered = yield* Deferred.make<boolean>();
        const released = yield* Deferred.make<boolean>();
        const started = yield* Ref.make(0);
        const stopped = yield* Ref.make(0);
        const toolSignals = yield* Ref.make<readonly AbortSignal[]>([]);
        const calculator = yield* PublicCalculatorService;
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
                    )(calculator.getCalculator),
                    getCalculatorGraph: Effect.fn(
                      "PublicCalculatorService.getCalculatorGraph"
                    )(calculator.getCalculatorGraph),
                    getCalculatorSchema: Effect.fn(
                      "PublicCalculatorService.getCalculatorSchema"
                    )(calculator.getCalculatorSchema),
                    listCalculators: Effect.fn(
                      "PublicCalculatorService.listCalculators"
                    )(calculator.listCalculators),
                    listFacts: Effect.fn("PublicCalculatorService.listFacts")(
                      calculator.listFacts
                    ),
                    listJurisdictions: Effect.fn(
                      "PublicCalculatorService.listJurisdictions"
                    )(calculator.listJurisdictions),
                    listRules: Effect.fn("PublicCalculatorService.listRules")(
                      calculator.listRules
                    ),
                    listTaxYears: Effect.fn(
                      "PublicCalculatorService.listTaxYears"
                    )(calculator.listTaxYears),
                    calculate: Effect.fn("PublicCalculatorService.calculate")(
                      (request) =>
                        Effect.gen(function* () {
                          const count = yield* Ref.updateAndGet(
                            started,
                            (value) => value + 1
                          );
                          if (count > CalculatorConcurrencyLimit) {
                            return yield* calculator.calculate(request);
                          }
                          const signal = yield* McpRequestAbortSignal;
                          if (Option.isSome(signal)) {
                            yield* Ref.update(toolSignals, (values) => [
                              ...values,
                              signal.value,
                            ]);
                          }
                          if (count === CalculatorConcurrencyLimit) {
                            yield* Deferred.succeed(entered, true);
                          }
                          return yield* Effect.never;
                        }).pipe(
                          Effect.ensuring(
                            Ref.updateAndGet(
                              stopped,
                              (value) => value + 1
                            ).pipe(
                              Effect.andThen(Deferred.succeed(released, true))
                            )
                          )
                        )
                    ),
                  })
                )
              )
            )
          )
        );
        const context = yield* Effect.context();
        const handler = HttpEffect.toWebHandlerWith<
          never,
          Scope.Scope | HttpServerRequest.HttpServerRequest
        >(context)(app.fetch);
        const client = yield* Effect.acquireRelease(
          Effect.sync(
            () =>
              new Client(
                { name: "taxkit-cancellation-probe", version: "1" },
                { versionNegotiation: { mode: { pin: "2026-07-28" } } }
              )
          ),
          (value) => Effect.promise(() => value.close())
        );
        const transport = new StreamableHTTPClientTransport(
          new URL("https://api.example.com/mcp"),
          {
            fetch: (request, init) => handler(new Request(request, init)),
          }
        );
        yield* Effect.tryPromise({
          catch: () => new McpClientProbeFailed({ operation: "connect" }),
          try: () => client.connect(transport),
        });
        const input = yield* Schema.encodeEffect(CalculatorRunServiceRequest)(
          CalculationRequest
        );
        // AbortController is the official client's host cancellation contract.
        const aborts = yield* Effect.sync(() =>
          Array.makeBy(CalculatorConcurrencyLimit, () => new AbortController())
        );
        const calls = yield* EffectFunction.pipe(
          aborts,
          Effect.forEach((abort) =>
            Effect.tryPromise({
              catch: () => new McpClientProbeFailed({ operation: "calculate" }),
              try: () =>
                client.callTool(
                  { arguments: input, name: "taxkit_calculate" },
                  { signal: abort.signal }
                ),
            }).pipe(Effect.result, Effect.forkScoped)
          )
        );
        yield* Deferred.await(entered).pipe(
          Effect.raceFirst(
            Effect.forEach(calls, Fiber.join, {
              concurrency: "unbounded",
            }).pipe(
              Effect.andThen(
                Effect.sync(() =>
                  expect.fail("Calls ended before the calculation pool filled")
                )
              )
            )
          )
        );
        const firstAbort = yield* Effect.fromOption(Array.head(aborts));
        const firstCall = yield* Effect.fromOption(Array.head(calls));
        yield* Effect.sync(() => {
          firstAbort.abort();
        });
        expect({
          firstCallFailed: Predicate.isTagged(
            yield* Fiber.join(firstCall),
            "Failure"
          ),
          callerAborted: EffectFunction.pipe(
            yield* Ref.get(toolSignals),
            Array.some((signal) => signal.aborted)
          ),
        }).toStrictEqual({
          firstCallFailed: true,
          callerAborted: true,
        });
        yield* Deferred.await(released);
        expect(yield* Ref.get(stopped)).toBe(1);
        const replacement = yield* Effect.tryPromise({
          catch: () => new McpClientProbeFailed({ operation: "calculate" }),
          try: () =>
            client.callTool({ arguments: input, name: "taxkit_calculate" }),
        });
        const checked = yield* Schema.decodeUnknownEffect(
          McpSchema.CallToolResult
        )(replacement);
        expect({
          callSucceeded: checked.isError === false,
          calculation: yield* Schema.decodeUnknownEffect(CalculatorRunResponse)(
            checked.structuredContent
          ).pipe(Effect.flatMap(Schema.encodeEffect(CalculatorRunResponse))),
        }).toStrictEqual({
          callSucceeded: true,
          calculation: yield* calculator
            .calculate(CalculationRequest)
            .pipe(Effect.flatMap(Schema.encodeEffect(CalculatorRunResponse))),
        });
        // Close the remaining client calls and wait for every owned calculation.
        yield* EffectFunction.pipe(
          aborts,
          Effect.forEach((abort) =>
            Effect.sync(() => {
              abort.abort();
            })
          )
        );
        yield* Effect.forEach(calls, Fiber.join, { concurrency: "unbounded" });
        expect(yield* Ref.get(stopped)).toBe(CalculatorConcurrencyLimit + 1);
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.provide(CalculatorLive),
        Effect.scoped
      )
  );
  it.effect(
    "returns the retained calculator report and accepted page, and keeps each caller's shared allowance",
    () =>
      Effect.gen(function* () {
        const counters = yield* Ref.make(HashMap.empty<string, number>());
        const app = yield* ApiWorkerInit.pipe(
          Effect.provideService(
            CalculatorAdmission,
            CalculatorAdmission.of({
              admitCalculation: Effect.fn(
                "CalculatorAdmission.admitCalculation"
              )((key) =>
                Ref.modify(counters, (counts) => {
                  const identity = NetAddress.formatIp(Redacted.value(key));
                  const count =
                    HashMap.get(counts, identity).pipe(
                      Option.getOrElse(() => 0)
                    ) + 1;
                  return [count, HashMap.set(counts, identity, count)] as const;
                }).pipe(
                  Effect.flatMap((count) =>
                    EffectBoolean.match(count <= 1, {
                      onFalse: () => Effect.fail(new CalculatorRateLimited()),
                      onTrue: () => Effect.void,
                    })
                  )
                )
              ),
            })
          )
        );
        const context = yield* Effect.context();
        // The official SDK owns every HTTP frame/header. The native web bridge
        // supplies the actual request fibre and abort lifecycle; no domain runner.
        const handler = HttpEffect.toWebHandlerWith<
          never,
          Scope.Scope | HttpServerRequest.HttpServerRequest
        >(context)(app.fetch);
        const input = yield* Schema.encodeEffect(CalculatorRunServiceRequest)(
          CalculationRequest
        );
        const expected = yield* PublicCalculatorService.pipe(
          Effect.flatMap((calculator) =>
            calculator.calculate(CalculationRequest)
          )
        );
        const content = yield* ContentService;
        const pagePath =
          yield* Schema.decodeEffect(DocsPublicPagePath)("/start/quickstart");
        const expectedPage = yield* content.getPage(pagePath);
        const calculator = yield* PublicCalculatorService;
        const schemaRequest = yield* Schema.decodeEffect(GetCalculatorRequest)({
          calculatorId: CalculationRequest.calculatorId,
        });
        const schemaInput =
          yield* Schema.encodeEffect(GetCalculatorRequest)(schemaRequest);
        const expectedSchema =
          yield* calculator.getCalculatorSchema(schemaRequest);
        const expectedNavigation = yield* content.getNavigation();
        const term = yield* Schema.decodeEffect(DocsSearchTerm)("quickstart");
        const expectedSearch = yield* content.searchPages(term);
        yield* Effect.forEach(["203.0.113.77", "203.0.113.78"], (address) =>
          Effect.gen(function* () {
            const client = yield* Effect.acquireRelease(
              Effect.sync(
                () =>
                  new Client(
                    { name: "taxkit-client-qualification", version: "1" },
                    {
                      versionNegotiation: { mode: { pin: "2026-07-28" } },
                    }
                  )
              ),
              (value) => Effect.promise(() => value.close())
            );
            const transport = new StreamableHTTPClientTransport(
              new URL("https://api.example.com/mcp"),
              {
                fetch: (request, init) => handler(new Request(request, init)),
                requestInit: {
                  headers: {
                    "cf-connecting-ip": address,
                    origin: "https://website.example.com",
                  },
                },
              }
            );
            yield* Effect.tryPromise({
              catch: () => new McpClientProbeFailed({ operation: "connect" }),
              try: () => client.connect(transport),
            });
            yield* Effect.gen(function* verifyToolDiscovery() {
              EffectFunction.pipe(client.getServerCapabilities(), (actual) => {
                expect(actual).toStrictEqual({
                  completions: {},
                  logging: {},
                  tools: { listChanged: false },
                });
              });
              const listed = yield* Effect.tryPromise({
                catch: () => new McpClientProbeFailed({ operation: "list" }),
                try: () => client.listTools(),
              });
              EffectFunction.pipe(
                listed.tools,
                Array.map((tool) => tool.name),
                Array.sort(Order.String),
                (actual) => {
                  expect(actual).toStrictEqual([
                    "taxkit_calculate",
                    "taxkit_docs_navigation",
                    "taxkit_find_docs",
                    "taxkit_get_calculator_schema",
                    "taxkit_list_calculators",
                    "taxkit_read_doc",
                  ]);
                }
              );
              const catalogue = yield* Effect.tryPromise({
                catch: () =>
                  new McpClientProbeFailed({ operation: "catalogue" }),
                try: () =>
                  client.callTool({
                    arguments: {},
                    name: "taxkit_list_calculators",
                  }),
              });
              const checkedCatalogue = yield* Schema.decodeUnknownEffect(
                McpSchema.CallToolResult
              )(catalogue);
              const decodedCatalogue = yield* Schema.decodeUnknownEffect(
                CalculatorCatalogResponse
              )(checkedCatalogue.structuredContent);
              expect(decodedCatalogue.calculators).toHaveLength(3);
              const details = yield* Effect.tryPromise({
                catch: () => new McpClientProbeFailed({ operation: "schema" }),
                try: () =>
                  client.callTool({
                    arguments: schemaInput,
                    name: "taxkit_get_calculator_schema",
                  }),
              });
              const checkedDetails = yield* Schema.decodeUnknownEffect(
                McpSchema.CallToolResult
              )(details);
              expect(
                yield* Schema.decodeUnknownEffect(CalculatorSchemaResponse)(
                  checkedDetails.structuredContent
                ).pipe(
                  Effect.flatMap(Schema.encodeEffect(CalculatorSchemaResponse))
                )
              ).toStrictEqual(
                yield* Schema.encodeEffect(CalculatorSchemaResponse)(
                  expectedSchema
                )
              );
              const navigation = yield* Effect.tryPromise({
                catch: () =>
                  new McpClientProbeFailed({ operation: "navigation" }),
                try: () =>
                  client.callTool({
                    arguments: {},
                    name: "taxkit_docs_navigation",
                  }),
              });
              const checkedNavigation = yield* Schema.decodeUnknownEffect(
                McpSchema.CallToolResult
              )(navigation);
              expect(
                yield* Schema.decodeUnknownEffect(DocsPublicNavigation)(
                  checkedNavigation.structuredContent
                )
              ).toStrictEqual(expectedNavigation);
              const searched = yield* Effect.tryPromise({
                catch: () => new McpClientProbeFailed({ operation: "search" }),
                try: () =>
                  client.callTool({
                    arguments: { term },
                    name: "taxkit_find_docs",
                  }),
              });
              const checkedSearch = yield* Schema.decodeUnknownEffect(
                McpSchema.CallToolResult
              )(searched);
              expect(
                (yield* Schema.decodeUnknownEffect(McpDocsSearchResponse)(
                  checkedSearch.structuredContent
                )).results
              ).toStrictEqual(expectedSearch);
            }).pipe(Effect.withSpan("verifyToolDiscovery"));
            yield* Effect.gen(function* verifyCalculationAdmission() {
              const invalid = yield* Effect.tryPromise({
                catch: () =>
                  new McpClientProbeFailed({ operation: "calculate" }),
                try: () =>
                  client.callTool({
                    arguments: { calculatorId: "PRIVATE-INPUT-77" },
                    name: "taxkit_calculate",
                  }),
              });
              const checkedInvalid = yield* Schema.decodeUnknownEffect(
                McpSchema.CallToolResult
              )(invalid);
              expect(checkedInvalid.isError === true).toBeTruthy();
              expect(
                yield* Schema.encodeEffect(
                  Schema.fromJsonString(McpSchema.CallToolResult)
                )(checkedInvalid)
              ).not.toContain("PRIVATE-INPUT-77");
              EffectFunction.pipe(
                HashMap.has(yield* Ref.get(counters), address),
                (actual) => {
                  expect(!actual).toBeTruthy();
                }
              );
              const calculated = yield* Effect.tryPromise({
                catch: () =>
                  new McpClientProbeFailed({ operation: "calculate" }),
                try: () =>
                  client.callTool({
                    arguments: input,
                    name: "taxkit_calculate",
                  }),
              });
              const checked = yield* Schema.decodeUnknownEffect(
                McpSchema.CallToolResult
              )(calculated);
              expect({
                callSucceeded: checked.isError === false,
                calculation: yield* Schema.decodeUnknownEffect(
                  CalculatorRunResponse
                )(checked.structuredContent).pipe(
                  Effect.flatMap(Schema.encodeEffect(CalculatorRunResponse))
                ),
              }).toStrictEqual({
                callSucceeded: true,
                calculation: yield* Schema.encodeEffect(CalculatorRunResponse)(
                  expected
                ),
              });
            }).pipe(Effect.withSpan("verifyCalculationAdmission"));
            yield* Effect.gen(function* verifyDocumentationAndLimit() {
              const read = yield* Effect.tryPromise({
                catch: () => new McpClientProbeFailed({ operation: "read" }),
                try: () =>
                  client.callTool({
                    arguments: { path: pagePath },
                    name: "taxkit_read_doc",
                  }),
              });
              const checkedPage = yield* Schema.decodeUnknownEffect(
                McpSchema.CallToolResult
              )(read);
              expect(
                yield* Schema.decodeUnknownEffect(DocsPublicPage)(
                  checkedPage.structuredContent
                )
              ).toStrictEqual(expectedPage);
              const limited = yield* Effect.tryPromise({
                catch: () => new McpClientProbeFailed({ operation: "limit" }),
                try: () =>
                  client.callTool({
                    arguments: input,
                    name: "taxkit_calculate",
                  }),
              });
              const checkedLimit = yield* Schema.decodeUnknownEffect(
                McpSchema.CallToolResult
              )(limited);
              expect(checkedLimit.isError === true).toBeTruthy();
              const text = EffectFunction.pipe(
                checkedLimit.content,
                Array.findFirst((block) => block.type === "text")
              );
              EffectFunction.pipe(Option.isSome(text), (actual) => {
                expect(actual).toBeTruthy();
              });
              if (Option.isSome(text) && text.value.type === "text") {
                const refusal = yield* Schema.decodeEffect(
                  Schema.fromJsonString(McpToolUnavailable)
                )(text.value.text);
                expect({
                  refusalCode: refusal.code,
                  refusalRetry: refusal.retry,
                }).toStrictEqual({
                  refusalCode: "rate-limited",
                  refusalRetry: "wait-then-try-manually",
                });
                Array.forEach((marker: string) => {
                  expect(text.value.text).not.toContain(marker);
                })([address, "165400"]);
              }
              expect(transport.sessionId).toBeUndefined();
            }).pipe(Effect.withSpan("verifyDocumentationAndLimit"));
          }).pipe(Effect.scoped)
        );
        expect({
          HashMapSizeYieldRefGetCounters: HashMap.size(
            yield* Ref.get(counters)
          ),
          runtimeLinesYieldTestConsoleLogLines: runtimeLines(
            yield* TestConsole.logLines
          ),
        }).toStrictEqual({
          HashMapSizeYieldRefGetCounters: 2,
          runtimeLinesYieldTestConsoleLogLines: [],
        });
      }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, settings),
        Effect.provide(ApiContentLive),
        Effect.provide(TestConsole.layer),
        // Direct retained-report oracle keeps admission outside the pure engine.
        Effect.provide(CalculatorLive),
        Effect.scoped
      )
  );
});
