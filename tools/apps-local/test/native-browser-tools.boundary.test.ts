import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { TaxKitMcpToolkit } from "@taxkit/api-mcp/tools";
import { CalculationRequest } from "@taxkit/calculators/testing/fixtures";
import {
  Function as EffectFunction,
  Array,
  Effect,
  HashMap,
  Option,
  Order,
  Path,
  Predicate,
  Queue,
  Record,
  Ref,
  Schema,
  Stream,
} from "effect";
import { McpSchema } from "effect/ai";
import { Miniflare } from "miniflare";
import { chromium } from "playwright";
import type { Route } from "playwright";

import { nativeRateFixture } from "./native-rate.fixture";
import {
  nativeWorkerCompatibility,
  readWorkerModules,
} from "./native-worker.fixture";

const apiOrigin = "http://127.0.0.1:4231";
const websiteOrigin = "http://127.0.0.1:4230";
// The browser calls the public API directly; calculation is its only POST.
const catalogueRead = "GET /api/v2/calculators";
const calculation = (calculatorId: string) =>
  `POST /api/v2/calculators/${calculatorId}/calculate`;
const isTakeHomeCalculation = (url: URL) =>
  url.origin === apiOrigin &&
  url.pathname === "/api/v2/calculators/au.pay.take-home/calculate";
// WebMCP and remote MCP share these definitions, so they share names.
const toolNames = EffectFunction.pipe(
  Record.keys(TaxKitMcpToolkit.tools),
  Array.sort(Order.String)
);
// Both hosts answer with MCP's tool result.
const McpCallResult = McpSchema.CallToolResult;
it.live(
  "registers the API MCP tools once at the root and calls them through Chrome's real native caller",
  () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const root = path.resolve(".");
      const apiRoot = path.join(root, ".alchemy/native-pair/bundles/TaxKitApi");
      const websiteRoot = path.join(root, "apps/web/dist/server");
      const {
        files: apiFiles,
        modules: apiModules,
        wasm: apiWasm,
      } = yield* readWorkerModules({
        modulesRoot: apiRoot,
      });
      const { files: websiteFiles, modules: websiteModules } =
        yield* readWorkerModules({
          modulesRoot: websiteRoot,
        });
      expect(apiFiles).toContain("worker.js");
      expect(websiteFiles).toContain("entry.server.js");
      const exceptions = yield* Queue.make<string>();
      const apiWorker = (name: string) => ({
        config: {
          ...nativeWorkerCompatibility,
          env: {
            ...nativeRateFixture("10090"),
            API_PUBLIC_ORIGIN: { type: "json" as const, value: apiOrigin },
            TAXKIT_PUBLICATION_ORIGIN: {
              type: "json" as const,
              value: websiteOrigin,
            },
            WEBSITE_PUBLIC_ORIGIN: {
              type: "json" as const,
              value: websiteOrigin,
            },
            WORKER_URL: { type: "json" as const, value: apiOrigin },
          },
          manifest: {
            mainModule: "worker.js",
            modules: { ...apiModules, ...apiWasm },
            modulesRoot: apiRoot,
          },
          name,
        },
      });
      const api = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 4231,
              workers: [apiWorker("browser-public-api")],
            })
        ),
        (host) => Effect.promise(() => host.dispose())
      );
      const website = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 4230,
              workers: [
                {
                  config: {
                    assets: {
                      directory: path.join(root, "apps/web/dist/client"),
                      hasUserWorker: true,
                      runWorkerFirst: false,
                    },
                    ...nativeWorkerCompatibility,
                    env: {
                      ...nativeRateFixture("10091"),
                      API_PUBLIC_ORIGIN: { type: "json", value: apiOrigin },
                      TAXKIT_API: {
                        type: "worker",
                        worker: "browser-private-api",
                      },
                      TAXKIT_PUBLICATION_ORIGIN: {
                        type: "json",
                        value: websiteOrigin,
                      },
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: websiteOrigin,
                      },
                    },
                    manifest: {
                      mainModule: "entry.server.js",
                      modules: websiteModules,
                      modulesRoot: websiteRoot,
                    },
                    name: "browser-website",
                  },
                },
                apiWorker("browser-private-api"),
              ],
            })
        ),
        (host) => Effect.promise(() => host.dispose())
      );
      yield* Effect.promise(() => api.ready);
      yield* Effect.promise(() => website.ready);
      const browser = yield* Effect.acquireRelease(
        Effect.promise(() =>
          chromium.launch({
            args: ["--enable-features=WebMCP"],
            headless: true,
          })
        ),
        (host) => Effect.promise(() => host.close())
      );
      const context = yield* Effect.acquireRelease(
        Effect.promise(() => browser.newContext()),
        (host) => Effect.promise(() => host.close())
      );
      const page = yield* Effect.promise(() => context.newPage());
      page.on("pageerror", (error) => {
        Queue.offerUnsafe(exceptions, error.message);
      });
      const caller = yield* Effect.acquireRelease(
        Effect.promise(() => context.newCDPSession(page)),
        (host) => Effect.promise(() => host.detach())
      );
      // Derive observations and commands from the installed caller's own types.
      // Chrome153's document caller takes JSON text; this native caller accepts
      // structured input. No invented document API or type assertion is used.
      type Added = Parameters<
        Parameters<typeof caller.on<"WebMCP.toolsAdded">>[1]
      >[0];
      type Responded = Parameters<
        Parameters<typeof caller.on<"WebMCP.toolResponded">>[1]
      >[0];
      type Removed = Parameters<
        Parameters<typeof caller.on<"WebMCP.toolsRemoved">>[1]
      >[0];
      type Input = NonNullable<
        Parameters<typeof caller.send<"WebMCP.invokeTool">>[1]
      >["input"];
      const added = yield* Queue.make<Added>();
      const replied = yield* Queue.make<Responded>();
      const observedReplies = yield* Ref.make(
        HashMap.empty<Responded["invocationId"], Responded>()
      );
      const removed = yield* Queue.make<Removed>();
      const calls = yield* Queue.make<string>();
      caller.on("WebMCP.toolsAdded", (event) => {
        Queue.offerUnsafe(added, event);
      });
      caller.on("WebMCP.toolResponded", (event) => {
        Queue.offerUnsafe(replied, event);
      });
      caller.on("WebMCP.toolsRemoved", (event) => {
        Queue.offerUnsafe(removed, event);
      });
      // Calls are calculations plus any retired Website transport path;
      // public API reads are recorded separately.
      const apiReads = yield* Queue.make<string>();
      page.on("request", (request) => {
        const url = new URL(request.url());
        const call = `${request.method()} ${url.pathname}`;
        if (url.origin === apiOrigin && request.method() === "GET") {
          Queue.offerUnsafe(apiReads, call);
        } else if (
          url.origin === apiOrigin ||
          url.pathname.startsWith("/_serverFn")
        ) {
          Queue.offerUnsafe(calls, `${call}${url.search}`);
        }
      });
      yield* Effect.promise(() => caller.send("WebMCP.enable"));
      const discover = Effect.fnUntraced(function* () {
        return yield* Stream.fromQueue(added).pipe(
          Stream.map((event) => event.tools),
          Stream.tap((tools) =>
            Effect.logInfo("native-webmcp: discovered", {
              names: EffectFunction.pipe(
                tools,
                Array.map((tool) => tool.name)
              ),
            })
          ),
          Stream.scan(
            () => Array.empty<Added["tools"][number]>(),
            (current, next) => Array.appendAll(current, next)
          ),
          Stream.filter((tools) => tools.length === toolNames.length),
          Stream.take(1),
          Stream.runHead,
          Effect.flatMap(Effect.fromOption)
        );
      });
      const waitForReply = Effect.fnUntraced(function* ({
        invocationId,
      }: {
        readonly invocationId: string;
      }) {
        const observed = yield* Ref.get(observedReplies);
        const previous = HashMap.get(observed, invocationId);
        if (Option.isSome(previous)) {
          yield* Ref.update(observedReplies, HashMap.remove(invocationId));
          return previous.value;
        }
        const response = yield* Stream.fromQueue(replied).pipe(
          Stream.tap((event) =>
            Ref.update(observedReplies, HashMap.set(event.invocationId, event))
          ),
          Stream.filter((event) => event.invocationId === invocationId),
          Stream.take(1),
          Stream.runHead,
          Effect.flatMap(Effect.fromOption)
        );
        yield* Ref.update(observedReplies, HashMap.remove(invocationId));
        return response;
      });
      // The remote MCP endpoint of the same native API, through the official
      // client: the reference every browser tool must match.
      const mcp = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Client(
              { name: "taxkit-native-webmcp-parity", version: "1" },
              { versionNegotiation: { mode: { pin: "2026-07-28" } } }
            )
        ),
        (value) => Effect.promise(() => value.close())
      );
      yield* Effect.promise(() =>
        mcp.connect(
          new StreamableHTTPClientTransport(new URL("/mcp", apiOrigin), {
            requestInit: { headers: { "cf-connecting-ip": "127.0.0.1" } },
          })
        )
      );
      const remoteTools = yield* Effect.promise(() => mcp.listTools());
      const remoteResult = Effect.fnUntraced(function* ({
        input,
        name,
      }: {
        readonly input: Input;
        readonly name: (typeof toolNames)[number];
      }) {
        return yield* Effect.promise(() =>
          mcp.callTool({ arguments: input, name })
        ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(McpCallResult)));
      });
      // CDP types `input` as a string map, but Chrome forwards any JSON object
      // to the page's tool; this guard checks that it is one, without a cast.
      const CallerInput = Schema.declare(
        (value): value is Input =>
          Predicate.isReadonlyObject(value) && !Array.isArray(value)
      );
      // An agent's JSON arguments, checked against the tool's own codec to be
      // exactly the shared calculation fixture.
      const callerCalculation = yield* Schema.decodeEffect(
        Schema.fromJsonString(CallerInput)
      )(
        '{"calculatorId":"au.pay.take-home","payload":{"facts":{"grossPay":{"_tag":"Money","cents":165400,"currency":"AUD"},"period":"weekly","taxFreeThresholdClaimed":true}}}'
      );
      const checkedCalculation = yield* Schema.decodeUnknownEffect(
        Schema.toCodecJson(
          TaxKitMcpToolkit.tools.taxkit_calculate.parametersSchema
        )
      )(callerCalculation);
      expect(checkedCalculation).toStrictEqual(CalculationRequest);
      const { tools, call } = yield* Effect.gen(function* verifyRegistration() {
        const registered = yield* Effect.promise(() =>
          page.goto(websiteOrigin)
        ).pipe(Effect.andThen(discover()));
        // Registration itself makes no API request.
        expect({
          names: EffectFunction.pipe(
            registered,
            Array.map((tool) => tool.name),
            Array.sort(Order.String)
          ),
          QueueClearCalls: yield* Queue.clear(calls),
        }).toStrictEqual({ names: toolNames, QueueClearCalls: [] });
        // Chrome reports what the page registered; it must be what remote MCP
        // lists for the same tool: description, input JSON Schema, read-only.
        const byName = Order.mapInput(
          Order.String,
          (tool: Readonly<{ name: string }>) => tool.name
        );
        const browserDefinitions = EffectFunction.pipe(
          registered,
          Array.map((tool) => ({
            description: tool.description,
            inputSchema: tool.inputSchema,
            name: tool.name,
            readOnly: tool.annotations?.readOnly ?? false,
          })),
          Array.sort(byName)
        );
        const remoteDefinitions = EffectFunction.pipe(
          remoteTools.tools,
          Array.map((tool) => ({
            description: tool.description,
            inputSchema: tool.inputSchema,
            name: tool.name,
            readOnly: tool.annotations?.readOnlyHint ?? false,
          })),
          Array.sort(byName)
        );
        expect(browserDefinitions).toStrictEqual(remoteDefinitions);
        const invoke = Effect.fnUntraced(function* ({
          currentTools,
          name,
          input,
        }: {
          readonly currentTools: readonly Added["tools"][number][];
          readonly name: (typeof toolNames)[number];
          readonly input: Input;
        }) {
          const tool = yield* EffectFunction.pipe(
            currentTools,
            Array.findFirst((entry) => entry.name === name)
          ).pipe(Effect.fromOption);
          const started = yield* Effect.promise(() =>
            caller.send("WebMCP.invokeTool", {
              frameId: tool.frameId,
              input,
              toolName: tool.name,
            })
          );
          const response = yield* waitForReply({
            invocationId: started.invocationId,
          });
          yield* Effect.logInfo("native-webmcp: tool replied", {
            name,
            status: response.status,
          });
          expect(
            response.status,
            `${name}: ${response.errorText ?? "no host detail"}`
          ).toBe("Completed");
          return yield* Schema.decodeUnknownEffect(McpCallResult)(
            response.output
          );
        });
        return { call: invoke, tools: registered };
      }).pipe(Effect.withSpan("NativeBrowserTools.verifyRegistration"));
      yield* Effect.gen(function* verifyRemoteParity() {
        // Each read answers exactly as remote MCP, through the browser's own
        // generated client against the public API.
        const reads = [
          ["taxkit_list_calculators", {}],
          [
            "taxkit_get_calculator_schema",
            { calculatorId: "au.pay.take-home" },
          ],
          ["taxkit_docs_navigation", {}],
          ["taxkit_find_docs", { term: "calculator" }],
          ["taxkit_read_doc", { path: "/start/overview" }],
        ] as const;
        yield* Effect.forEach(
          reads,
          Effect.fnUntraced(function* ([name, input]) {
            const browserResult = yield* call({
              currentTools: tools,
              input,
              name,
            });
            expect(browserResult.isError, name).toBeFalsy();
            expect(browserResult.structuredContent, name).toStrictEqual(
              (yield* remoteResult({ input, name })).structuredContent
            );
          }),
          { discard: true }
        );
        expect(yield* Queue.clear(apiReads)).toStrictEqual([
          catalogueRead,
          "GET /api/v2/calculators/au.pay.take-home/schema",
          "GET /api/v2/docs/navigation",
          "GET /api/v2/docs/search",
          "GET /api/v2/docs/page",
        ]);
        const calculated = yield* call({
          currentTools: tools,
          input: callerCalculation,
          name: "taxkit_calculate",
        });
        expect(calculated.isError).toBeFalsy();
        expect(calculated.structuredContent).toStrictEqual(
          (yield* remoteResult({
            input: callerCalculation,
            name: "taxkit_calculate",
          })).structuredContent
        );
        expect(yield* Queue.clear(calls)).toStrictEqual([
          calculation("au.pay.take-home"),
        ]);
        // Strict input fails before any request, with useful detail.
        const invalid = yield* call({
          currentTools: tools,
          input: { unexpected: "PRIVATE9" },
          name: "taxkit_list_calculators",
        });
        const detail = Array.head(invalid.content).pipe(
          Option.filter(Schema.is(McpSchema.TextContent)),
          Option.map(({ text }) => text.startsWith("Invalid input: "))
        );
        expect({
          calls: yield* Queue.clear(calls),
          detail,
          isError: invalid.isError,
          reads: yield* Queue.clear(apiReads),
        }).toStrictEqual({
          calls: [],
          detail: Option.some(true),
          isError: true,
          reads: [],
        });
      }).pipe(Effect.withSpan("NativeBrowserTools.verifyRemoteParity"));
      yield* Effect.gen(function* verifyNavigationKeepsTools() {
        // One root registration: client navigation neither removes nor
        // re-registers the tools.
        yield* Effect.promise(() =>
          page
            .locator('nav a[href="/calculators/au.income-tax.annual"]')
            .click()
        );
        yield* Effect.promise(() =>
          page.getByLabel("Annual taxable income").waitFor()
        );
        yield* Effect.promise(() =>
          page
            .getByRole("link", { exact: true, name: "For agents: API access" })
            .click()
        );
        yield* Effect.promise(() => page.waitForURL(`${websiteOrigin}/agents`));
        const listed = yield* call({
          currentTools: tools,
          input: {},
          name: "taxkit_list_calculators",
        });
        expect(listed.isError).toBeFalsy();
        expect({
          added: yield* Queue.size(added),
          removed: yield* Queue.size(removed),
        }).toStrictEqual({ added: 0, removed: 0 });
        yield* Queue.clear(apiReads);
      }).pipe(Effect.withSpan("NativeBrowserTools.verifyNavigationKeepsTools"));
      yield* Effect.gen(function* verifyToolCancellation() {
        // Hold the actual request at the browser transport, then cancel the
        // invocation from the native caller.
        const held = yield* Queue.make<Route>();
        yield* Effect.promise(() =>
          page.route(isTakeHomeCalculation, (route) => {
            Queue.offerUnsafe(held, route);
          })
        );
        const calculateTool = yield* EffectFunction.pipe(
          tools,
          Array.findFirst((tool) => tool.name === "taxkit_calculate")
        ).pipe(Effect.fromOption);
        const pending = yield* Effect.promise(() =>
          caller.send("WebMCP.invokeTool", {
            frameId: calculateTool.frameId,
            input: callerCalculation,
            toolName: calculateTool.name,
          })
        );
        const request = yield* Queue.take(held);
        yield* Effect.promise(() =>
          caller.send("WebMCP.cancelInvocation", {
            invocationId: pending.invocationId,
          })
        );
        expect(
          (yield* waitForReply({ invocationId: pending.invocationId })).status
        ).not.toBe("Completed");
        yield* Effect.promise(() => request.abort());
        yield* Effect.promise(() => page.unroute(isTakeHomeCalculation));

        yield* Queue.clear(calls);
      }).pipe(Effect.withSpan("NativeBrowserTools.verifyToolCancellation"));
      yield* Effect.gen(function* verifyDocumentLifetime() {
        // A new document registers the same tools exactly once more. Chrome
        // discards the old document's tools without a removal event; Scope
        // cleanup on unmount is proven by the Website's registration test.
        yield* Effect.promise(() => page.reload());
        const reloaded = yield* discover();
        expect({
          added: yield* Queue.size(added),
          names: EffectFunction.pipe(
            reloaded,
            Array.map((tool) => tool.name),
            Array.sort(Order.String)
          ),
        }).toStrictEqual({ added: 0, names: toolNames });
        expect(
          (yield* call({
            currentTools: reloaded,
            input: { path: "/start/overview" },
            name: "taxkit_read_doc",
          })).isError
        ).toBeFalsy();
        expect({
          QueueClearCalls: yield* Queue.clear(calls),
          QueueClearExceptions: yield* Queue.clear(exceptions),
        }).toStrictEqual({
          QueueClearCalls: [],
          QueueClearExceptions: [],
        });
        yield* Effect.logInfo("native-webmcp: actual caller completed", {
          browser: browser.version(),
          tools: tools.length,
        });
      }).pipe(Effect.withSpan("NativeBrowserTools.verifyDocumentLifetime"));
    }).pipe(
      Effect.timeout("35 seconds"),
      Effect.scoped,
      Effect.provide(NodeServices.layer)
    ),
  { timeout: 40_000 }
);
