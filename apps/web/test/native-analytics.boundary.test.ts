import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { CalculatorCaptureBatch } from "@taxkit/analytics/schemas";
import { TaxKitRpcClientLive } from "@taxkit/api-rpc/live";
import { CalculatorRpcOrigin } from "@taxkit/api-rpc/schemas";
import { TaxKitRpcClient } from "@taxkit/api-rpc/service";
import { CalculationRequest } from "@taxkit/api-rpc/testing/fixtures";
import { CalculatorRunServiceRequest } from "@taxkit/calculators/schemas";
import { packEnvValue } from "alchemy/RuntimeContext";
import {
  Array,
  Clock,
  Effect,
  FileSystem,
  Fiber,
  Layer,
  Option,
  Path,
  Queue,
  Record,
  Ref,
  Schema,
  Stream,
} from "effect";
import { McpSchema } from "effect/ai";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { Miniflare, Response } from "miniflare";
import type { Request, WorkerdStructuredLog } from "miniflare";
import { chromium } from "playwright";

import {
  nativeMcpSessionExports,
  nativeMcpSessionFixture,
} from "./native-mcp.fixture";
import { nativeRateFixture } from "./native-rate.fixture";

const origin = "http://127.0.0.1:4219";

class NativeAnalyticsClientFailed extends Schema.TaggedError<NativeAnalyticsClientFailed>()(
  "NativeAnalyticsClientFailed",
  { operation: Schema.Literals(["connect", "calculate"]) }
) {}

it.live.each(["rejected", "redirect", "stalled-reply"] as const)(
  "the built native API returns tax results independently of %s analytics",
  (mode) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const modulesRoot = path.resolve(
        "../../.alchemy/native-pair/bundles/TaxKitApi"
      );
      const files = yield* fs.glob("**/*.js", { root: modulesRoot });
      expect(files).toContain("worker.js");
      const modules = Record.fromEntries(
        yield* Effect.forEach(files, (file) =>
          fs
            .readFileString(path.join(modulesRoot, file))
            .pipe(
              Effect.map(
                (contents) =>
                  [file, { contents, type: "esm" as const }] as const
              )
            )
        )
      );
      const outgoing = yield* Queue.make<Request>();
      const replies =
        yield* Queue.make<ReadableStreamDefaultController<Uint8Array>>();
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
                      ...nativeMcpSessionFixture("api-analytics"),
                      ...nativeRateFixture("10179"),
                      API_PUBLIC_ORIGIN: { type: "json", value: origin },
                      DEBUG: { type: "json", value: true },
                      POSTHOG_CAPTURE_TOKEN: {
                        type: "json",
                        value: "phc_synthetic_taxkit_capture_fixture_only",
                      },
                      POSTHOG_COLLECTION_MODE: {
                        type: "json",
                        value: "controlled-preview",
                      },
                      POSTHOG_PROJECT_ID: {
                        type: "json",
                        value: packEnvValue("79"),
                      },
                      POSTHOG_REGION: { type: "json", value: "us" },
                      POSTHOG_STAGE: { type: "json", value: "pr-179" },
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: "https://website.example.com",
                      },
                      WORKER_URL: { type: "json", value: origin },
                    },
                    exports: nativeMcpSessionExports,
                    manifest: { mainModule: "worker.js", modules, modulesRoot },
                    name: "api-analytics",
                  },
                  dev: {
                    // Miniflare requires this synchronous native callback. It only
                    // records the actual outbound request and supplies a controlled
                    // reply; all test orchestration stays in the owning Effect.
                    outboundService: {
                      handler: (request) => {
                        Queue.offerUnsafe(outgoing, request);
                        return mode === "stalled-reply"
                          ? new Response(
                              new ReadableStream<Uint8Array>({
                                start: (controller) => {
                                  Queue.offerUnsafe(replies, controller);
                                },
                              }),
                              { status: 200 }
                            )
                          : new Response("private-provider-response", {
                              headers: {
                                location: "https://private.invalid/redirect",
                              },
                              status: mode === "redirect" ? 302 : 500,
                            });
                      },
                      type: "fetcher",
                    },
                  },
                },
              ],
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      const api = yield* Effect.promise(() => host.getWorker("api-analytics"));
      const body = yield* Schema.encodeEffect(
        Schema.fromJsonString(CalculatorRunServiceRequest.fields.payload)
      )(CalculationRequest.payload);
      const calculate = (policy: string) =>
        Effect.promise(() =>
          api.fetch(
            `${origin}/api/v1/calculators/au.pay.take-home/calculate?private-query=PRIVATE9`,
            {
              body,
              headers: {
                authorization: "PRIVATE9",
                "cf-connecting-ip": "127.0.0.1",
                "content-type": "application/json",
                cookie: "private=PRIVATE9",
                "x-taxkit-collection-policy": policy,
              },
              method: "POST",
            }
          )
        );
      expect(
        (yield* calculate("deny").pipe(Effect.timeout("2 seconds"))).status
      ).toBe(200);
      expect(yield* Queue.clear(outgoing)).toEqual([]);
      const started = yield* Clock.currentTimeMillis;
      const reply = yield* calculate("allow").pipe(Effect.timeout("2 seconds"));
      expect(reply.status).toBe(200);
      expect(yield* Clock.currentTimeMillis).toBeLessThan(started + 2000);
      const request = yield* Queue.take(outgoing).pipe(
        Effect.timeout("2 seconds")
      );
      expect(request.url).toBe("https://us.i.posthog.com/batch/");
      expect(request.method).toBe("POST");
      expect(request.headers.get("cache-control")).toBe("no-store");
      yield* Effect.forEach(
        [
          "authorization",
          "cookie",
          "cf-connecting-ip",
          "x-forwarded-for",
          "traceparent",
          "tracestate",
          "baggage",
          "location",
        ],
        (name) =>
          Effect.sync(() => expect(request.headers.has(name), name).toBe(false))
      );
      const bytes = yield* Effect.promise(() => request.text());
      const batch = yield* Schema.decodeEffect(
        Schema.fromJsonString(CalculatorCaptureBatch),
        { onExcessProperty: "error" }
      )(bytes);
      const [event] = batch.batch;
      expect(event.properties.stage).toBe("pr-179");
      expect(event.properties.calculator_id).toBe("au.pay.take-home");
      expect(event.distinct_id).toBe(event.uuid);
      expect(bytes).not.toContain("PRIVATE9");
      expect(bytes).not.toContain("165400");
      if (mode === "rejected") {
        const address = yield* Effect.promise(() => host.ready);
        const rpcOrigin = yield* Schema.decodeEffect(CalculatorRpcOrigin)(
          address.origin
        );
        const transport = Layer.effect(
          HttpClient.HttpClient,
          HttpClient.HttpClient.pipe(
            Effect.map(
              HttpClient.mapRequest(
                HttpClientRequest.setHeaders({
                  "cf-connecting-ip": "127.0.0.1",
                  "x-taxkit-collection-policy": "allow",
                })
              )
            )
          )
        ).pipe(Layer.provide(FetchHttpClient.layer));
        const rpc = yield* TaxKitRpcClient.pipe(
          Effect.flatMap((client) => client.calculate(CalculationRequest)),
          Effect.provide(
            TaxKitRpcClientLive(rpcOrigin).pipe(Layer.provide(transport))
          )
        );
        expect(rpc.calculator.calculatorId).toBe("au.pay.take-home");
        const nextCapture = Queue.take(outgoing).pipe(
          Effect.timeout("2 seconds"),
          Effect.flatMap((sent) => Effect.promise(() => sent.text())),
          Effect.flatMap(
            Schema.decodeEffect(Schema.fromJsonString(CalculatorCaptureBatch), {
              onExcessProperty: "error",
            })
          ),
          Effect.tap((captured) =>
            Effect.sync(() => {
              const [item] = captured.batch;
              expect(item.properties.calculator_id).toBe("au.pay.take-home");
              expect(item.properties.stage).toBe("pr-179");
              expect(item.distinct_id).toBe(item.uuid);
            })
          )
        );
        yield* nextCapture;
        const input = yield* Schema.encodeEffect(CalculatorRunServiceRequest)(
          CalculationRequest
        );
        yield* Effect.forEach(
          ["2026-07-28", "2025-11-25"] as const,
          (protocol) =>
            Effect.gen(function* () {
              const policy = yield* Ref.make("deny");
              const client = yield* Effect.acquireRelease(
                Effect.sync(
                  () =>
                    new Client(
                      { name: "native-taxkit-analytics-proof", version: "1" },
                      protocol === "2026-07-28"
                        ? { versionNegotiation: { mode: { pin: protocol } } }
                        : {
                            supportedProtocolVersions: ["2025-11-25"],
                            versionNegotiation: { mode: "legacy" },
                          }
                    )
                ),
                (value) => Effect.promise(() => value.close())
              );
              // The official transport reads this native getter for each request.
              // Only a checked test policy is read; the SDK keeps its TCP/parser.
              const mcp = new StreamableHTTPClientTransport(
                new URL("/mcp", address),
                {
                  requestInit: {
                    get headers() {
                      return {
                        "cf-connecting-ip": "127.0.0.1",
                        "x-taxkit-collection-policy": Ref.getUnsafe(policy),
                      };
                    },
                  },
                }
              );
              yield* Effect.logInfo("Native analytics MCP protocol", protocol);
              yield* Effect.tryPromise({
                catch: () =>
                  new NativeAnalyticsClientFailed({ operation: "connect" }),
                try: () => client.connect(mcp),
              });
              expect(mcp.sessionId === undefined).toBe(
                protocol === "2026-07-28"
              );
              yield* Effect.forEach(["deny", "allow", "deny"], (choice) =>
                Effect.gen(function* () {
                  yield* Ref.set(policy, choice);
                  const result = yield* Effect.tryPromise({
                    catch: () =>
                      new NativeAnalyticsClientFailed({
                        operation: "calculate",
                      }),
                    try: () =>
                      client.callTool({
                        arguments: input,
                        name: "taxkit_calculate",
                      }),
                  });
                  expect(
                    (yield* Schema.decodeUnknownEffect(
                      McpSchema.CallToolResult
                    )(result)).isError
                  ).toBe(false);
                  if (choice === "allow") {
                    yield* nextCapture;
                  } else {
                    expect(yield* Queue.clear(outgoing)).toEqual([]);
                  }
                })
              );
            }).pipe(Effect.scoped)
        );
      }
      if (mode === "stalled-reply") {
        const controller = yield* Queue.take(replies);
        yield* Stream.fromQueue(logs).pipe(
          Stream.filter(
            (log) =>
              log.message.includes("api.runtime.event") &&
              log.message.includes('"level":"Debug"')
          ),
          Stream.runHead,
          Effect.timeout("7 seconds")
        );
        const finished = yield* Clock.currentTimeMillis;
        expect(finished).toBeGreaterThanOrEqual(started + 4500);
        expect(finished).toBeLessThan(started + 7000);
        // The native send has completed with its checked deadline. Miniflare's
        // Node response bridge does not expose workerd body cancellation here;
        // finish only this controlled upstream stream before host disposal.
        yield* Effect.sync(() => controller.close());
      }
      expect(yield* Queue.clear(outgoing)).toEqual([]);
      expect(yield* Queue.clear(exceptions)).toEqual([]);
      const recorded = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.Unknown)
      )(yield* Queue.clear(logs));
      expect(recorded).not.toContain("PRIVATE9");
      expect(recorded).not.toContain("165400");
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  { timeout: 30_000 }
);

it.live(
  "the built Website forwards fresh browser and HTML collection choices without sharing visitor state",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = path.resolve("../..");
      const apiOrigin = "http://127.0.0.1:4319";
      const websiteOrigin = "http://127.0.0.1:4320";
      const apiRoot = path.join(root, ".alchemy/native-pair/bundles/TaxKitApi");
      const websiteRoot = path.join(root, "apps/web/dist/server");
      const apiFiles = yield* fs.glob("**/*.js", { root: apiRoot });
      const websiteFiles = yield* fs.glob("**/*.js", { root: websiteRoot });
      const apiModules = Record.fromEntries(
        yield* Effect.forEach(apiFiles, (file) =>
          fs
            .readFileString(path.join(apiRoot, file))
            .pipe(
              Effect.map(
                (contents) =>
                  [file, { contents, type: "esm" as const }] as const
              )
            )
        )
      );
      const websiteModules = Record.fromEntries(
        yield* Effect.forEach(websiteFiles, (file) =>
          fs
            .readFileString(path.join(websiteRoot, file))
            .pipe(
              Effect.map(
                (contents) =>
                  [file, { contents, type: "esm" as const }] as const
              )
            )
        )
      );
      expect(apiFiles).toContain("worker.js");
      expect(websiteFiles).toContain("server.js");
      const outgoing = yield* Queue.make<Request>();
      const exceptions = yield* Queue.make<string>();
      const apiWorker = (name: string) => ({
        config: {
          compatibilityDate: "2026-10-04",
          compatibilityFlags: ["nodejs_compat"],
          env: {
            ...nativeMcpSessionFixture(name),
            ...nativeRateFixture("10180"),
            API_PUBLIC_ORIGIN: { type: "json" as const, value: apiOrigin },
            POSTHOG_CAPTURE_TOKEN: {
              type: "json" as const,
              value: "phc_synthetic_taxkit_capture_fixture_only",
            },
            POSTHOG_COLLECTION_MODE: {
              type: "json" as const,
              value: "controlled-preview",
            },
            POSTHOG_PROJECT_ID: {
              type: "json" as const,
              value: packEnvValue("79"),
            },
            POSTHOG_REGION: { type: "json" as const, value: "us" },
            POSTHOG_STAGE: { type: "json" as const, value: "pr-179" },
            WEBSITE_PUBLIC_ORIGIN: {
              type: "json" as const,
              value: websiteOrigin,
            },
            WORKER_URL: { type: "json" as const, value: apiOrigin },
          },
          exports: nativeMcpSessionExports,
          manifest: {
            mainModule: "worker.js",
            modules: apiModules,
            modulesRoot: apiRoot,
          },
          name,
        },
        dev: {
          outboundService: {
            handler: (request: Request) => {
              Queue.offerUnsafe(outgoing, request);
              return new Response("", { status: 200 });
            },
            type: "fetcher" as const,
          },
        },
      });
      const publicApi = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 4319,
              workers: [apiWorker("collection-public-api")],
            })
        ),
        (value) => Effect.promise(() => value.dispose())
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
              port: 4320,
              workers: [
                {
                  config: {
                    assets: {
                      directory: path.join(root, "apps/web/dist/client"),
                      hasUserWorker: true,
                      runWorkerFirst: false,
                    },
                    compatibilityDate: "2026-10-04",
                    compatibilityFlags: ["nodejs_compat"],
                    env: {
                      API_PUBLIC_ORIGIN: { type: "json", value: apiOrigin },
                      CALCULATOR_HOST_MODE: {
                        type: "json",
                        value: "local-emulator",
                      },
                      TAXKIT_API: {
                        type: "worker",
                        worker: "collection-private-api",
                      },
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: websiteOrigin,
                      },
                    },
                    manifest: {
                      mainModule: "server.js",
                      modules: websiteModules,
                      modulesRoot: websiteRoot,
                    },
                    name: "collection-website",
                  },
                },
                apiWorker("collection-private-api"),
              ],
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      yield* Effect.promise(() => publicApi.ready);
      yield* Effect.promise(() => website.ready);
      const browser = yield* Effect.acquireRelease(
        Effect.promise(() =>
          chromium.launch({ args: ["--enable-features=WebMCP"] })
        ),
        (value) => Effect.promise(() => value.close())
      );
      const page = yield* Effect.promise(() => browser.newPage());
      const caller = yield* Effect.acquireRelease(
        Effect.promise(() => page.context().newCDPSession(page)),
        (value) => Effect.promise(() => value.detach())
      );
      type Added = Parameters<
        Parameters<typeof caller.on<"WebMCP.toolsAdded">>[1]
      >[0];
      type Responded = Parameters<
        Parameters<typeof caller.on<"WebMCP.toolResponded">>[1]
      >[0];
      const added = yield* Queue.make<Added>();
      const responded = yield* Queue.make<Responded>();
      caller.on("WebMCP.toolsAdded", (event) => {
        Queue.offerUnsafe(added, event);
      });
      caller.on("WebMCP.toolResponded", (event) => {
        Queue.offerUnsafe(responded, event);
      });
      page.on("pageerror", (error) => {
        Queue.offerUnsafe(exceptions, error.message);
      });
      yield* Effect.promise(() => caller.send("WebMCP.enable"));
      yield* Effect.promise(() => page.goto(websiteOrigin));
      yield* Effect.promise(() =>
        expect
          .poll(() =>
            page
              .getByRole("button", { exact: true, name: "Calculate" })
              .isEnabled()
          )
          .toBe(true)
      );
      const tools = yield* Stream.fromQueue(added).pipe(
        Stream.map((event) => event.tools),
        Stream.scan(
          () => Array.empty<Added["tools"][number]>(),
          (current, next) => Array.appendAll(current, next)
        ),
        Stream.filter((value) => value.length === 5),
        Stream.take(1),
        Stream.runHead,
        Effect.flatMap(Effect.fromOption),
        Effect.timeout("5 seconds")
      );
      const calculateTool = yield* Array.findFirst(
        tools,
        (tool) => tool.name === "taxkit_calculate_visible_form"
      ).pipe(Effect.fromOption);
      expect(yield* Queue.clear(outgoing)).toEqual([]);
      yield* Effect.forEach(
        [
          { callerKind: "manual", policy: "deny", preference: "1" },
          { callerKind: "manual", policy: "allow", preference: "0" },
          { callerKind: "manual", policy: "deny", preference: "1" },
          { callerKind: "manual", policy: "deny", preference: "PRIVATE9" },
          { callerKind: "manual", policy: "deny", preference: "refusing-host" },
          { callerKind: "tool", policy: "deny", preference: "1" },
          { callerKind: "tool", policy: "allow", preference: "0" },
          { callerKind: "tool", policy: "deny", preference: "1" },
        ] as const,
        ({ callerKind, preference, policy }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() =>
              page.evaluate((value) => {
                // oxlint-disable-next-line taxkit/no-object-writes -- Chromium-only fixture must change the native preference getter; application state remains Effect-owned.
                Object.defineProperty(navigator, "doNotTrack", {
                  configurable: true,
                  get: () => {
                    if (value === "refusing-host") {
                      // oxlint-disable-next-line strict-effect/no-native-work -- Deliberately refusing native browser getter; the adapter must contain this host failure.
                      throw new Error("PRIVATE9");
                    }
                    return value;
                  },
                });
              }, preference)
            );
            const pending = yield* Effect.promise(() =>
              page.waitForResponse(
                (value) =>
                  value.url() === `${apiOrigin}/rpc` &&
                  value.request().method() === "POST"
              )
            ).pipe(Effect.forkChild);
            if (callerKind === "manual") {
              yield* Effect.promise(() =>
                page
                  .getByRole("button", { exact: true, name: "Calculate" })
                  .click()
              );
            } else {
              const started = yield* Effect.promise(() =>
                caller.send("WebMCP.invokeTool", {
                  frameId: calculateTool.frameId,
                  input: {},
                  toolName: calculateTool.name,
                })
              );
              const replied = yield* Stream.fromQueue(responded).pipe(
                Stream.filter(
                  (event) => event.invocationId === started.invocationId
                ),
                Stream.take(1),
                Stream.runHead,
                Effect.flatMap(Effect.fromOption),
                Effect.timeout("5 seconds")
              );
              expect(replied.status).toBe("Completed");
            }

            const response = yield* Fiber.join(pending);
            expect(response.status()).toBe(200);
            expect(
              Record.get(
                response.request().headers(),
                "x-taxkit-collection-policy"
              )
            ).toEqual(Option.some(policy));
            yield* Effect.promise(() =>
              expect
                .poll(() =>
                  page
                    .getByRole("button", { exact: true, name: "Calculate" })
                    .isEnabled()
                )
                .toBe(true)
            );
            if (policy === "allow") {
              const request = yield* Queue.take(outgoing).pipe(
                Effect.timeout("2 seconds")
              );
              expect(request.url).toBe("https://us.i.posthog.com/batch/");
              const text = yield* Effect.promise(() => request.text());
              const batch = yield* Schema.decodeUnknownEffect(
                Schema.fromJsonString(CalculatorCaptureBatch)
              )(text, { onExcessProperty: "error" });
              expect(
                (yield* Array.get(batch.batch, 0).pipe(Effect.fromOption))
                  .properties.calculator_id
              ).toBe("au.pay.take-home");
              expect(text).not.toContain("PRIVATE9");
            }
            expect(yield* Queue.clear(outgoing)).toEqual([]);
          })
      );
      const worker = yield* Effect.promise(() =>
        website.getWorker("collection-website")
      );
      yield* Effect.forEach(
        [
          {
            allowed: false,
            headers: { dnt: "1", "x-taxkit-collection-policy": "allow" },
          },
          { allowed: true, headers: { "x-taxkit-collection-policy": "allow" } },
          { allowed: false, headers: { "x-taxkit-collection-policy": "deny" } },
          {
            allowed: false,
            headers: { "x-taxkit-collection-policy": "PRIVATE9" },
          },
          { allowed: true, headers: {} },
          { allowed: false, headers: { dnt: "1" } },
        ],
        ({ allowed, headers }) =>
          Effect.gen(function* () {
            const response = yield* Effect.promise(() =>
              worker.fetch(websiteOrigin, {
                body: "grossDollars=1654&period=weekly&taxFreeThresholdClaimed=on",
                headers: {
                  ...headers,
                  "cf-connecting-ip": "127.0.0.1",
                  "content-type": "application/x-www-form-urlencoded",
                },
                method: "POST",
              })
            );
            expect(response.status).toBe(200);
            const html = yield* Effect.promise(() => response.text());
            expect(html).toContain('value="1654"');
            expect(html).toContain("Take-home pay");
            if (allowed) {
              const request = yield* Queue.take(outgoing).pipe(
                Effect.timeout("2 seconds")
              );
              const text = yield* Effect.promise(() => request.text());
              const batch = yield* Schema.decodeUnknownEffect(
                Schema.fromJsonString(CalculatorCaptureBatch)
              )(text, { onExcessProperty: "error" });
              expect(
                (yield* Array.get(batch.batch, 0).pipe(Effect.fromOption))
                  .properties.calculator_id
              ).toBe("au.pay.take-home");
              expect(text).not.toContain("PRIVATE9");
              expect(text).not.toContain("165400");
            }
            expect(yield* Queue.clear(outgoing)).toEqual([]);
          })
      );
      yield* Effect.sleep("200 millis");
      expect(yield* Queue.clear(outgoing)).toEqual([]);
      expect(yield* Queue.clear(exceptions)).toEqual([]);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  { timeout: 30_000 }
);
