import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { CalculationRequest } from "@taxkit/api-rpc/testing/fixtures";
import {
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/calculators/schemas";
import { DocsPublicPage } from "@taxkit/content/schemas";
import {
  Array,
  Clock,
  Duration,
  Effect,
  Fiber,
  FileSystem,
  Option,
  Path,
  Queue,
  Record,
  Result,
  Schema,
} from "effect";
import { McpSchema } from "effect/ai";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";

import {
  nativeMcpSessionExports,
  nativeMcpSessionFixture,
} from "./native-mcp.fixture";
import { nativeRateFixture } from "./native-rate.fixture";

class NativeMcpClientFailed extends Schema.TaggedError<NativeMcpClientFailed>()(
  "NativeMcpClientFailed",
  {
    operation: Schema.Literals([
      "connect",
      "list",
      "calculate",
      "read",
      "limit",
      "cancel",
      "session",
    ]),
  }
) {}

it.live(
  "serves real MCP client calls through the built native API and shares its HTTP allowance",
  () =>
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
                      ...nativeMcpSessionFixture("api-mcp"),
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
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: "https://website.example.com",
                      },
                      WORKER_URL: {
                        type: "json",
                        value: "http://127.0.0.1:4218",
                      },
                    },
                    exports: nativeMcpSessionExports,
                    manifest: { mainModule: "worker.js", modules, modulesRoot },
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
  "bounds native older-client conversations, isolates cancellation and expires actual held work without a follow-up request",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = path.resolve("../..");
      const logs = yield* Queue.make<WorkerdStructuredLog>();
      const exceptions = yield* Queue.make<string>();
      const workers = yield* Effect.forEach(
        [
          {
            artifact: "TaxKitApi",
            limit: 4,
            name: "session-normal",
            namespace: "10093",
          },
          {
            artifact: "TaxKitApiStalledWork",
            limit: 60,
            name: "session-work",
            namespace: "10094",
          },
          {
            artifact: "TaxKitApiSessionExpiry",
            limit: 60,
            name: "session-expiry",
            namespace: "10095",
          },
        ] as const,
        (fixture) =>
          Effect.gen(function* () {
            const modulesRoot = path.join(
              root,
              ".alchemy/native-pair/bundles",
              fixture.artifact
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
            // The real SDK-generated class must be exported; merely declaring a
            // namespace in the emulator does not exercise the application's host.
            expect(
              Record.get(modules, "worker.js").pipe(
                Option.map((module) =>
                  module.contents.slice(-200).includes("TaxKitMcpSessions")
                )
              )
            ).toEqual(Option.some(true));
            if (fixture.artifact !== "TaxKitApi") {
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
                  ...nativeMcpSessionFixture(fixture.name),
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
                  WEBSITE_PUBLIC_ORIGIN: {
                    type: "json" as const,
                    value: "https://website.example.com",
                  },
                  WORKER_URL: {
                    type: "json" as const,
                    value: "http://127.0.0.1:4238",
                  },
                },
                exports: nativeMcpSessionExports,
                manifest: { mainModule: "worker.js", modules, modulesRoot },
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
                Queue.offerUnsafe(logs, log);
              },
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 0,
              unsafeInspectDurableObjects: true,
              workers,
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      yield* Effect.promise(() => host.ready);
      const normalAddress = yield* Effect.promise(() =>
        host.unsafeGetDirectURL("session-normal")
      );
      const outgoing = yield* Queue.make<Effect.Effect<string>>();
      const conversations = yield* Effect.forEach(Array.range(1, 2), (number) =>
        Effect.gen(function* () {
          const client = yield* Effect.acquireRelease(
            Effect.sync(
              () =>
                new Client(
                  { name: `native-session-${number}`, version: "1" },
                  {
                    supportedProtocolVersions: ["2025-11-25"],
                    versionNegotiation: { mode: "legacy" },
                  }
                )
            ),
            (value) => Effect.promise(() => value.close())
          );
          const transport = new StreamableHTTPClientTransport(
            new URL("/mcp", normalAddress),
            {
              fetch: (address, init) => {
                const request = new Request(address, init);
                if (request.method === "POST") {
                  Queue.offerUnsafe(
                    outgoing,
                    Effect.promise(() => request.text())
                  );
                }
                return fetch(address, init);
              },
              requestInit: {
                headers: {
                  "cf-connecting-ip": "127.0.0.1",
                  "x-taxkit-mcp-calculator-key": "203.0.113.9",
                },
              },
            }
          );
          yield* Effect.tryPromise({
            catch: () => new NativeMcpClientFailed({ operation: "connect" }),
            try: () => client.connect(transport),
          });
          const initialise = yield* Queue.take(outgoing);
          const body = yield* initialise;
          yield* Queue.clear(outgoing);
          expect(transport.sessionId).toMatch(/^[a-f0-9-]{36}$/u);
          expect(
            (yield* Effect.tryPromise({
              catch: () => new NativeMcpClientFailed({ operation: "list" }),
              try: () => client.listTools(),
            })).tools
          ).toHaveLength(6);
          yield* Queue.clear(outgoing);
          return { body, client, transport };
        })
      );
      const first = Array.headNonEmpty(conversations);
      const second = Array.lastNonEmpty(conversations);
      expect(first.transport.sessionId).not.toBe(second.transport.sessionId);
      const modernFrames = yield* Queue.make<Effect.Effect<string>>();
      const modern = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Client(
              { name: "native-modern-shared-allowance", version: "1" },
              { versionNegotiation: { mode: { pin: "2026-07-28" } } }
            )
        ),
        (value) => Effect.promise(() => value.close())
      );
      yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "connect" }),
        try: () =>
          modern.connect(
            new StreamableHTTPClientTransport(new URL("/mcp", normalAddress), {
              fetch: (address, init) => {
                const request = new Request(address, init);
                if (request.headers.get("mcp-method") === "tools/call") {
                  Queue.offerUnsafe(
                    modernFrames,
                    Effect.promise(() => request.text())
                  );
                }
                return fetch(address, init);
              },
              requestInit: { headers: { "cf-connecting-ip": "127.0.0.1" } },
            })
          ),
      });
      const input = yield* Schema.encodeEffect(CalculatorRunServiceRequest)(
        CalculationRequest
      );
      const elapsed = (yield* Clock.currentTimeMillis) % 60_000;
      if (elapsed > 55_000) {
        yield* Effect.sleep(Duration.millis(60_050 - elapsed));
      }
      const calculated = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "calculate" }),
        try: () =>
          first.client.callTool({ arguments: input, name: "taxkit_calculate" }),
      });
      const report = yield* Schema.decodeUnknownEffect(CalculatorRunResponse)(
        calculated.structuredContent
      );
      const modernCalculation = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "calculate" }),
        try: () =>
          modern.callTool({ arguments: input, name: "taxkit_calculate" }),
      });
      expect(
        yield* Schema.decodeUnknownEffect(CalculatorRunResponse)(
          modernCalculation.structuredContent
        )
      ).toEqual(report);
      const modernBody = yield* yield* Queue.take(modernFrames);
      yield* Effect.forEach(
        [
          { method: "tools/list", version: "2026-07-28" },
          { method: "tools/call", version: "2027-01-01" },
        ],
        (claim) =>
          Effect.gen(function* () {
            const response = yield* Effect.promise(() =>
              fetch(new URL("/mcp", normalAddress), {
                body: modernBody,
                headers: {
                  accept: "application/json, text/event-stream",
                  "content-type": "application/json",
                  "mcp-method": claim.method,
                  "mcp-name": "taxkit_calculate",
                  "mcp-protocol-version": claim.version,
                },
                method: "POST",
              })
            );
            expect(response.status).toBe(400);
          })
      );
      const httpBody = yield* Schema.encodeEffect(
        Schema.fromJsonString(CalculatorRunServiceRequest.fields.payload)
      )(CalculationRequest.payload);
      const http = yield* Effect.promise(() =>
        fetch(
          new URL(
            "/api/v1/calculators/au.pay.take-home/calculate",
            normalAddress
          ),
          {
            body: httpBody,
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
      expect(
        (yield* Effect.tryPromise({
          catch: () => new NativeMcpClientFailed({ operation: "calculate" }),
          try: () =>
            second.client.callTool({
              arguments: input,
              name: "taxkit_calculate",
            }),
        })).isError
      ).toBe(false);
      const limited = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "limit" }),
        try: () =>
          first.client.callTool({ arguments: input, name: "taxkit_calculate" }),
      });
      const limitedText = yield* Schema.encodeEffect(
        Schema.fromJsonString(McpSchema.CallToolResult)
      )(yield* Schema.decodeUnknownEffect(McpSchema.CallToolResult)(limited));
      expect(limited.isError).toBe(true);
      expect(limitedText).toContain("rate-limited");
      expect(limitedText).not.toContain("165400");
      const read = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "read" }),
        try: () =>
          first.client.callTool({
            arguments: { path: "/start/quickstart" },
            name: "taxkit_read_doc",
          }),
      });
      const page = yield* Schema.decodeUnknownEffect(DocsPublicPage)(
        read.structuredContent
      );
      const httpPage = yield* Effect.promise(() =>
        fetch(
          new URL("/api/v1/docs/page?path=/start/quickstart", normalAddress)
        )
      );
      expect(
        yield* Schema.decodeEffect(Schema.fromJsonString(DocsPublicPage))(
          yield* Effect.promise(() => httpPage.text())
        )
      ).toEqual(page);
      expect(page.markdown.length).toBeGreaterThan(0);
      yield* Effect.forEach(
        [
          ["GET", first.transport.sessionId, undefined, 405],
          ["DELETE", first.transport.sessionId, undefined, 405],
          ["POST", "invalid-id", undefined, 404],
          [
            "POST",
            first.transport.sessionId,
            "https://unapproved.example.com",
            403,
          ],
        ] as const,
        ([method, id, origin, status]) =>
          Effect.gen(function* () {
            const headers = {
              "content-type": "application/json",
              "mcp-protocol-version": "2025-11-25",
              "mcp-session-id": String(id),
              ...(origin === undefined
                ? { accept: "application/json, text/event-stream" }
                : { origin }),
            };
            const response = yield* Effect.promise(() =>
              fetch(
                new URL("/mcp", normalAddress),
                method === "POST"
                  ? { body: first.body, headers, method }
                  : { headers, method }
              )
            );
            expect(response.status).toBe(status);
          })
      );
      // All thirty further handshakes use the official native client. The
      // original two still work when the next allocation is refused.
      const additionalIds = yield* Effect.forEach(
        Array.range(1, 30),
        (number) =>
          Effect.gen(function* () {
            const client = yield* Effect.acquireRelease(
              Effect.sync(
                () =>
                  new Client(
                    { name: `native-capacity-${number}`, version: "1" },
                    {
                      supportedProtocolVersions: ["2025-11-25"],
                      versionNegotiation: { mode: "legacy" },
                    }
                  )
              ),
              (value) => Effect.promise(() => value.close())
            );
            const transport = new StreamableHTTPClientTransport(
              new URL("/mcp", normalAddress)
            );
            yield* Effect.tryPromise({
              catch: () => new NativeMcpClientFailed({ operation: "connect" }),
              try: () => client.connect(transport),
            });
            return transport.sessionId;
          })
      );
      expect(
        Array.dedupe([
          first.transport.sessionId,
          second.transport.sessionId,
          ...additionalIds,
        ])
      ).toHaveLength(32);
      const refused = yield* Effect.promise(() =>
        fetch(new URL("/mcp", normalAddress), {
          body: first.body,
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
          },
          method: "POST",
        })
      );
      expect(refused.status).toBe(429);
      expect(Number(refused.headers.get("retry-after"))).toBeGreaterThan(0);
      expect(
        (yield* Effect.tryPromise({
          catch: () => new NativeMcpClientFailed({ operation: "list" }),
          try: () => first.client.listTools(),
        })).tools
      ).toHaveLength(6);
      const reinitialise = yield* Effect.promise(() =>
        fetch(new URL("/mcp", normalAddress), {
          body: first.body,
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
            "mcp-protocol-version": "2025-11-25",
            "mcp-session-id": String(first.transport.sessionId),
          },
          method: "POST",
        })
      );
      expect(reinitialise.status).toBe(400);
      // The installed native HTTP adapter refuses initialise with an existing
      // ID before registering another session. It preserves both conversations
      // and cannot bypass the exhausted bootstrap allowance.
      const oldSecondId = second.transport.sessionId;
      expect(
        (yield* Effect.tryPromise({
          catch: () => new NativeMcpClientFailed({ operation: "session" }),
          try: () => second.client.listTools(),
        })).tools
      ).toHaveLength(6);
      expect(second.transport.sessionId).toBe(oldSecondId);
      const stillFull = yield* Effect.promise(() =>
        fetch(new URL("/mcp", normalAddress), {
          body: first.body,
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
          },
          method: "POST",
        })
      );
      expect(stillFull.status).toBe(429);
      const storage = yield* Effect.promise(() =>
        host.unsafeGetDurableObjectStorage(
          "session-normal",
          "TaxKitMcpSessions",
          { name: "legacy-mcp-v2025-11-25" }
        )
      );
      // Inspect after real reports, doc reads and all 32 conversations. Native
      // alarm bookkeeping and the emulator's name record are the only tables;
      // no application SQL or key-value table has been created.
      expect(
        yield* Effect.promise(() =>
          storage.exec(
            "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name"
          )
        )
      ).toEqual([{ name: "__miniflare_do_name" }, { name: "_cf_METADATA" }]);
      yield* Effect.promise(() =>
        host.unsafeEvictDurableObject("session-normal", "TaxKitMcpSessions", {
          name: "legacy-mcp-v2025-11-25",
        })
      );
      const evicted = yield* Effect.promise(() =>
        fetch(new URL("/mcp", normalAddress), {
          body: first.body,
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
            "mcp-protocol-version": "2025-11-25",
            "mcp-session-id": String(first.transport.sessionId),
          },
          method: "POST",
        })
      );
      expect(evicted.status).toBe(404);
      const afterEviction = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Client(
              { name: "native-after-eviction", version: "1" },
              {
                supportedProtocolVersions: ["2025-11-25"],
                versionNegotiation: { mode: "legacy" },
              }
            )
        ),
        (value) => Effect.promise(() => value.close())
      );
      const evictedTransport = new StreamableHTTPClientTransport(
        new URL("/mcp", normalAddress)
      );
      yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "connect" }),
        try: () => afterEviction.connect(evictedTransport),
      });
      expect(
        (yield* Effect.tryPromise({
          catch: () => new NativeMcpClientFailed({ operation: "list" }),
          try: () => afterEviction.listTools(),
        })).tools
      ).toHaveLength(6);
      expect(evictedTransport.sessionId).not.toBe(first.transport.sessionId);

      const workAddress = yield* Effect.promise(() =>
        host.unsafeGetDirectURL("session-work")
      );
      const workFrames = yield* Queue.make<Effect.Effect<string>>();
      const workClients = yield* Effect.forEach(Array.range(1, 2), (number) =>
        Effect.gen(function* () {
          const client = yield* Effect.acquireRelease(
            Effect.sync(
              () =>
                new Client(
                  { name: `native-cancellation-${number}`, version: "1" },
                  {
                    supportedProtocolVersions: ["2025-11-25"],
                    versionNegotiation: { mode: "legacy" },
                  }
                )
            ),
            (value) => Effect.promise(() => value.close())
          );
          const transport = new StreamableHTTPClientTransport(
            new URL("/mcp", workAddress),
            {
              fetch: (address, init) => {
                const request = new Request(address, init);
                if (request.method === "POST") {
                  Queue.offerUnsafe(
                    workFrames,
                    Effect.promise(() => request.text())
                  );
                }
                return fetch(address, init);
              },
              requestInit: { headers: { "cf-connecting-ip": "127.0.0.1" } },
            }
          );
          yield* Effect.tryPromise({
            catch: () => new NativeMcpClientFailed({ operation: "connect" }),
            try: () => client.connect(transport),
          });
          return client;
        })
      );
      yield* Queue.clear(workFrames);
      yield* Queue.clear(logs);
      const caller = Array.headNonEmpty(workClients);
      const stranger = Array.lastNonEmpty(workClients);
      const aborts = yield* Effect.acquireRelease(
        Effect.sync(() => Array.makeBy(9, () => new AbortController())),
        (controllers) =>
          Effect.forEach(
            controllers,
            (controller) => Effect.sync(() => controller.abort()),
            { discard: true }
          )
      );
      const calls = yield* Effect.forEach(Array.take(aborts, 8), (abort) =>
        Effect.tryPromise({
          catch: () => new NativeMcpClientFailed({ operation: "calculate" }),
          try: () =>
            caller.callTool(
              { arguments: input, name: "taxkit_calculate" },
              { signal: abort.signal }
            ),
        }).pipe(Effect.result, Effect.forkScoped)
      );
      yield* Effect.forEach(Array.range(1, 8), () =>
        Queue.take(logs).pipe(
          Effect.tap((log) =>
            Effect.sync(() => {
              expect(log.message).toContain("Warn");
              expect(log.message).not.toContain("PRIVATE9");
            })
          )
        )
      ).pipe(Effect.timeout("1 second"));
      const frame = yield* Queue.take(workFrames);
      const requestId = (yield* Schema.decodeEffect(
        Schema.fromJsonString(Schema.Struct({ id: McpSchema.RequestId }))
      )(yield* frame)).id;
      yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "cancel" }),
        try: () =>
          stranger.notification({
            method: "notifications/cancelled",
            params: { requestId },
          }),
      });
      expect(
        yield* Queue.take(logs).pipe(Effect.timeoutOption("150 millis"))
      ).toEqual(Option.none());
      yield* Effect.sync(() => Array.headNonEmpty(aborts).abort());
      const firstCall = yield* Array.head(calls).pipe(
        Option.match({
          onNone: () =>
            Effect.fail(new NativeMcpClientFailed({ operation: "calculate" })),
          onSome: Effect.succeed,
        })
      );
      expect(Result.isFailure(yield* Fiber.join(firstCall))).toBe(true);
      const freed = yield* Queue.take(logs).pipe(Effect.timeout("1 second"));
      expect(freed.message).toContain("Info");
      const replacement = yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "calculate" }),
        try: () =>
          caller.callTool(
            { arguments: input, name: "taxkit_calculate" },
            { signal: Array.lastNonEmpty(aborts).signal }
          ),
      }).pipe(Effect.result, Effect.forkScoped);
      expect(
        (yield* Queue.take(logs).pipe(Effect.timeout("1 second"))).message
      ).toContain("Warn");
      yield* Effect.forEach(
        aborts,
        (abort) => Effect.sync(() => abort.abort()),
        { discard: true }
      );
      yield* Effect.forEach([...calls, replacement], Fiber.join);
      yield* Effect.forEach(Array.range(1, 8), () =>
        Queue.take(logs).pipe(
          Effect.tap((log) =>
            Effect.sync(() => {
              expect(log.message).toContain("Info");
            })
          )
        )
      ).pipe(Effect.timeout("1 second"));

      // The modern adapter has no conversation binding for its cancellation
      // notification. A real outgoing TCP abort stops this caller, but on the
      // pinned Worker it does not release pre-response work before its budget.
      // Retain this negative oracle separately from older-session cancellation.
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
        Queue.take(logs).pipe(
          Effect.tap((log) =>
            Effect.sync(() => {
              expect(log.message).toContain("Warn");
              expect(log.message).not.toContain("165400");
            })
          )
        )
      ).pipe(Effect.timeout("1 second"));
      const outgoingController = yield* Queue.take(networkControllers);
      yield* Effect.sync(() => outgoingController.abort());
      expect(yield* Queue.take(networkStops)).toBe(true);
      expect(
        Result.isFailure(yield* Fiber.join(Array.headNonEmpty(modernCalls)))
      ).toBe(true);
      expect(
        yield* Queue.take(logs).pipe(Effect.timeoutOption("150 millis"))
      ).toEqual(Option.none());
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
      yield* Effect.forEach(Array.range(1, 8), () =>
        Queue.take(logs).pipe(
          Effect.tap((log) =>
            Effect.sync(() => {
              expect(log.message).toContain("Info");
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

      const expiryAddress = yield* Effect.promise(() =>
        host.unsafeGetDirectURL("session-expiry")
      );
      const expiryClient = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Client(
              { name: "native-automatic-expiry", version: "1" },
              {
                supportedProtocolVersions: ["2025-11-25"],
                versionNegotiation: { mode: "legacy" },
              }
            )
        ),
        (value) => Effect.promise(() => value.close())
      );
      const expiryTransport = new StreamableHTTPClientTransport(
        new URL("/mcp", expiryAddress),
        { requestInit: { headers: { "cf-connecting-ip": "127.0.0.1" } } }
      );
      yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "connect" }),
        try: () => expiryClient.connect(expiryTransport),
      });
      yield* Queue.clear(logs);
      const held = yield* Effect.forEach(Array.range(1, 32), () =>
        Effect.tryPromise({
          catch: () => new NativeMcpClientFailed({ operation: "session" }),
          try: () =>
            expiryClient.callTool({
              arguments: { calculatorId: "au.pay.take-home" },
              name: "taxkit_get_calculator_schema",
            }),
        }).pipe(Effect.result, Effect.forkScoped)
      );
      yield* Effect.forEach(Array.range(1, 32), () =>
        Queue.take(logs).pipe(
          Effect.tap((log) =>
            Effect.sync(() => {
              expect(log.message).toContain("Warn");
            })
          )
        )
      ).pipe(Effect.timeout("1 second"));
      const full = yield* Effect.promise(() =>
        fetch(new URL("/mcp", expiryAddress), {
          body: first.body,
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
            "mcp-protocol-version": "2025-11-25",
            "mcp-session-id": String(expiryTransport.sessionId),
          },
          method: "POST",
        })
      );
      expect(full.status).toBe(503);
      // No HTTP request or manually triggered callback runs here. The native
      // platform alarm must release every actual held operation by itself.
      yield* Effect.forEach(Array.range(1, 32), () =>
        Queue.take(logs).pipe(
          Effect.tap((log) =>
            Effect.sync(() => {
              expect(log.message).toContain("Info");
              expect(log.message).not.toContain("PRIVATE9");
            })
          )
        )
      ).pipe(Effect.timeout("3 seconds"));
      expect(
        Array.every(yield* Effect.forEach(held, Fiber.join), Result.isFailure)
      ).toBe(true);
      const stale = yield* Effect.promise(() =>
        fetch(new URL("/mcp", expiryAddress), {
          body: first.body,
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
            "mcp-protocol-version": "2025-11-25",
            "mcp-session-id": String(expiryTransport.sessionId),
          },
          method: "POST",
        })
      );
      expect(stale.status).toBe(404);
      // An expired caller receives the native 404. A new official-client
      // handshake must create a fresh conversation before tools work again.
      const expiredId = expiryTransport.sessionId;
      expect(
        Result.isFailure(
          yield* Effect.tryPromise({
            catch: () => new NativeMcpClientFailed({ operation: "session" }),
            try: () => expiryClient.listTools(),
          }).pipe(Effect.result)
        )
      ).toBe(true);
      const freshClient = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Client(
              { name: "native-fresh-conversation", version: "1" },
              {
                supportedProtocolVersions: ["2025-11-25"],
                versionNegotiation: { mode: "legacy" },
              }
            )
        ),
        (value) => Effect.promise(() => value.close())
      );
      const freshTransport = new StreamableHTTPClientTransport(
        new URL("/mcp", expiryAddress)
      );
      yield* Effect.tryPromise({
        catch: () => new NativeMcpClientFailed({ operation: "connect" }),
        try: () => freshClient.connect(freshTransport),
      });
      expect(
        (yield* Effect.tryPromise({
          catch: () => new NativeMcpClientFailed({ operation: "list" }),
          try: () => freshClient.listTools(),
        })).tools
      ).toHaveLength(6);
      expect(freshTransport.sessionId).not.toBe(expiredId);
      expect(freshTransport.sessionId).toMatch(/^[a-f0-9-]{36}$/u);
      expect(yield* Queue.clear(exceptions)).toEqual([]);
    }).pipe(
      Effect.timeout("20 seconds"),
      Effect.provide(NodeServices.layer),
      Effect.scoped
    ),
  30_000
);
