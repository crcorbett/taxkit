import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import {
  CalculatorRunRequest,
  CalculatorRunServiceRequest,
} from "@taxkit/calculators/schemas";
import { CalculationRequest } from "@taxkit/calculators/testing/fixtures";
import {
  Function as EffectFunction,
  Array,
  Clock,
  Duration,
  Effect,
  Path,
  Queue,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import { McpSchema } from "effect/ai";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";

import { readWorkerModules } from "./native-modules.fixture";
import { nativeRateFixture } from "./native-rate.fixture";

const apiOrigin = "http://127.0.0.1:4214";
const websiteOrigin = "http://127.0.0.1:4213";
const key = "2001:db8::75";
const alias = "2001:0db8:0000:0000:0000:0000:0000:0075";
it.live("shares the built native allowance across HTTP and MCP", () =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const root = path.resolve("../..");
    const logs = yield* Queue.make<WorkerdStructuredLog>();
    const exceptions = yield* Queue.make<string>();
    const workers = yield* EffectFunction.pipe(
      [
        {
          entry: "worker.js",
          name: "api-rate",
          output: ".alchemy/native-pair/bundles/TaxKitApi",
        },
      ] as const,
      Effect.forEach((artifact) =>
        Effect.gen(function* () {
          const modulesRoot = path.join(root, artifact.output);
          const { files, modules, wasm } = yield* readWorkerModules({
            modulesRoot,
          });
          expect(files).toContain(artifact.entry);
          return {
            config: {
              compatibilityDate: "2026-10-04",
              compatibilityFlags: ["nodejs_compat"],
              env: {
                ...nativeRateFixture("10079"),
                API_PUBLIC_ORIGIN: {
                  type: "json" as const,
                  value: apiOrigin,
                },
                CALCULATOR_HOST_MODE: {
                  type: "json" as const,
                  value: "edge",
                },
                TAXKIT_PUBLICATION_ORIGIN: {
                  type: "json" as const,
                  value: websiteOrigin,
                },
                WEBSITE_PUBLIC_ORIGIN: {
                  type: "json" as const,
                  value: websiteOrigin,
                },
                WORKER_URL: {
                  type: "json" as const,
                  value: apiOrigin,
                },
              },
              manifest: {
                mainModule: artifact.entry,
                modules: { ...modules, ...wasm },
                modulesRoot,
              },
              name: artifact.name,
            },
          };
        })
      )
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
            workers,
          })
      ),
      (value) => Effect.promise(() => value.dispose())
    );
    const api = yield* Effect.promise(() => host.getWorker("api-rate"));
    const client = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Client(
            { name: "native-shared-allowance", version: "1" },
            { versionNegotiation: { mode: { pin: "2026-07-28" } } }
          )
      ),
      (value) => Effect.promise(() => value.close())
    );
    const transport = new StreamableHTTPClientTransport(
      new URL("/mcp", yield* Effect.promise(() => host.ready)),
      {
        requestInit: { headers: { "cf-connecting-ip": alias } },
      }
    );
    yield* Effect.promise(() => client.connect(transport));
    const body = yield* Schema.encodeEffect(
      Schema.fromJsonString(CalculatorRunRequest)
    )(CalculationRequest.payload);
    const calculate = (address: string) =>
      Effect.promise(() =>
        api.fetch(
          `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
          {
            body,
            headers: {
              "cf-connecting-ip": address,
              "content-type": "application/json",
            },
            method: "POST",
          }
        )
      );
    // workerd counts fixed minute windows. Keep this short burst away from
    // the reset boundary so the test observes one allowance, not two windows.
    const elapsed = (yield* Clock.currentTimeMillis) % 60_000;
    if (elapsed > 55_000) {
      yield* Effect.sleep(Duration.millis(60_050 - elapsed));
    }
    yield* Effect.forEach(Array.range(1, 57), (index) =>
      Effect.gen(function* () {
        const callerKey = EffectBoolean.match(index % 2 === 0, {
          onFalse: () => key,
          onTrue: () => alias,
        });
        const response = yield* calculate(callerKey);
        expect(response.status).toBe(200);
        expect(yield* Effect.promise(() => response.text())).toContain(
          '"cents":130100'
        );
      })
    );
    const input = yield* Schema.encodeEffect(CalculatorRunServiceRequest)(
      CalculationRequest
    );
    const mcp = yield* Effect.promise(() =>
      client.callTool({
        arguments: input,
        name: "taxkit_calculate",
      })
    );
    expect(
      (yield* Schema.decodeUnknownEffect(McpSchema.CallToolResult)(mcp)).isError
    ).not.toBeTruthy();
    expect({
      YieldCalculateAliasStatus: (yield* calculate(alias)).status,
      YieldCalculateKeyStatus: (yield* calculate(key)).status,
    }).toStrictEqual({
      YieldCalculateAliasStatus: 200,
      YieldCalculateKeyStatus: 200,
    });
    const rejected = yield* calculate(key);
    expect({
      rejectedStatus: rejected.status,
      rejectedHeadersGetRetryAfter: rejected.headers.get("retry-after"),
      YieldCalculate1985110099Status: (yield* calculate("198.51.100.99"))
        .status,
    }).toStrictEqual({
      rejectedStatus: 429,
      rejectedHeadersGetRetryAfter: "60",
      YieldCalculate1985110099Status: 200,
    });
    const exhaustedMcp = yield* Effect.promise(() =>
      client.callTool({
        arguments: input,
        name: "taxkit_calculate",
      })
    );
    expect(
      yield* Schema.encodeEffect(
        Schema.fromJsonString(McpSchema.CallToolResult)
      )(
        yield* Schema.decodeUnknownEffect(McpSchema.CallToolResult)(
          exhaustedMcp
        )
      )
    ).toContain("rate-limited");
    // Spoofed or Worker-relayed identity cannot choose a caller key.
    yield* Effect.forEach(
      [
        {},
        { "x-forwarded-for": key },
        { "cf-connecting-ip": "private-canary" },
        { "cf-connecting-ip": key, "cf-worker": "private-canary" },
      ],
      (headers) =>
        Effect.gen(function* () {
          const response = yield* Effect.promise(() =>
            api.fetch(
              `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
              {
                body,
                headers: { ...headers, "content-type": "application/json" },
                method: "POST",
              }
            )
          );
          expect(response.status).toBe(503);
          expect(yield* Effect.promise(() => response.text())).toContain(
            "calculation-admission-unavailable"
          );
        })
    );
    const catalogueStatus = (yield* Effect.promise(() =>
      api.fetch(`${apiOrigin}/api/v1/calculators`)
    )).status;
    const captured = yield* Schema.encodeEffect(
      Schema.fromJsonString(Schema.Unknown)
    )(
      EffectFunction.pipe(
        yield* Queue.clear(logs),
        Array.map((log) => log.message)
      )
    );
    yield* Effect.forEach(
      [key, alias, "198.51.100.99", "1654", "130100"],
      (sentinel) =>
        Effect.sync(() => {
          expect(captured).not.toContain(sentinel);
        })
    );
    expect({
      catalogueStatus,
      exceptions: yield* Queue.clear(exceptions),
    }).toStrictEqual({ catalogueStatus: 200, exceptions: [] });
  }).pipe(Effect.provide(NodeServices.layer), Effect.scoped)
);
