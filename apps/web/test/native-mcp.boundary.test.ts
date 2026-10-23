import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { McpDocsSearchResponse } from "@taxkit/api-mcp/schemas";
import {
  CalculatorCatalogResponse,
  CalculatorSchemaResponse,
  GetCalculatorRequest,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/calculators/schemas";
import { CalculationRequest } from "@taxkit/calculators/testing/fixtures";
import {
  DocsPublicPage,
  DocsPublicNavigation,
  DocsSearchResult,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import { HostRequestRecord } from "@taxkit/observability/host-telemetry";
import {
  Array,
  Clock,
  Duration,
  Effect,
  Fiber,
  Match,
  Option,
  Path,
  Queue,
  Record,
  Result,
  Schema,
} from "effect";
import { McpSchema } from "effect/ai";
import { Headers } from "effect/http";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";
import { chromium } from "playwright";
import { build as buildBrowserClient } from "vite";

import {
  NativeMcpResumeProgress,
  nativeMcpResumeFixture,
} from "./native-mcp.fixture";
import { readWorkerModules } from "./native-modules.fixture";
import { nativeRateFixture } from "./native-rate.fixture";

class NativeMcpClientFailed extends Schema.TaggedError<NativeMcpClientFailed>()(
  "NativeMcpClientFailed",
  {
    operation: Schema.Literals([
      "connect",
      "list",
      "catalogue",
      "schema",
      "search",
      "calculate",
      "read",
      "limit",
      "cancel",
      "browser-bundle",
    ]),
  }
) {}

const NativeMcpWorkLog = Schema.fromJsonString(
  Schema.Struct({
    event: Schema.Literal("api.runtime.event"),
    level: Schema.Literals(["Info", "Warn"]),
    service: Schema.Literal("taxkit-api"),
    timestamp: Schema.String,
  })
);

it.live(
  "serves real MCP client calls through the built native API and shares its HTTP allowance",
  () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const modulesRoot = path.resolve(
        "../../.alchemy/native-pair/bundles/TaxKitApi"
      );
      const { files, modules, wasm } = yield* readWorkerModules(modulesRoot);
      expect(files).toContain("worker.js");
      expect(
        Array.some(Record.values(modules), (module) =>
          /[\w$]+\.runInAsyncScope\(this\.evaluate,this,/u.test(module.contents)
        )
      ).toBe(true);
      const logs = yield* Queue.make<WorkerdStructuredLog>();
      const exceptions = yield* Queue.make<string>();
      const host = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleStructuredLogs: (log) => {
                Queue.offerUnsafe(logs, log);
              },
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 0,
              workers: [
                {
                  config: {
                    compatibilityDate: "2026-10-04",
                    compatibilityFlags: ["nodejs_compat"],
                    env: {
                      ...nativeRateFixture("10087"),
                      API_PUBLIC_ORIGIN: {
                        type: "json",
                        value: "http://127.0.0.1:4218",
                      },
                      CALCULATOR_RATE_LIMIT: {
                        namespace: "10087",
                        simple: { limit: 3, period: 60 as const },
                        type: "rate-limit",
                      },
                      TAXKIT_PUBLICATION_ORIGIN: {
                        type: "json",
                        value: "https://website.example.com",
                      },
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: "https://website.example.com",
                      },
                      WORKER_URL: {
                        type: "json",
                        value: "http://127.0.0.1:4218",
                      },
                    },
                    manifest: {
                      mainModule: "mcp-resume-probe.js",
                      modules: { ...nativeMcpResumeFixture(modules), ...wasm },
                      modulesRoot,
                    },
                    name: "api-mcp",
                  },
                },
              ],
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      yield* Effect.logInfo("native-mcp: starting local host");
      const address = yield* Effect.promise(() => host.ready);
      yield* Effect.logInfo("native-mcp: host ready");
      const api = yield* Effect.promise(() => host.getWorker("api-mcp"));
      const resumeProgress = Effect.promise(() =>
        api.fetch("https://api.invalid/__mcp_resume_progress")
      ).pipe(
        Effect.flatMap((response) => Effect.promise(() => response.text())),
        Effect.flatMap(
          Schema.decodeEffect(Schema.fromJsonString(NativeMcpResumeProgress))
        )
      );
      // Concurrent first use must share registration while keeping protocol
      // work and cancellation local to each native request.
      yield* Effect.forEach(
        Array.range(1, 3),
        (number) =>
          Effect.gen(function* () {
            const cold = yield* Effect.acquireRelease(
              Effect.sync(
                () =>
                  new Client(
                    { name: `taxkit-cold-${number}`, version: "1" },
                    { versionNegotiation: { mode: { pin: "2026-07-28" } } }
                  )
              ),
              (value) => Effect.promise(() => value.close())
            );
            yield* Effect.tryPromise({
              catch: () => new NativeMcpClientFailed({ operation: "connect" }),
              try: () =>
                cold.connect(
                  new StreamableHTTPClientTransport(new URL("/mcp", address))
                ),
            });
            const tools = yield* Effect.tryPromise({
              catch: () => new NativeMcpClientFailed({ operation: "list" }),
              try: () => cold.listTools(),
            });
            expect(tools.tools).toHaveLength(6);
          }).pipe(Effect.scoped),
        { concurrency: "unbounded" }
      ).pipe(
        // Inspect the native observer even if cold clients fail before the
        // later snapshots; an ordinary transport error hides escaped resumes.
        Effect.onError(() =>
          resumeProgress.pipe(
            Effect.tap((progress) =>
              Effect.sync(() => {
                expect(progress.errors).toEqual([]);
              })
            ),
            Effect.orDie
          )
        )
      );
      const client = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Client(
              { name: "taxkit-native-client", version: "1" },
              {
                versionNegotiation: { mode: { pin: "2026-07-28" } },
              }
            )
        ),
        (value) => Effect.promise(() => value.close())
      );
      // The official client owns real TCP fetch, request frames and response parsing.
      const transport = new StreamableHTTPClientTransport(
        new URL("/mcp", address),
        {
          requestInit: { headers: { "cf-connecting-ip": "127.0.0.1" } },
        }
      );
      yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "connect" }),
        try: () => client.connect(transport),
      });
      yield* Effect.logInfo("native-mcp: client connected");
      const listed = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "list" }),
        try: () => client.listTools(),
      });
      yield* Effect.logInfo("native-mcp: tools listed");
      expect(listed.tools).toHaveLength(6);
      expect(transport.sessionId).toBeUndefined();
      const httpNavigation = yield* Effect.promise(() =>
        api.fetch("http://127.0.0.1:4218/api/v1/docs/navigation")
      );
      expect(httpNavigation.status).toBe(200);
      const expectedNavigation = yield* Schema.decodeEffect(
        Schema.fromJsonString(DocsPublicNavigation)
      )(yield* Effect.promise(() => httpNavigation.text()));
      const before = yield* resumeProgress;
      // Request A has completed. Each later request must resume native Effect
      // callbacks successfully; HTTP 200 and ordinary log hooks alone were
      // falsely green for the former retained notification consumer.
      yield* Effect.forEach(Array.range(1, 3), () =>
        Effect.gen(function* () {
          const laterTools = yield* Effect.tryPromise({
            catch: () => new NativeMcpClientFailed({ operation: "list" }),
            try: () => client.listTools(),
          });
          expect(laterTools.tools).toHaveLength(6);
          const navigation = yield* Effect.tryPromise({
            catch: () => new NativeMcpClientFailed({ operation: "read" }),
            try: () =>
              client.callTool({
                arguments: {},
                name: "taxkit_docs_navigation",
              }),
          });
          const checkedNavigation = yield* Schema.decodeUnknownEffect(
            McpSchema.CallToolResult
          )(navigation);
          expect(checkedNavigation.isError).toBe(false);
          expect(
            yield* Schema.decodeUnknownEffect(DocsPublicNavigation)(
              checkedNavigation.structuredContent
            )
          ).toEqual(expectedNavigation);
        })
      );
      // Complete native replies for every metadata tool must agree with the
      // owning HTTP codecs and actual native API, without spending tax quota.
      const catalogue = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "catalogue" }),
        try: () =>
          client.callTool({ arguments: {}, name: "taxkit_list_calculators" }),
      });
      const checkedCatalogue = yield* Schema.decodeUnknownEffect(
        McpSchema.CallToolResult
      )(catalogue);
      expect(checkedCatalogue.isError).toBe(false);
      const catalogueReply = yield* Schema.decodeUnknownEffect(
        CalculatorCatalogResponse
      )(checkedCatalogue.structuredContent);
      expect(catalogueReply.calculators).toHaveLength(3);
      expect(
        Array.map(
          catalogueReply.calculators,
          (calculator) => calculator.calculatorId
        )
      ).toEqual(
        expect.arrayContaining([
          "au.pay.take-home",
          "au.pay.withholdings",
          "au.income-tax.annual",
        ])
      );
      const httpCatalogue = yield* Effect.promise(() =>
        api.fetch("http://127.0.0.1:4218/api/v1/calculators")
      );
      expect(httpCatalogue.status).toBe(200);
      expect(
        yield* Schema.decodeEffect(
          Schema.fromJsonString(CalculatorCatalogResponse)
        )(yield* Effect.promise(() => httpCatalogue.text()))
      ).toEqual(catalogueReply);
      const schemaRequest = yield* Schema.decodeEffect(GetCalculatorRequest)({
        calculatorId: CalculationRequest.calculatorId,
      });
      const schemaInput =
        yield* Schema.encodeEffect(GetCalculatorRequest)(schemaRequest);
      const details = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "schema" }),
        try: () =>
          client.callTool({
            arguments: schemaInput,
            name: "taxkit_get_calculator_schema",
          }),
      });
      const checkedDetails = yield* Schema.decodeUnknownEffect(
        McpSchema.CallToolResult
      )(details);
      expect(checkedDetails.isError).toBe(false);
      const schemaReply = yield* Schema.decodeUnknownEffect(
        CalculatorSchemaResponse
      )(checkedDetails.structuredContent);
      expect(schemaReply.calculator.calculatorId).toBe(
        CalculationRequest.calculatorId
      );
      expect(schemaReply.inputFacts.length).toBeGreaterThan(0);
      const httpSchema = yield* Effect.promise(() =>
        api.fetch(
          `http://127.0.0.1:4218/api/v1/calculators/${CalculationRequest.calculatorId}/schema`
        )
      );
      expect(httpSchema.status).toBe(200);
      expect(
        yield* Schema.decodeEffect(
          Schema.fromJsonString(CalculatorSchemaResponse)
        )(yield* Effect.promise(() => httpSchema.text()))
      ).toEqual(schemaReply);
      const term = yield* Schema.decodeEffect(DocsSearchTerm)("quickstart");
      const searched = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "search" }),
        try: () =>
          client.callTool({ arguments: { term }, name: "taxkit_find_docs" }),
      });
      const checkedSearch = yield* Schema.decodeUnknownEffect(
        McpSchema.CallToolResult
      )(searched);
      expect(checkedSearch.isError).toBe(false);
      const searchReply = yield* Schema.decodeUnknownEffect(
        McpDocsSearchResponse
      )(checkedSearch.structuredContent);
      expect(
        Array.some(
          searchReply.results,
          (result) => result.path === "/start/quickstart"
        )
      ).toBe(true);
      const httpSearch = yield* Effect.promise(() =>
        api.fetch(
          `http://127.0.0.1:4218/api/v1/docs/search?${new URLSearchParams({ term })}`
        )
      );
      expect(httpSearch.status).toBe(200);
      expect(
        yield* Schema.decodeEffect(
          Schema.fromJsonString(Schema.Array(DocsSearchResult))
        )(yield* Effect.promise(() => httpSearch.text()))
      ).toEqual(searchReply.results);
      const after = yield* resumeProgress;
      expect(after.attempts).toBeGreaterThan(before.attempts);
      expect(after.completed).toBeGreaterThan(before.completed);
      expect(after.errors).toEqual([]);
      expect(after.completed).toBe(after.attempts);
      expect(client.getServerCapabilities()?.tools?.listChanged).toBe(false);
      const input = yield* Schema.encodeEffect(CalculatorRunServiceRequest)(
        CalculationRequest
      );
      // Keep the complete three-call burst in one workerd minute window.
      const elapsed = (yield* Clock.currentTimeMillis) % 60_000;
      if (elapsed > 55_000) {
        yield* Effect.sleep(Duration.millis(60_050 - elapsed));
      }
      const calculated = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "calculate" }),
        try: () =>
          client.callTool({ arguments: input, name: "taxkit_calculate" }),
      });
      yield* Effect.logInfo("native-mcp: calculation returned");
      const checked = yield* Schema.decodeUnknownEffect(
        McpSchema.CallToolResult
      )(calculated);
      expect(checked.isError).toBe(false);
      const report = yield* Schema.decodeUnknownEffect(CalculatorRunResponse)(
        checked.structuredContent
      );
      const body = yield* Schema.encodeEffect(
        Schema.fromJsonString(CalculatorRunServiceRequest.fields.payload)
      )(CalculationRequest.payload);
      const http = yield* Effect.promise(() =>
        api.fetch(
          "http://127.0.0.1:4218/api/v1/calculators/au.pay.take-home/calculate",
          {
            body,
            headers: {
              "cf-connecting-ip": "127.0.0.1",
              "content-type": "application/json",
            },
            method: "POST",
          }
        )
      );
      expect(http.status).toBe(200);
      expect(
        yield* Schema.decodeEffect(
          Schema.fromJsonString(CalculatorRunResponse)
        )(yield* Effect.promise(() => http.text()))
      ).toEqual(report);
      const last = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "calculate" }),
        try: () =>
          client.callTool({ arguments: input, name: "taxkit_calculate" }),
      });
      expect(
        (yield* Schema.decodeUnknownEffect(McpSchema.CallToolResult)(last))
          .isError
      ).toBe(false);
      const limited = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "limit" }),
        try: () =>
          client.callTool({ arguments: input, name: "taxkit_calculate" }),
      });
      const checkedLimit = yield* Schema.decodeUnknownEffect(
        McpSchema.CallToolResult
      )(limited);
      expect(checkedLimit.isError).toBe(true);
      const limitText = yield* Schema.encodeEffect(
        Schema.fromJsonString(McpSchema.CallToolResult)
      )(checkedLimit);
      expect(limitText).toContain("rate-limited");
      expect(limitText).toContain("wait-then-try-manually");
      expect(limitText).not.toContain("165400");
      const read = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "read" }),
        try: () =>
          client.callTool({
            arguments: { path: "/start/quickstart" },
            name: "taxkit_read_doc",
          }),
      });
      const pageResult = yield* Schema.decodeUnknownEffect(
        McpSchema.CallToolResult
      )(read);
      expect(pageResult.isError).toBe(false);
      const page = yield* Schema.decodeUnknownEffect(DocsPublicPage)(
        pageResult.structuredContent
      );
      const httpPage = yield* Effect.promise(() =>
        api.fetch(
          "http://127.0.0.1:4218/api/v1/docs/page?path=/start/quickstart"
        )
      );
      expect(httpPage.status).toBe(200);
      expect(
        yield* Schema.decodeEffect(Schema.fromJsonString(DocsPublicPage))(
          yield* Effect.promise(() => httpPage.text())
        )
      ).toEqual(page);
      expect(page.markdown.length).toBeGreaterThan(0);
      // Inspect after every tool's complete reply, including calculate/read_doc.
      // Ordinary logging callbacks cannot observe escaped native ALS failures.
      const finalProgress = yield* resumeProgress;
      expect(finalProgress.attempts).toBeGreaterThan(after.attempts);
      expect(finalProgress.completed).toBeGreaterThan(after.completed);
      expect(finalProgress.errors).toEqual([]);
      expect(finalProgress.completed).toBe(finalProgress.attempts);
      expect(yield* Queue.clear(exceptions)).toEqual([]);
      const logText = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.Unknown)
      )(yield* Queue.clear(logs));
      expect(logText).not.toContain("165400");
    }).pipe(
      Effect.timeout("20 seconds"),
      Effect.provide(NodeServices.layer),
      Effect.scoped
    ),
  30_000
);

it.live(
  "bounds modern remote disconnect work and recovers every calculation place",
  () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const root = path.resolve("../..");
      const logs = yield* Queue.make<WorkerdStructuredLog>();
      const allLogs = yield* Queue.make<WorkerdStructuredLog>();
      const workLog = Queue.take(logs).pipe(
        Effect.flatMap((log) =>
          Schema.decodeUnknownEffect(NativeMcpWorkLog)(log.message).pipe(
            Effect.map((event) => ({ ...event, message: log.message }))
          )
        )
      );
      const exceptions = yield* Queue.make<string>();
      const workers = yield* Effect.forEach(
        [
          {
            artifact: "TaxKitApiStalledWork",
            limit: 60,
            name: "modern-work",
            namespace: "10094",
          },
        ] as const,
        (fixture) =>
          Effect.gen(function* () {
            const modulesRoot = path.join(
              root,
              ".alchemy/native-pair/bundles",
              fixture.artifact
            );
            const { files, modules, wasm } =
              yield* readWorkerModules(modulesRoot);
            expect(files).toContain("worker.js");
            {
              expect(
                Record.get(modules, "worker.js").pipe(
                  Option.map((module) =>
                    module.contents.includes("PRIVATE9 metadata started")
                  )
                )
              ).toEqual(Option.some(true));
            }
            return {
              config: {
                compatibilityDate: "2026-10-04",
                compatibilityFlags: ["nodejs_compat"],
                env: {
                  ...nativeRateFixture(fixture.namespace),
                  API_PUBLIC_ORIGIN: {
                    type: "json" as const,
                    value: "http://127.0.0.1:4238",
                  },
                  CALCULATOR_RATE_LIMIT: {
                    namespace: fixture.namespace,
                    simple: { limit: fixture.limit, period: 60 as const },
                    type: "rate-limit" as const,
                  },
                  TAXKIT_PUBLICATION_ORIGIN: {
                    type: "json" as const,
                    value: "https://website.example.com",
                  },
                  WEBSITE_PUBLIC_ORIGIN: {
                    type: "json" as const,
                    value: "https://website.example.com",
                  },
                  WORKER_URL: {
                    type: "json" as const,
                    value: "http://127.0.0.1:4238",
                  },
                },
                manifest: {
                  mainModule: "worker.js",
                  modules: { ...modules, ...wasm },
                  modulesRoot,
                },
                name: fixture.name,
              },
              dev: { unsafeDirectSockets: [{ host: "127.0.0.1", port: 0 }] },
            };
          })
      );
      const host = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleStructuredLogs: (log) => {
                Queue.offerUnsafe(allLogs, log);
                // Official-client GET probes can finish after the handshake.
                // Checked request events do not prove work start or cleanup;
                // keep every raw record for the privacy assertions below.
                if (
                  Option.isNone(
                    Schema.decodeUnknownOption(
                      Schema.fromJsonString(HostRequestRecord)
                    )(log.message)
                  )
                ) {
                  Queue.offerUnsafe(logs, log);
                }
              },
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 0,
              workers,
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      yield* Effect.promise(() => host.ready);
      const workAddress = yield* Effect.promise(() =>
        host.unsafeGetDirectURL("modern-work")
      );
      const input = yield* Schema.encodeEffect(CalculatorRunServiceRequest)(
        CalculationRequest
      );
      // The modern adapter has no conversation binding for its cancellation
      // notification. A real outgoing TCP abort stops this caller, but on the
      // pinned Worker it does not release pre-response work before its budget.
      const networkControllers = yield* Queue.make<AbortController>();
      const networkStops = yield* Queue.make<true>();
      const modernWork = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Client(
              { name: "native-modern-disconnect", version: "1" },
              {
                versionNegotiation: { mode: { pin: "2026-07-28" } },
              }
            )
        ),
        (value) => Effect.promise(() => value.close())
      );
      yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "connect" }),
        try: () =>
          modernWork.connect(
            new StreamableHTTPClientTransport(new URL("/mcp", workAddress), {
              fetch: (address, init) => {
                const request = new Request(address, init);
                if (request.headers.get("mcp-method") === "tools/call") {
                  const controller = new AbortController();
                  Queue.offerUnsafe(networkControllers, controller);
                  const signal = AbortSignal.any([
                    request.signal,
                    controller.signal,
                  ]);
                  signal.addEventListener(
                    "abort",
                    () => {
                      Queue.offerUnsafe(networkStops, true);
                    },
                    { once: true }
                  );
                  return fetch(address, { ...init, signal });
                }
                return fetch(address, init);
              },
              requestInit: { headers: { "cf-connecting-ip": "127.0.0.1" } },
            })
          ),
      });
      yield* Queue.clear(logs);
      const modernStarted = yield* Clock.monotonicTimeNanos;
      const modernCalls = yield* Effect.forEach(Array.range(1, 8), () =>
        Effect.tryPromise({
          catch: () => new NativeMcpClientFailed({ operation: "calculate" }),
          try: () =>
            modernWork.callTool({ arguments: input, name: "taxkit_calculate" }),
        }).pipe(Effect.result, Effect.forkScoped)
      );
      yield* Effect.forEach(Array.range(1, 8), () =>
        workLog.pipe(
          Effect.tap((log) =>
            Effect.sync(() => {
              expect(log.level).toBe("Warn");
              expect(log.message).not.toContain("165400");
            })
          )
        )
      ).pipe(Effect.timeout("1 second"));
      const outgoingController = yield* Queue.take(networkControllers);
      yield* Effect.sync(() => {
        outgoingController.abort();
      });
      expect(yield* Queue.take(networkStops)).toBe(true);
      expect(
        Result.isFailure(yield* Fiber.join(Array.headNonEmpty(modernCalls)))
      ).toBe(true);
      expect(yield* workLog.pipe(Effect.timeoutOption("150 millis"))).toEqual(
        Option.none()
      );
      const stillBusy = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "calculate" }),
        try: () =>
          modernWork.callTool({ arguments: input, name: "taxkit_calculate" }),
      });
      const busyText = yield* Schema.encodeEffect(
        Schema.fromJsonString(McpSchema.CallToolResult)
      )(yield* Schema.decodeUnknownEffect(McpSchema.CallToolResult)(stillBusy));
      expect(stillBusy.isError).toBe(true);
      expect(busyText).toContain("capacity-exceeded");
      // Without the native keep-alive Workerd discarded the disconnected
      // invocation, including its cleanup log and occupied place. All eight
      // requests must now finalize at the existing five-second budget.
      yield* Effect.forEach(Array.range(1, 8), () =>
        workLog.pipe(
          Effect.tap((log) =>
            Effect.sync(() => {
              expect(log.level).toBe("Info");
              expect(log.message).not.toContain("165400");
            })
          )
        )
      ).pipe(Effect.timeout("6 seconds"));
      const cleanupMillis =
        Number((yield* Clock.monotonicTimeNanos) - modernStarted) / 1_000_000;
      expect(cleanupMillis).toBeGreaterThanOrEqual(4500);
      expect(cleanupMillis).toBeLessThan(6500);
      yield* Effect.forEach(modernCalls, Fiber.join);
      const recoveredCalls = yield* Effect.forEach(Array.range(1, 8), () =>
        Effect.tryPromise({
          catch: () => new NativeMcpClientFailed({ operation: "calculate" }),
          try: () =>
            modernWork.callTool({ arguments: input, name: "taxkit_calculate" }),
        }).pipe(Effect.result, Effect.forkScoped)
      );
      // Every recovered place must enter held work before any five-second
      // expiry; accepting a transport request alone cannot satisfy this oracle.
      yield* Effect.forEach(Array.range(1, 8), () =>
        workLog.pipe(
          Effect.tap((log) =>
            Effect.sync(() => {
              expect(log.level).toBe("Warn");
            })
          )
        )
      ).pipe(Effect.timeout("1 second"));
      yield* Effect.forEach(Array.range(1, 8), () =>
        workLog.pipe(
          Effect.tap((log) =>
            Effect.sync(() => {
              expect(log.level).toBe("Info");
            })
          )
        )
      ).pipe(Effect.timeout("6 seconds"));
      yield* Effect.forEach(recoveredCalls, Fiber.join);

      expect(yield* Queue.clear(exceptions)).toEqual([]);
      const logText = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.Unknown)
      )(yield* Queue.clear(allLogs));
      expect(logText).not.toContain("PRIVATE9");
      expect(logText).not.toContain("165400");
    }).pipe(
      Effect.timeout("20 seconds"),
      Effect.provide(NodeServices.layer),
      Effect.scoped
    ),
  30_000
);

it.live(
  "uses the official modern MCP client from Chromium with native origin and CORS admission",
  () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const modulesRoot = path.resolve(
        "../../.alchemy/native-pair/bundles/TaxKitApi"
      );
      const { files, modules, wasm } = yield* readWorkerModules(modulesRoot);
      expect(files).toContain("worker.js");
      const websiteOrigin = "http://127.0.0.1:4354";
      const foreignOrigin = "http://127.0.0.1:4355";
      const exceptions = yield* Queue.make<string>();
      const host = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 0,
              workers: [
                {
                  config: {
                    compatibilityDate: "2026-10-04",
                    compatibilityFlags: ["nodejs_compat"],
                    env: {
                      ...nativeRateFixture("10113"),
                      API_PUBLIC_ORIGIN: {
                        type: "json",
                        value: "http://127.0.0.1:4353",
                      },
                      TAXKIT_PUBLICATION_ORIGIN: {
                        type: "json",
                        value: "https://publication.example.com",
                      },
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: websiteOrigin,
                      },
                      WORKER_URL: {
                        type: "json",
                        value: "http://127.0.0.1:4353",
                      },
                    },
                    manifest: {
                      mainModule: "worker.js",
                      modules: { ...modules, ...wasm },
                      modulesRoot,
                    },
                    name: "browser-mcp-api",
                  },
                },
              ],
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      const endpoint = new URL("/mcp", yield* Effect.promise(() => host.ready))
        .href;
      // Serve both origin documents over real loopback connections. Synthetic
      // document fulfillment can misclassify Chromium's network address space.
      const documents = yield* Effect.forEach(
        [
          { name: "mcp-publication-document", port: 4354 },
          { name: "mcp-foreign-document", port: 4355 },
        ],
        (fixture) =>
          Effect.acquireRelease(
            Effect.sync(
              () =>
                new Miniflare({
                  cf: false,
                  host: "127.0.0.1",
                  port: fixture.port,
                  workers: [
                    {
                      config: {
                        compatibilityDate: "2026-10-04",
                        manifest: {
                          mainModule: "document.js",
                          modules: {
                            "document.js": {
                              contents:
                                'export default { fetch() { return new Response("<!doctype html><title>Native MCP browser origin</title>", { headers: { "content-type": "text/html" } }); } };',
                              type: "esm",
                            },
                          },
                          modulesRoot,
                        },
                        name: fixture.name,
                      },
                    },
                  ],
                })
            ),
            (value) => Effect.promise(() => value.dispose())
          )
      );
      yield* Effect.forEach(documents, (document) =>
        Effect.promise(() => document.ready)
      );
      // Compile only the installed official SDK into an in-memory browser
      // script. This test never rebuilds an app/package or writes an artifact.
      // Vite's synchronous virtual-module hooks require null for other IDs.
      const bundle = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "browser-bundle" }),
        try: () =>
          buildBrowserClient({
            build: {
              emptyOutDir: false,
              minify: false,
              rolldownOptions: {
                input: "native-mcp-browser-client",
                output: {
                  format: "iife",
                },
              },
              write: false,
            },
            configFile: false,
            logLevel: "silent",
            plugins: [
              {
                load: (id) =>
                  id === "\0native-mcp-browser-client"
                    ? 'import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"; globalThis.TaxKitNativeMcpClient = { Client, StreamableHTTPClientTransport };'
                    : null,
                name: "native-mcp-browser-client",
                resolveId: (id) =>
                  id === "native-mcp-browser-client"
                    ? "\0native-mcp-browser-client"
                    : null,
              },
            ],
            resolve: { conditions: ["browser", "import", "default"] },
          }),
      }).pipe(
        Effect.flatMap(
          Schema.decodeUnknownEffect(
            Schema.Struct({
              output: Schema.Array(
                Schema.Struct({
                  code: Schema.String,
                  type: Schema.Literal("chunk"),
                })
              ),
            })
          )
        )
      );
      expect(bundle.output).toHaveLength(1);
      const script = yield* Effect.fromOption(Array.head(bundle.output));
      const browser = yield* Effect.acquireRelease(
        Effect.promise(() => chromium.launch({ headless: true })),
        (value) => Effect.promise(() => value.close())
      );
      const context = yield* Effect.acquireRelease(
        Effect.promise(() => browser.newContext()),
        (value) => Effect.promise(() => value.close())
      );
      const page = yield* Effect.promise(() => context.newPage());
      page.on("pageerror", (error) => {
        Queue.offerUnsafe(exceptions, error.message);
      });
      const network = yield* Effect.acquireRelease(
        Effect.promise(() => context.newCDPSession(page)),
        (value) => Effect.promise(() => value.detach())
      );
      type BrowserRequest = Parameters<
        Parameters<typeof network.on<"Network.requestWillBeSent">>[1]
      >[0];
      type BrowserResponse = Parameters<
        Parameters<typeof network.on<"Network.responseReceived">>[1]
      >[0];
      type BrowserExtraResponse = Parameters<
        Parameters<typeof network.on<"Network.responseReceivedExtraInfo">>[1]
      >[0];
      const extras = yield* Queue.make<BrowserExtraResponse>();
      network.on("Network.responseReceivedExtraInfo", (event) => {
        Queue.offerUnsafe(extras, event);
      });
      type BrowserExtraRequest = Parameters<
        Parameters<typeof network.on<"Network.requestWillBeSentExtraInfo">>[1]
      >[0];
      const extraRequests = yield* Queue.make<BrowserExtraRequest>();
      network.on("Network.requestWillBeSentExtraInfo", (event) => {
        Queue.offerUnsafe(extraRequests, event);
      });
      const requests = yield* Queue.make<BrowserRequest>();
      const responses = yield* Queue.make<BrowserResponse>();
      network.on("Network.requestWillBeSent", (event) => {
        Queue.offerUnsafe(requests, event);
      });
      network.on("Network.responseReceived", (event) => {
        Queue.offerUnsafe(responses, event);
      });
      yield* Effect.promise(() => network.send("Network.enable"));
      // MCP traffic is never intercepted, stripped of Origin, or given a
      // custom fetch adapter. Chromium owns the actual cross-origin requests.
      yield* Effect.promise(() => page.goto(websiteOrigin));
      yield* Effect.promise(() => page.addScriptTag({ content: script.code }));
      // Playwright's serialized browser callback is a required host boundary.
      // The official SDK owns discovery, frames, transport headers and close.
      const invoke = `async ({ endpoint, legacy }) => {
        const { Client, StreamableHTTPClientTransport } = TaxKitNativeMcpClient;
        const client = new Client({ name: "native-chromium-mcp", version: "1" },
          legacy
            ? { supportedProtocolVersions: ["2025-11-25"], versionNegotiation: { mode: "legacy" } }
            : { versionNegotiation: { mode: { pin: "2026-07-28" } } });
        const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
          requestInit: { credentials: "omit", headers: {
            b3: "0", traceparent: "00-11111111111111111111111111111111-2222222222222222-01"
          } }
        });
        try {
          await client.connect(transport);
          const reply = await client.callTool({ name: "taxkit_list_calculators", arguments: {} });
          return { _tag: "Complete", capabilities: client.getServerCapabilities(), reply };
        } catch {
          return { _tag: "Refused" };
        } finally {
          await client.close();
        }
      }`;
      const BrowserReply = Schema.Union([
        Schema.TaggedStruct("Complete", {
          capabilities: McpSchema.ServerCapabilities,
          reply: McpSchema.CallToolResult,
        }),
        Schema.TaggedStruct("Refused", {}),
      ]);
      const Invocation = Schema.fromJsonString(
        Schema.Struct({ endpoint: Schema.String, legacy: Schema.Boolean })
      );
      const modernArguments = yield* Schema.encodeEffect(Invocation)({
        endpoint,
        legacy: false,
      });
      const legacyArguments = yield* Schema.encodeEffect(Invocation)({
        endpoint,
        legacy: true,
      });
      const modernInvocation = `(${invoke})(${modernArguments})`;
      const legacyInvocation = `(${invoke})(${legacyArguments})`;
      const allowed = yield* Effect.promise(() =>
        page.evaluate(modernInvocation)
      ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(BrowserReply)));
      yield* Match.value(allowed).pipe(
        Match.tag("Complete", (value) =>
          Effect.gen(function* () {
            expect(value.capabilities.tools?.listChanged).toBe(false);
            expect(value.reply.isError).toBe(false);
            const catalogue = yield* Schema.decodeUnknownEffect(
              CalculatorCatalogResponse
            )(value.reply.structuredContent);
            expect(catalogue.calculators).toHaveLength(3);
          })
        ),
        Match.tag("Refused", () =>
          Effect.sync(() =>
            expect.fail("Permitted Chromium MCP client was refused")
          )
        ),
        Match.exhaustive
      );
      const allowedRequests = Array.filter(
        yield* Queue.clear(requests),
        (event) => event.request.url === endpoint
      );
      const allowedExtraRequests = yield* Queue.clear(extraRequests);
      const preflights = Array.filter(
        allowedRequests,
        (event) => event.request.method === "OPTIONS"
      );
      expect(preflights.length).toBeGreaterThan(0);
      expect(
        Array.some(preflights, (event) => {
          const headers = Headers.fromInput(event.request.headers);
          return (
            Headers.get(headers, "origin").pipe(
              Option.contains(websiteOrigin)
            ) &&
            Headers.get(headers, "access-control-request-headers").pipe(
              Option.exists((value) =>
                Array.every(
                  [
                    "b3",
                    "content-type",
                    "mcp-method",
                    "mcp-protocol-version",
                    "traceparent",
                  ],
                  (header) => value.toLowerCase().includes(header)
                )
              )
            )
          );
        })
      ).toBe(true);
      expect(
        Array.some(allowedRequests, (event) => {
          const headers = Headers.merge(
            Headers.fromInput(event.request.headers),
            Array.findFirst(
              allowedExtraRequests,
              (extra) => extra.requestId === event.requestId
            ).pipe(
              Option.map((extra) => Headers.fromInput(extra.headers)),
              Option.getOrElse(() => Headers.empty)
            )
          );
          return (
            event.request.method === "POST" &&
            Headers.get(headers, "origin").pipe(
              Option.contains(websiteOrigin)
            ) &&
            Headers.get(headers, "mcp-protocol-version").pipe(
              Option.contains("2026-07-28")
            ) &&
            Headers.get(headers, "mcp-name").pipe(
              Option.contains("taxkit_list_calculators")
            )
          );
        })
      ).toBe(true);
      const allowedResponses = Array.filter(
        yield* Queue.clear(responses),
        (event) => event.response.url === endpoint
      );
      expect(
        Array.some(
          allowedResponses,
          (event) =>
            event.response.status === 200 &&
            Headers.get(
              Headers.fromInput(event.response.headers),
              "access-control-allow-origin"
            ).pipe(Option.contains(websiteOrigin))
        )
      ).toBe(true);
      // Chromium can cache every header granted by the first preflight, so
      // tools/call need not issue a second OPTIONS for its added mcp-name.
      expect(
        Array.some(
          allowedResponses,
          (event) =>
            event.response.status === 204 &&
            Headers.get(
              Headers.fromInput(event.response.headers),
              "access-control-allow-headers"
            ).pipe(
              Option.exists((value) =>
                Array.every(
                  [
                    "b3",
                    "content-type",
                    "mcp-method",
                    "mcp-name",
                    "mcp-protocol-version",
                    "traceparent",
                  ],
                  (header) => value.toLowerCase().includes(header)
                )
              )
            )
        )
      ).toBe(true);
      expect(
        Array.every(allowedResponses, (event) =>
          Option.isNone(
            Headers.get(
              Headers.fromInput(event.response.headers),
              "access-control-allow-credentials"
            )
          )
        )
      ).toBe(true);
      const legacy = yield* Effect.promise(() =>
        page.evaluate(legacyInvocation)
      ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(BrowserReply)));
      expect(legacy._tag).toBe("Refused");
      expect(
        Array.some(
          yield* Queue.clear(responses),
          (event) =>
            event.response.url === endpoint && event.response.status === 400
        )
      ).toBe(true);
      yield* Queue.clear(requests);
      yield* Queue.clear(extraRequests);
      yield* Effect.promise(() => page.goto(foreignOrigin));
      yield* Effect.promise(() => page.addScriptTag({ content: script.code }));
      const foreign = yield* Effect.promise(() =>
        page.evaluate(modernInvocation)
      ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(BrowserReply)));
      expect(foreign._tag).toBe("Refused");
      const foreignRequests = Array.filter(
        yield* Queue.clear(requests),
        (event) => event.request.url === endpoint
      );
      expect(
        Array.some(
          foreignRequests,
          (event) => event.request.method === "OPTIONS"
        )
      ).toBe(true);
      // requestWillBeSent also describes a planned POST before Chromium
      // resolves its preflight. ExtraInfo identifies actual network headers.
      const foreignPostIds = Array.map(
        Array.filter(
          foreignRequests,
          (event) => event.request.method === "POST"
        ),
        (event) => event.requestId
      );
      expect(
        Array.some(yield* Queue.clear(extraRequests), (event) =>
          Array.contains(foreignPostIds, event.requestId)
        )
      ).toBe(false);
      const foreignResponses = Array.filter(
        yield* Queue.clear(responses),
        (event) => event.response.url === endpoint
      );
      expect(
        Array.every(foreignResponses, (event) =>
          Option.isNone(
            Headers.get(
              Headers.fromInput(event.response.headers),
              "access-control-allow-origin"
            )
          )
        )
      ).toBe(true);
      const foreignPreflightIds = Array.map(
        Array.filter(
          foreignRequests,
          (event) => event.request.method === "OPTIONS"
        ),
        (event) => event.requestId
      );
      const foreignPreflightReplies = Array.filter(
        yield* Queue.clear(extras),
        (event) => Array.contains(foreignPreflightIds, event.requestId)
      );
      expect(foreignPreflightReplies.length).toBeGreaterThan(0);
      expect(
        Array.every(foreignPreflightReplies, (event) =>
          Option.isNone(
            Headers.get(
              Headers.fromInput(event.headers),
              "access-control-allow-origin"
            )
          )
        )
      ).toBe(true);
      // A safelisted request reaches the native Origin check as well, proving
      // the refusal is not only Chromium withholding a preflighted POST.
      const blocked = yield* Effect.promise(() =>
        page.evaluate(
          `(async ({ endpoint }) => {
        try { await fetch(endpoint, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}", credentials: "omit" }); return false; }
        catch { return true; }
      })(${modernArguments})`
        )
      ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Boolean)));
      expect(blocked).toBe(true);
      const forbiddenRequests = Array.filter(
        yield* Queue.clear(requests),
        (event) =>
          event.request.url === endpoint && event.request.method === "POST"
      );
      expect(forbiddenRequests).toHaveLength(1);
      // ExtraInfo retains the HTTP status even when CORS prevents exposing a
      // response to JavaScript and responseReceived is absent.
      const forbiddenIds = Array.map(
        forbiddenRequests,
        (event) => event.requestId
      );
      expect(
        Array.some(
          yield* Queue.clear(extras),
          (event) =>
            event.statusCode === 403 &&
            Array.contains(forbiddenIds, event.requestId)
        )
      ).toBe(true);
      expect(yield* Queue.clear(exceptions)).toEqual([]);
    }).pipe(
      Effect.timeout("30 seconds"),
      Effect.provide(NodeServices.layer),
      Effect.scoped
    ),
  40_000
);
