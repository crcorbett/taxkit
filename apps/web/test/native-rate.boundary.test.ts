import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import {
  CalculatorRpcPayload,
  CalculatorRpcVersion,
} from "@taxkit/api-rpc/schemas";
import { CalculationRequest } from "@taxkit/api-rpc/testing/fixtures";
import {
  WebsiteForwardingCredentialHeader,
  WebsiteForwardingRateKeyHeader,
} from "@taxkit/observability/edge-identity";
import {
  Array,
  Clock,
  Duration,
  Effect,
  FileSystem,
  Match,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { McpSchema } from "effect/ai";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";

import {
  nativeForwardingFixture,
  nativeForwardingKey,
  nativeForwardingOverlapFixture,
  nativePreviousForwardingKey,
} from "./native-forwarding.fixture";
import { nativeRateFixture } from "./native-rate.fixture";

const apiOrigin = "http://127.0.0.1:4214";
const websiteOrigin = "http://127.0.0.1:4213";
const key = "2001:db8::75";
const alias = "2001:0db8:0000:0000:0000:0000:0000:0075";
const Frame = Schema.TaggedStruct("Request", {
  headers: Schema.Array(Schema.Tuple([Schema.String, Schema.String])),
  id: Schema.String,
  payload: CalculatorRpcPayload,
  tag: Schema.Literal("Calculate"),
});

it.live(
  "shares the built native allowance across HTTP, Website, MCP and every RPC batch member",
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
            entry: "worker.js",
            name: "api-rate",
            output: ".alchemy/native-pair/bundles/TaxKitApi",
          },
          {
            entry: "worker.js",
            name: "api-missing-forwarding-key",
            output: ".alchemy/native-pair/bundles/TaxKitApi",
          },
          {
            entry: "server.js",
            name: "website-rate",
            output: "apps/web/dist/server",
          },
        ] as const,
        (artifact) =>
          Effect.gen(function* () {
            const modulesRoot = path.join(root, artifact.output);
            const files = yield* fs.glob("**/*.js", { root: modulesRoot });
            expect(files).toContain(artifact.entry);
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
            const forwarding = Match.value(artifact.name).pipe(
              Match.when("api-missing-forwarding-key", () =>
                Record.remove(
                  nativeForwardingFixture,
                  "TAXKIT_WEBSITE_FORWARDING_KEY"
                )
              ),
              Match.when("api-rate", () => nativeForwardingOverlapFixture),
              Match.orElse(() => nativeForwardingFixture)
            );
            return {
              config: {
                compatibilityDate: "2026-10-04",
                compatibilityFlags: ["nodejs_compat"],
                env: {
                  ...forwarding,
                  ...(artifact.entry === "worker.js"
                    ? {
                        ...nativeRateFixture("10079"),
                      }
                    : {
                        TAXKIT_API: {
                          type: "worker" as const,
                          worker: "api-rate",
                        },
                      }),
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
                    value:
                      artifact.entry === "worker.js"
                        ? apiOrigin
                        : websiteOrigin,
                  },
                },

                manifest: { mainModule: artifact.entry, modules, modulesRoot },
                name: artifact.name,
              },
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
              workers,
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      const api = yield* Effect.promise(() => host.getWorker("api-rate"));
      const website = yield* Effect.promise(() =>
        host.getWorker("website-rate")
      );
      const missingKeyApi = yield* Effect.promise(() =>
        host.getWorker("api-missing-forwarding-key")
      );
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
        Schema.fromJsonString(
          CalculatorRpcPayload.fields.request.fields.payload
        )
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
          const response = yield* calculate(index % 2 === 0 ? alias : key);
          expect(response.status).toBe(200);
          expect(yield* Effect.promise(() => response.text())).toContain(
            '"cents":130100'
          );
        })
      );
      const input = yield* Schema.encodeEffect(
        CalculatorRpcPayload.fields.request
      )(CalculationRequest);
      const submit = Effect.promise(() =>
        website.fetch(`${websiteOrigin}/`, {
          body: "grossDollars=1654&period=weekly&taxFreeThresholdClaimed=on",
          headers: {
            "cf-connecting-ip": key,
            "content-type": "application/x-www-form-urlencoded",
          },
          method: "POST",
        })
      ).pipe(
        Effect.flatMap((response) => Effect.promise(() => response.text()))
      );
      expect(yield* submit).toContain("$1,301.00");
      const mcp = yield* Effect.promise(() =>
        client.callTool({
          arguments: input,
          name: "taxkit_calculate",
        })
      );
      expect(
        (yield* Schema.decodeUnknownEffect(McpSchema.CallToolResult)(mcp))
          .isError
      ).not.toBe(true);
      const batch = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.Array(Frame))
      )(
        Array.map(Array.range(1, 2), (id) =>
          Frame.make({
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
      const reply = yield* Effect.promise(() =>
        api.fetch(`${apiOrigin}/rpc`, {
          body: batch,
          headers: {
            "cf-connecting-ip": alias,
            "content-type": "application/json",
          },
          method: "POST",
        })
      );
      const replyText = yield* Effect.promise(() => reply.text());
      expect(replyText.match(/CalculatorRateLimited/gu)).toHaveLength(1);
      expect(replyText).toContain('"Success"');
      const rejected = yield* calculate(key);
      expect(rejected.status).toBe(429);
      expect(rejected.headers.get("retry-after")).toBe("60");
      expect(yield* submit).toContain(
        "Too many calculations were sent. Wait a minute before trying again."
      );
      expect((yield* calculate("198.51.100.99")).status).toBe(200);
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
      // Valid private HTTP metadata selects the original caller even when
      // the immediate caller is a Worker. The exhausted alias stays exhausted.
      const privateReply = yield* Effect.promise(() =>
        api.fetch(
          `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
          {
            body,
            headers: {
              [WebsiteForwardingCredentialHeader]: nativeForwardingKey,
              [WebsiteForwardingRateKeyHeader]: alias,
              "cf-worker": "native-website-fixture",
              "content-type": "application/json",
            },
            method: "POST",
          }
        )
      );
      expect(privateReply.status).toBe(429);
      const independent = yield* Effect.promise(() =>
        api.fetch(
          `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
          {
            body,
            headers: {
              [WebsiteForwardingCredentialHeader]: nativeForwardingKey,
              [WebsiteForwardingRateKeyHeader]: "2001:db8::76",
              "cf-worker": "native-website-fixture",
              "content-type": "application/json",
            },
            method: "POST",
          }
        )
      );
      expect(independent.status).toBe(200);
      expect(yield* Effect.promise(() => independent.text())).toContain(
        '"cents":130100'
      );
      // A separate caller exercises native rotation overlap without changing
      // the original caller's sixty-call allowance proof above.
      yield* Effect.forEach(
        [nativeForwardingKey, nativePreviousForwardingKey],
        (credential) =>
          Effect.gen(function* () {
            const rotated = yield* Effect.promise(() =>
              api.fetch(
                `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
                {
                  body,
                  headers: {
                    [WebsiteForwardingCredentialHeader]: credential,
                    [WebsiteForwardingRateKeyHeader]: "2001:db8::77",
                    "cf-worker": "native-website-fixture",
                    "content-type": "application/json",
                  },
                  method: "POST",
                }
              )
            );
            expect(rotated.status).toBe(200);
            expect(yield* Effect.promise(() => rotated.text())).toContain(
              '"cents":130100'
            );
          })
      );
      const unrelated = yield* Effect.promise(() =>
        api.fetch(
          `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
          {
            body,
            headers: {
              [WebsiteForwardingCredentialHeader]: "e2".repeat(32),
              [WebsiteForwardingRateKeyHeader]: "2001:db8::77",
              "cf-worker": "native-website-fixture",
              "content-type": "application/json",
            },
            method: "POST",
          }
        )
      );
      expect(unrelated.status).toBe(503);
      const unrelatedText = yield* Effect.promise(() => unrelated.text());
      expect(unrelatedText).not.toContain(nativePreviousForwardingKey);
      expect(unrelatedText).not.toContain("2001:db8::77");
      // Partial, spoofed, wrong, duplicated or malformed capabilities must
      // refuse before tax work and must not fall back to the direct edge key.
      yield* Effect.forEach(
        [
          { [WebsiteForwardingRateKeyHeader]: key },
          { [WebsiteForwardingCredentialHeader]: nativeForwardingKey },
          {
            [WebsiteForwardingCredentialHeader]: "e2".repeat(32),
            [WebsiteForwardingRateKeyHeader]: key,
          },
          {
            [WebsiteForwardingCredentialHeader]: "native-private-canary",
            [WebsiteForwardingRateKeyHeader]: key,
          },
          {
            [WebsiteForwardingCredentialHeader]: `${nativeForwardingKey}, ${nativeForwardingKey}`,
            [WebsiteForwardingRateKeyHeader]: key,
          },
          {
            [WebsiteForwardingCredentialHeader]: nativeForwardingKey,
            [WebsiteForwardingRateKeyHeader]: "native-private-canary",
          },
        ],
        (headers) =>
          Effect.gen(function* () {
            const refused = yield* Effect.promise(() =>
              api.fetch(
                `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
                {
                  body,
                  headers: {
                    ...headers,
                    "cf-connecting-ip": "198.51.100.99",
                    "content-type": "application/json",
                  },
                  method: "POST",
                }
              )
            );
            expect(refused.status).toBe(503);
            const text = yield* Effect.promise(() => refused.text());
            expect(text).not.toContain(nativeForwardingKey);
            expect(text).not.toContain(key);
            expect(text).not.toContain("130100");
          })
      );
      const missing = yield* Effect.promise(() =>
        missingKeyApi.fetch(
          `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
          {
            body,
            headers: {
              [WebsiteForwardingCredentialHeader]: nativeForwardingKey,
              [WebsiteForwardingRateKeyHeader]: "2001:db8::76",
              "content-type": "application/json",
            },
            method: "POST",
          }
        )
      );
      expect(missing.status).toBe(503);
      // Forwarding is admitted only on the canonical calculation POST. It
      // cannot confer caller authority on public RPC or a look-alike path.
      const noncanonical = yield* Effect.promise(() =>
        api.fetch(
          `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate/extra`,
          {
            body,
            headers: {
              [WebsiteForwardingCredentialHeader]: nativeForwardingKey,
              [WebsiteForwardingRateKeyHeader]: "2001:db8::76",
              "cf-worker": "native-website-fixture",
              "content-type": "application/json",
            },
            method: "POST",
          }
        )
      );
      expect(noncanonical.status).toBe(404);
      const wrongMethod = yield* Effect.promise(() =>
        api.fetch(
          `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
          {
            headers: {
              [WebsiteForwardingCredentialHeader]: nativeForwardingKey,
              [WebsiteForwardingRateKeyHeader]: "2001:db8::76",
              "cf-worker": "native-website-fixture",
            },
            method: "GET",
          }
        )
      );
      expect(wrongMethod.status).toBeGreaterThanOrEqual(400);
      expect(yield* Effect.promise(() => wrongMethod.text())).not.toContain(
        "130100"
      );
      const untrustedRpc = yield* Effect.promise(() =>
        api.fetch(`${apiOrigin}/rpc`, {
          body: batch,
          headers: {
            [WebsiteForwardingCredentialHeader]: nativeForwardingKey,
            [WebsiteForwardingRateKeyHeader]: "2001:db8::76",
            "cf-worker": "native-website-fixture",
            "content-type": "application/json",
          },
          method: "POST",
        })
      );
      expect(yield* Effect.promise(() => untrustedRpc.text())).toContain(
        "CalculatorAdmissionUnavailable"
      );

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
      expect(
        (yield* Effect.promise(() =>
          api.fetch(`${apiOrigin}/api/v1/calculators`)
        )).status
      ).toBe(200);
      const captured = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.Unknown)
      )(Array.map(yield* Queue.clear(logs), (log) => log.message));
      yield* Effect.forEach(
        [
          key,
          alias,
          "198.51.100.99",
          "1654",
          "130100",
          nativeForwardingKey,
          nativePreviousForwardingKey,
          "2001:db8::77",
          "e2".repeat(32),
          "native-private-canary",
        ],
        (sentinel) =>
          Effect.sync(() => {
            expect(captured).not.toContain(sentinel);
          })
      );
      expect(yield* Queue.clear(exceptions)).toEqual([]);
    }).pipe(Effect.provide(NodeServices.layer), Effect.scoped)
);
