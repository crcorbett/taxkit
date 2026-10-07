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
  Clock,
  Duration,
  Effect,
  FileSystem,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { McpSchema } from "effect/ai";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";

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
                      ...nativeRateFixture("10087"),
                      API_PUBLIC_ORIGIN: {
                        type: "json",
                        value: "http://127.0.0.1:4218",
                      },
                      CALCULATOR_RATE_LIMIT: {
                        namespace: "10087",
                        simple: { limit: 3, period: 60 },
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
