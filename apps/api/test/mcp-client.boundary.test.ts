import { describe, expect, it } from "@effect/vitest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import {
  CalculationRequest,
  CalculatorLive,
  CalculatorFixture,
  sensitiveSentinel,
} from "@taxkit/api-rpc/testing/fixtures";
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
import {
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
} from "effect";
import type { Scope } from "effect";
import { McpSchema } from "effect/ai";
import { Headers, HttpEffect } from "effect/http";
import type { HttpServerRequest } from "effect/http";
import { NetAddress } from "effect/net";
import { TestConsole } from "effect/testing";

import { ApiContentLive } from "../src/content.boundary.js";
import { McpRequestAbortSignal } from "../src/mcp-request.service.js";
import {
  McpDocsSearchResponse,
  McpToolUnavailable,
} from "../src/mcp.schemas.js";
import { ApiWorkerApplication } from "../src/worker.application.js";
import { ApiWorkerInit } from "../src/worker.js";

class McpClientProbeFailed extends Schema.TaggedError<McpClientProbeFailed>()(
  "McpClientProbeFailed",
  {
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
  }
) {}

const settings = ConfigProvider.fromUnknown({
  API_PUBLIC_ORIGIN: "https://api.example.com",
  WEBSITE_PUBLIC_ORIGIN: "https://website.example.com",
});

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
        const context = yield* Effect.context<never>();
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
        expect(refused._tag).toBe("Failure");
        expect(yield* Ref.get(observed)).toEqual(Option.some(status));
        expect(yield* TestConsole.logLines).toEqual([]);
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
          Effect.provide(CalculatorFixture(mode))
        );
        const context = yield* Effect.context<never>();
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
        expect(checked.isError).toBe(true);
        const text = yield* Schema.encodeEffect(
          Schema.fromJsonString(McpSchema.CallToolResult)
        )(checked);
        expect(text).toContain(message);
        expect(text).not.toContain(sensitiveSentinel);
        expect(text).not.toContain("165400");
        const lines = yield* TestConsole.logLines;
        expect(lines.length).toBe(mode === "defect" ? 2 : 0);
        const logged = yield* Schema.encodeEffect(
          Schema.fromJsonString(Schema.Unknown)
        )(lines);
        expect(logged).not.toContain(sensitiveSentinel);
        expect(logged).not.toContain("165400");
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
                    ...calculator,
                    calculate: (request) =>
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
                          Ref.updateAndGet(stopped, (value) => value + 1).pipe(
                            Effect.andThen(Deferred.succeed(released, true))
                          )
                        )
                      ),
                  })
                )
              )
            )
          )
        );
        const context = yield* Effect.context<never>();
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
        const calls = yield* Effect.forEach(aborts, (abort) =>
          Effect.tryPromise({
            catch: () => new McpClientProbeFailed({ operation: "calculate" }),
            try: () =>
              client.callTool(
                { arguments: input, name: "taxkit_calculate" },
                { signal: abort.signal }
              ),
          }).pipe(Effect.result, Effect.forkScoped)
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
        yield* Effect.sync(() => firstAbort.abort());
        expect((yield* Fiber.join(firstCall))._tag).toBe("Failure");
        expect(
          Array.some(yield* Ref.get(toolSignals), (signal) => signal.aborted)
        ).toBe(true);
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
        expect(checked.isError).toBe(false);
        expect(
          yield* Schema.decodeUnknownEffect(CalculatorRunResponse)(
            checked.structuredContent
          )
        ).toEqual(yield* calculator.calculate(CalculationRequest));
        // Close the remaining client calls and wait for every owned calculation.
        yield* Effect.forEach(aborts, (abort) =>
          Effect.sync(() => abort.abort())
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
              admitCalculation: (key) =>
                Ref.modify(counters, (counts) => {
                  const identity = NetAddress.formatIp(Redacted.value(key));
                  const count =
                    HashMap.get(counts, identity).pipe(
                      Option.getOrElse(() => 0)
                    ) + 1;
                  return [count, HashMap.set(counts, identity, count)] as const;
                }).pipe(
                  Effect.flatMap((count) =>
                    count <= 1
                      ? Effect.void
                      : Effect.fail(new CalculatorRateLimited())
                  )
                ),
            })
          )
        );
        const context = yield* Effect.context<never>();
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
            const listed = yield* Effect.tryPromise({
              catch: () => new McpClientProbeFailed({ operation: "list" }),
              try: () => client.listTools(),
            });
            expect(
              Array.sort(
                Array.map(listed.tools, (tool) => tool.name),
                Order.String
              )
            ).toEqual([
              "taxkit_calculate",
              "taxkit_docs_navigation",
              "taxkit_find_docs",
              "taxkit_get_calculator_schema",
              "taxkit_list_calculators",
              "taxkit_read_doc",
            ]);
            const catalogue = yield* Effect.tryPromise({
              catch: () => new McpClientProbeFailed({ operation: "catalogue" }),
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
            expect(decodedCatalogue.calculators.length).toBe(3);
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
              )
            ).toEqual(expectedSchema);
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
            ).toEqual(expectedNavigation);
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
            ).toEqual(expectedSearch);

            const invalid = yield* Effect.tryPromise({
              catch: () => new McpClientProbeFailed({ operation: "calculate" }),
              try: () =>
                client.callTool({
                  arguments: { calculatorId: "PRIVATE-INPUT-77" },
                  name: "taxkit_calculate",
                }),
            });
            const checkedInvalid = yield* Schema.decodeUnknownEffect(
              McpSchema.CallToolResult
            )(invalid);
            expect(checkedInvalid.isError).toBe(true);
            expect(
              yield* Schema.encodeEffect(
                Schema.fromJsonString(McpSchema.CallToolResult)
              )(checkedInvalid)
            ).not.toContain("PRIVATE-INPUT-77");
            expect(HashMap.has(yield* Ref.get(counters), address)).toBe(false);
            const calculated = yield* Effect.tryPromise({
              catch: () => new McpClientProbeFailed({ operation: "calculate" }),
              try: () =>
                client.callTool({ arguments: input, name: "taxkit_calculate" }),
            });
            const checked = yield* Schema.decodeUnknownEffect(
              McpSchema.CallToolResult
            )(calculated);
            expect(checked.isError).toBe(false);
            expect(
              yield* Schema.decodeUnknownEffect(CalculatorRunResponse)(
                checked.structuredContent
              )
            ).toEqual(expected);
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
            ).toEqual(expectedPage);
            const limited = yield* Effect.tryPromise({
              catch: () => new McpClientProbeFailed({ operation: "limit" }),
              try: () =>
                client.callTool({ arguments: input, name: "taxkit_calculate" }),
            });
            const checkedLimit = yield* Schema.decodeUnknownEffect(
              McpSchema.CallToolResult
            )(limited);
            expect(checkedLimit.isError).toBe(true);
            const text = Array.findFirst(
              checkedLimit.content,
              (block) => block.type === "text"
            );
            expect(Option.isSome(text)).toBe(true);
            if (Option.isSome(text) && text.value.type === "text") {
              const refusal = yield* Schema.decodeEffect(
                Schema.fromJsonString(McpToolUnavailable)
              )(text.value.text);
              expect(refusal.code).toBe("rate-limited");
              expect(refusal.retry).toBe("wait-then-try-manually");
              expect(text.value.text).not.toContain(address);
              expect(text.value.text).not.toContain("165400");
            }
            expect(transport.sessionId).toBeUndefined();
          }).pipe(Effect.scoped)
        );
        expect(HashMap.size(yield* Ref.get(counters))).toBe(2);
        expect(yield* TestConsole.logLines).toEqual([]);
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
