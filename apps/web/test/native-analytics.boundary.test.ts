import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { CalculatorCaptureBatch } from "@taxkit/analytics/schemas";
import { TaxKitApi } from "@taxkit/api-http/api";
import {
  CalculationQuery,
  CalculatorRunServiceRequest,
} from "@taxkit/calculators/schemas";
import { CalculationRequest } from "@taxkit/calculators/testing/fixtures";
import { packEnvValue } from "alchemy/RuntimeContext";
import {
  Array,
  Match,
  Clock,
  Effect,
  Layer,
  Path,
  Queue,
  Ref,
  Schema,
  Stream,
} from "effect";
import { McpSchema } from "effect/ai";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Miniflare, Response } from "miniflare";
import type { Request, WorkerdStructuredLog } from "miniflare";

import { readWorkerModules } from "./native-modules.fixture";
import { nativeRateFixture } from "./native-rate.fixture";

const origin = "http://127.0.0.1:4219";
class NativeAnalyticsClientFailed extends Schema.TaggedError<
  NativeAnalyticsClientFailed,
  {
    readonly brand: unique symbol;
  }
>()("NativeAnalyticsClientFailed", {
  operation: Schema.Literals(["connect", "calculate"]),
}) {}
it.live.each(["rejected", "redirect", "stalled-reply"] as const)(
  "the built native API returns tax results independently of %s analytics",
  (mode) =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const modulesRoot = path.resolve(
        "../../.alchemy/native-pair/bundles/TaxKitApi"
      );
      const { files, modules, wasm } = yield* readWorkerModules({
        modulesRoot,
      });
      expect(files).toContain("worker.js");
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
                      TAXKIT_PUBLICATION_ORIGIN: {
                        type: "json",
                        value: "https://website.example.com",
                      },
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: "https://website.example.com",
                      },
                      WORKER_URL: { type: "json", value: origin },
                    },
                    manifest: {
                      mainModule: "worker.js",
                      modules: { ...modules, ...wasm },
                      modulesRoot,
                    },
                    name: "api-analytics",
                  },
                  dev: {
                    // Miniflare requires this synchronous native callback. It only
                    // records the actual outbound request and supplies a controlled
                    // reply; all test orchestration stays in the owning Effect.
                    outboundService: {
                      handler: (request) => {
                        Queue.offerUnsafe(outgoing, request);
                        return Match.value(mode).pipe(
                          Match.when(
                            "stalled-reply",
                            () =>
                              new Response(
                                new ReadableStream<Uint8Array>({
                                  start: (controller) => {
                                    Queue.offerUnsafe(replies, controller);
                                  },
                                }),
                                { status: 200 }
                              )
                          ),
                          Match.orElse(
                            (matchedValue) =>
                              new Response("private-provider-response", {
                                headers: {
                                  location: "https://private.invalid/redirect",
                                },
                                status: Match.value(matchedValue).pipe(
                                  Match.when("redirect", (): 302 => 302),
                                  Match.orElse((): 500 => 500)
                                ),
                              })
                          )
                        );
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
      expect({
        deniedStatus: (yield* calculate("deny").pipe(
          Effect.timeout("2 seconds")
        )).status,
        QueueClearOutgoing: yield* Queue.clear(outgoing),
      }).toStrictEqual({
        deniedStatus: 200,
        QueueClearOutgoing: [],
      });
      const started = yield* Clock.currentTimeMillis;
      const reply = yield* calculate("allow").pipe(Effect.timeout("2 seconds"));
      expect(reply.status).toBe(200);
      expect(yield* Clock.currentTimeMillis).toBeLessThan(started + 2000);
      yield* Effect.gen(function* verifyAnalyticsPayload() {
        const request = yield* Queue.take(outgoing).pipe(
          Effect.timeout("2 seconds")
        );
        expect({
          request: {
            requestUrl: request.url,
            requestMethod: request.method,
          },
          requestHeadersGetCacheControl: request.headers.get("cache-control"),
        }).toStrictEqual({
          request: {
            requestUrl: "https://us.i.posthog.com/batch/",
            requestMethod: "POST",
          },
          requestHeadersGetCacheControl: "no-store",
        });
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
            Effect.sync(() => {
              const actual = request.headers.has(name);
              expect(actual, name).toBeFalsy();
            })
        );
        const bytes = yield* Effect.promise(() => request.text());
        const batch = yield* Schema.decodeEffect(
          Schema.fromJsonString(CalculatorCaptureBatch),
          { onExcessProperty: "error" }
        )(bytes);
        const [event] = batch.batch;
        expect({
          eventPropertiesStage: event.properties.stage,
          eventPropertiesCalculator_id: event.properties.calculator_id,
        }).toStrictEqual({
          eventPropertiesStage: "pr-179",
          eventPropertiesCalculator_id: "au.pay.take-home",
        });
        expect(event.distinct_id).toBe(event.uuid);
        Array.forEach((marker: string) => {
          expect(bytes).not.toContain(marker);
        })(["PRIVATE9", "165400"]);
      }).pipe(Effect.withSpan("verifyAnalyticsPayload"));
      if (mode === "rejected") {
        const address = yield* Effect.promise(() => host.ready);
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
        const calculated = yield* HttpApiClient.make(TaxKitApi, {
          baseUrl: address.origin,
        }).pipe(
          Effect.flatMap((client) =>
            client.calculatorApi.calculate({
              params: { calculatorId: CalculationRequest.calculatorId },
              payload: CalculationRequest.payload,
              query: CalculationQuery.make({}),
            })
          ),
          Effect.provide(transport)
        );
        expect(calculated.calculator.calculatorId).toBe("au.pay.take-home");
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
              expect({
                itemPropertiesCalculator_id: item.properties.calculator_id,
                itemPropertiesStage: item.properties.stage,
              }).toStrictEqual({
                itemPropertiesCalculator_id: "au.pay.take-home",
                itemPropertiesStage: "pr-179",
              });
              expect(item.distinct_id).toBe(item.uuid);
            })
          )
        );
        yield* nextCapture;
        const input = yield* Schema.encodeEffect(CalculatorRunServiceRequest)(
          CalculationRequest
        );
        yield* Effect.gen(function* () {
          const policy = yield* Ref.make("deny");
          const client = yield* Effect.acquireRelease(
            Effect.sync(
              () =>
                new Client(
                  { name: "native-taxkit-analytics-proof", version: "1" },
                  { versionNegotiation: { mode: { pin: "2026-07-28" } } }
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
          yield* Effect.logInfo("Native analytics MCP protocol: 2026-07-28");
          yield* Effect.tryPromise({
            catch: () =>
              new NativeAnalyticsClientFailed({ operation: "connect" }),
            try: () => client.connect(mcp),
          });
          expect(mcp.sessionId).toBeUndefined();
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
                (yield* Schema.decodeUnknownEffect(McpSchema.CallToolResult)(
                  result
                )).isError === false
              ).toBeTruthy();
              if (choice === "allow") {
                yield* nextCapture;
              } else {
                expect(yield* Queue.clear(outgoing)).toStrictEqual([]);
              }
            })
          );
        }).pipe(Effect.scoped);
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
        yield* Effect.sync(() => {
          controller.close();
        });
      }
      expect({
        QueueClearOutgoing: yield* Queue.clear(outgoing),
        QueueClearExceptions: yield* Queue.clear(exceptions),
      }).toStrictEqual({
        QueueClearOutgoing: [],
        QueueClearExceptions: [],
      });
      const recorded = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.Unknown)
      )(yield* Queue.clear(logs));
      Array.forEach((marker: string) => {
        expect(recorded).not.toContain(marker);
      })(["PRIVATE9", "165400"]);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  { timeout: 30_000 }
);
