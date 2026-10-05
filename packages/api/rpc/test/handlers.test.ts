import { describe, expect, it } from "@effect/vitest";
import {
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
} from "@taxkit/calculators/schemas";
import {
  Array,
  Cause,
  Effect,
  Exit,
  Layer,
  Logger,
  Match,
  Option,
  Queue,
  References,
  Ref,
  Stream,
  Result,
  Schema,
} from "effect";
import {
  HttpClient,
  HttpClientRequest,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { Rpc, RpcClient, RpcSerialization } from "effect/rpc";

import {
  CalculationRequest,
  CalculatorFixture,
  CalculatorLive,
  sensitiveSentinel,
} from "../src/__testing__/fixtures.js";
import {
  CalculatorRpcInvalidResponse,
  CalculatorRpcClientError,
  CalculatorRpcRequestTooLarge,
  CalculatorRpcRequestTimedOut,
  CalculatorRpcRateLimited,
  CalculatorRpcResponseTooLarge,
  CalculatorRpcUnavailable,
  CalculatorRpcRejected,
} from "../src/errors.js";
import { Calculate, ListCalculators, TaxKitRpcGroup } from "../src/group.js";
import { TaxKitRpcClientLive } from "../src/live.layer.js";
import {
  CalculatorRpcOrigin,
  CalculatorRpcVersion,
  MetadataQuery,
} from "../src/schemas.js";
import { TaxKitRpcHttpLayer } from "../src/server.js";
import { TaxKitRpcClient } from "../src/service.js";
import { TaxKitRpcClientTest } from "../src/test.layer.js";

const origin = Schema.decodeResult(CalculatorRpcOrigin)(
  "https://api.example.com"
).pipe(Result.getOrThrowWith(() => new Error("Invalid fixture origin")));
const JsonFixture = Schema.fromJsonString(Schema.Unknown);
const NativeRequestFixture = Schema.TaggedStruct("Request", {
  headers: Schema.Unknown,
  id: Schema.Unknown,
  payload: Schema.Unknown,
  tag: Schema.Unknown,
});
const NativeSuccessFixture = Schema.TaggedStruct("Success", {
  value: Schema.Unknown,
});
const NativeExitFixture = Schema.TaggedStruct("Exit", {
  exit: NativeSuccessFixture,
  requestId: Schema.Unknown,
});

const makeHttpTransport = Effect.fnUntraced(function* (
  mode: "success" | "expected" | "defect" | "mixed" | "capacity" | "timeout"
) {
  const handler = yield* HttpRouter.toHttpEffect(
    TaxKitRpcHttpLayer.pipe(Layer.provide(CalculatorFixture(mode)))
  );
  return HttpClient.make((request, url) =>
    Effect.sync(() => expect(url.pathname).toBe("/rpc")).pipe(
      Effect.andThen(handler),
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        HttpServerRequest.fromClientRequest(request)
      ),
      Effect.map((response) =>
        HttpServerResponse.toClientResponse(response, { request })
      ),
      Effect.orDie,
      Effect.scoped
    )
  );
});

describe("native calculator RPC", () => {
  it.effect.each([
    { error: new CalculatorCapacityExceeded(), mode: "capacity" as const },
    { error: new CalculatorOperationTimedOut(), mode: "timeout" as const },
  ])(
    "preserves checked $mode failure through the native HTTP client",
    ({ mode, error }) =>
      Effect.gen(function* () {
        const transport = yield* makeHttpTransport(mode);
        const clientExit = yield* TaxKitRpcClient.pipe(
          Effect.flatMap((client) => client.calculate(CalculationRequest)),
          Effect.exit,
          Effect.provide(
            TaxKitRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
        expect(Exit.isFailure(clientExit)).toBe(true);
        if (Exit.isFailure(clientExit)) {
          expect(Cause.findErrorOption(clientExit.cause)).toEqual(
            Option.some(error)
          );
        }
        const wire = yield* Schema.encodeEffect(
          Schema.fromJsonString(Schema.toCodecJson(CalculatorRpcClientError))
        )(error);
        expect(wire).not.toContain(sensitiveSentinel);
        expect(wire).not.toContain("stack");
        expect(
          yield* Schema.decodeUnknownEffect(
            Schema.fromJsonString(Schema.toCodecJson(CalculatorRpcClientError))
          )(wire)
        ).toEqual(error);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads all retained calculators through the explicit test layer",
    () =>
      Effect.gen(function* () {
        const client = yield* TaxKitRpcClient;
        const response = yield* client.listCalculators(MetadataQuery.make({}));
        expect(response.calculators).toHaveLength(3);
        expect(
          Array.map(response.calculators, (value) => value.calculatorId)
        ).toEqual(
          expect.arrayContaining([
            "au.pay.take-home",
            "au.pay.withholdings",
            "au.income-tax.annual",
          ])
        );
        expect(
          Array.every(
            response.calculators,
            (value) =>
              value.context.jurisdiction === "AU" &&
              value.context.taxYear === "2025-26"
          )
        ).toBe(true);
      }).pipe(
        Effect.provide(TaxKitRpcClientTest.pipe(Layer.provide(CalculatorLive)))
      )
  );

  it.effect(
    "reads the canonical catalogue through checked native HTTP RPC",
    () =>
      Effect.gen(function* () {
        const nativeTransport = yield* makeHttpTransport("success");
        const transport = HttpClient.make((request) => {
          expect(request.headers).not.toHaveProperty("b3");
          expect(request.headers).not.toHaveProperty("traceparent");
          return nativeTransport.execute(request);
        });
        yield* Effect.gen(function* () {
          const client = yield* TaxKitRpcClient;
          const response = yield* client.listCalculators(
            MetadataQuery.make({})
          );
          expect(response.calculators).toHaveLength(3);
          expect(
            Array.map(response.calculators, (value) => value.title)
          ).toEqual(
            expect.arrayContaining([
              "AU take-home pay",
              "AU pay withholdings",
              "AU annual income tax",
            ])
          );
        }).pipe(
          Effect.provide(
            TaxKitRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
      }).pipe(Effect.scoped)
  );
  it.effect("rejects an oversized body before native JSON parsing", () =>
    Effect.gen(function* () {
      const transport = yield* makeHttpTransport("success");
      const wire = yield* Schema.encodeEffect(JsonFixture)(
        NativeRequestFixture.make({
          headers: [],
          id: "1",
          payload: {
            request: {
              ...CalculationRequest,
              payload: {
                ...CalculationRequest.payload,
                padding: "x".repeat(64 * 1024),
              },
            },
            version: CalculatorRpcVersion,
          },
          tag: Calculate._tag,
        })
      );
      const response = yield* transport.execute(
        HttpClientRequest.post(`${origin.origin}/rpc`).pipe(
          HttpClientRequest.bodyText(wire, "application/json")
        )
      );
      const body = yield* response.text;
      expect(body).not.toContain(sensitiveSentinel);
      expect(body).toContain("Calculation service failed");
      expect(body).not.toContain("TakeHomePayReport");
    }).pipe(Effect.scoped)
  );

  it.effect(
    "remote native defects remain defects with only a fixed safe value",
    () =>
      Effect.gen(function* () {
        const transport = yield* makeHttpTransport("defect");
        yield* Effect.gen(function* () {
          const client = yield* TaxKitRpcClient;
          const exit = yield* client
            .calculate(CalculationRequest)
            .pipe(Effect.exit);
          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            expect(Cause.hasFails(exit.cause)).toBe(false);
            expect(
              Result.match(Cause.findDie(exit.cause), {
                onFailure: () => false,
                onSuccess: (reason) =>
                  reason.defect === "Calculation service failed",
              })
            ).toBe(true);
          }
        }).pipe(
          Effect.provide(
            TaxKitRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
      }).pipe(Effect.scoped)
  );

  it.effect("delegates to the real calculator in the explicit test layer", () =>
    Effect.gen(function* () {
      const client = yield* TaxKitRpcClient;
      const response = yield* client.calculate(CalculationRequest);
      expect(response.report._tag).toBe("TakeHomePayReport");
      Match.value(response.report).pipe(
        Match.tag("TakeHomePayReport", (report) => {
          expect(report.netPay.cents).toBe(130_100);
          expect(report.grossPay.cents).toBe(165_400);
        }),
        Match.orElse(() => expect.fail("Expected take-home report"))
      );
    }).pipe(
      Effect.provide(TaxKitRpcClientTest.pipe(Layer.provide(CalculatorLive)))
    )
  );

  it.effect(
    "uses native POST and JSON with a checked full calculator result",
    () =>
      Effect.gen(function* () {
        const nativeTransport = yield* makeHttpTransport("success");
        const transport = HttpClient.make((request) => {
          expect(request.headers).not.toHaveProperty("b3");
          expect(request.headers).not.toHaveProperty("traceparent");
          return nativeTransport.execute(request);
        });
        yield* Effect.gen(function* () {
          const client = yield* TaxKitRpcClient;
          const response = yield* client.calculate(CalculationRequest);
          Match.value(response.report).pipe(
            Match.tag("TakeHomePayReport", (report) =>
              expect(report.netPay.cents).toBe(130_100)
            ),
            Match.orElse(() => expect.fail("Expected take-home report"))
          );
        }).pipe(
          Effect.provide(
            TaxKitRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
      }).pipe(Effect.scoped)
  );

  it.effect.each(["expected", "defect", "mixed"] as const)(
    "keeps %s failure bytes private in native replies and logs",
    (mode) =>
      Effect.gen(function* () {
        const logs = yield* Queue.make<string, Cause.Done>({
          capacity: 32,
          strategy: "dropping",
        });
        const logger = Logger.make((options) =>
          Queue.offerUnsafe(logs, Logger.formatJson.log(options))
        );
        yield* Effect.gen(function* () {
          const transport = yield* makeHttpTransport(mode);
          const input = yield* Schema.encodeEffect(JsonFixture)(
            NativeRequestFixture.make({
              headers: [],
              id: "1",
              payload: {
                request: CalculationRequest,
                version: CalculatorRpcVersion,
              },
              tag: Calculate._tag,
            })
          );
          const response = yield* transport.execute(
            HttpClientRequest.post(`${origin.origin}/rpc`).pipe(
              HttpClientRequest.bodyText(input, "application/json")
            )
          );
          const wire = yield* response.text;
          expect(response.status).toBe(200);
          expect(wire).not.toContain(sensitiveSentinel);
          const replies = yield* Schema.decodeUnknownEffect(JsonFixture)(wire);
          expect(replies).toBeDefined();
          expect(wire).toContain(
            mode === "expected"
              ? "CalculatorRpcRejected"
              : "Calculation service failed"
          );
        }).pipe(
          Effect.scoped,
          Effect.provide(Logger.layer([logger])),
          Effect.provideService(References.MinimumLogLevel, "Trace")
        );
        yield* Queue.end(logs);
        const observed = yield* Queue.collect(logs);
        expect(
          Array.every(observed, (line) => !line.includes(sensitiveSentinel))
        ).toBe(true);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "round trips the checked expected error class without its private source fields",
    () =>
      Effect.gen(function* () {
        const transport = yield* makeHttpTransport("expected");
        yield* Effect.gen(function* () {
          const client = yield* TaxKitRpcClient;
          const failure = yield* client
            .calculate(CalculationRequest)
            .pipe(Effect.flip);
          expect(Schema.is(CalculatorRpcRejected)(failure)).toBe(true);
          expect(failure).toEqual(
            new CalculatorRpcRejected({ reason: "input" })
          );
        }).pipe(
          Effect.provide(
            TaxKitRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
      }).pipe(Effect.scoped)
  );

  it.effect.each([
    NativeRequestFixture.make({
      headers: [],
      id: "1",
      payload: {},
      tag: sensitiveSentinel,
    }),
    NativeRequestFixture.make({
      headers: [],
      id: sensitiveSentinel,
      payload: {},
      tag: "Calculate",
    }),
    NativeRequestFixture.make({
      headers: [],
      id: -1,
      payload: {},
      tag: "Calculate",
    }),
    Schema.TaggedStruct(sensitiveSentinel, {}).make({}),
    NativeRequestFixture.make({
      headers: Array.makeBy(33, () => ["accept", "application/json"]),
      id: "1",
      payload: {},
      tag: "Calculate",
    }),
    NativeRequestFixture.make({
      headers: [["accept", "x".repeat(4097)]],
      id: "1",
      payload: {},
      tag: "Calculate",
    }),
    Array.makeBy(17, (index) =>
      NativeRequestFixture.make({
        headers: [],
        id: `${index + 1}`,
        payload: {},
        tag: "Calculate",
      })
    ),
    NativeRequestFixture.make({
      headers: sensitiveSentinel,
      id: "1",
      payload: {},
      tag: "Calculate",
    }),
    NativeRequestFixture.make({
      headers: [],
      id: "1",
      payload: { request: sensitiveSentinel },
      tag: "Calculate",
    }),
  ])(
    "rejects unsafe native envelope case %# without reflecting its input",
    (fixture) =>
      Effect.gen(function* () {
        const transport = yield* makeHttpTransport("success");
        const wire = yield* Schema.encodeEffect(JsonFixture)(fixture);
        const response = yield* transport.execute(
          HttpClientRequest.post(`${origin.origin}/rpc`).pipe(
            HttpClientRequest.bodyText(wire, "application/json")
          )
        );
        const body = yield* response.text;
        expect(body).not.toContain(sensitiveSentinel);
        expect(body).toContain("Calculation service failed");
        expect(body).not.toContain("TakeHomePayReport");
      }).pipe(Effect.scoped)
  );

  it.effect("does not reflect malformed JSON or accept version skew", () =>
    Effect.gen(function* () {
      const transport = yield* makeHttpTransport("success");
      const response = yield* transport.execute(
        HttpClientRequest.post(`${origin.origin}/rpc`).pipe(
          HttpClientRequest.bodyText(
            `{${sensitiveSentinel}`,
            "application/json"
          )
        )
      );
      const malformed = yield* response.text;
      expect(malformed).not.toContain(sensitiveSentinel);
      expect(malformed).toContain("Calculation service failed");
      const client = yield* RpcClient.make(TaxKitRpcGroup, {
        disableTracing: true,
      }).pipe(
        Effect.provide(
          RpcClient.layerProtocolHttp({
            transformClient: HttpClient.mapRequest(
              HttpClientRequest.setUrl(`${origin.origin}/rpc`)
            ),
            url: `${origin.origin}/rpc`,
          }).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport)),
            Layer.provide(RpcSerialization.layerJson)
          )
        )
      );
      const skew = yield* client
        .Calculate({ request: CalculationRequest, version: "1" })
        .pipe(Effect.flip);
      expect(skew._tag).toBe("CalculatorRpcVersionMismatch");
      const catalogueSkew = yield* client
        .ListCalculators({ query: MetadataQuery.make({}), version: "1" })
        .pipe(Effect.flip);
      expect(catalogueSkew._tag).toBe("CalculatorRpcVersionMismatch");
      expect(Rpc.exitSchema(Calculate).ast).toBe(Rpc.exitSchema(Calculate).ast);
      expect(Rpc.exitSchema(ListCalculators).ast).toBe(
        Rpc.exitSchema(ListCalculators).ast
      );
      expect(Schema.Defect().ast).toBe(Schema.Defect().ast);
    }).pipe(Effect.scoped)
  );

  it.effect.each([
    { mode: "json", operation: "calculate" },
    { mode: "schema", operation: "calculate" },
    { mode: "json", operation: "catalogue" },
    { mode: "schema", operation: "catalogue" },
  ] as const)(
    "classifies a broken $mode reply to $operation as a checked invalid response",
    ({ mode, operation }) =>
      Effect.gen(function* () {
        const transport = HttpClient.make((request) =>
          Effect.gen(function* () {
            const incoming = yield* HttpServerRequest.fromClientRequest(
              request
            ).text.pipe(
              Effect.flatMap(
                Schema.decodeUnknownEffect(
                  Schema.fromJsonString(
                    Schema.Struct({
                      id: Schema.Union([Schema.String, Schema.Finite]),
                    })
                  )
                )
              )
            );
            const reply =
              mode === "json"
                ? "{"
                : yield* Schema.encodeEffect(JsonFixture)([
                    NativeExitFixture.make({
                      exit: NativeSuccessFixture.make({
                        value: sensitiveSentinel,
                      }),
                      requestId: incoming.id,
                    }),
                  ]);
            return HttpServerResponse.toClientResponse(
              HttpServerResponse.text(reply, {
                contentType: "application/json",
              }),
              { request }
            );
          }).pipe(Effect.orDie)
        );
        yield* Effect.gen(function* () {
          const client = yield* TaxKitRpcClient;
          const error = yield* (
            operation === "calculate"
              ? client.calculate(CalculationRequest).pipe(Effect.asVoid)
              : client
                  .listCalculators(MetadataQuery.make({}))
                  .pipe(Effect.asVoid)
          ).pipe(Effect.flip);
          expect(Schema.is(CalculatorRpcInvalidResponse)(error)).toBe(true);
        }).pipe(
          Effect.provide(
            TaxKitRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
      })
  );

  it.effect(
    "preserves an unrelated adapter SchemaError by exact defect identity",
    () =>
      Effect.gen(function* () {
        const original = yield* Schema.decodeUnknownEffect(Schema.String)(
          123
        ).pipe(Effect.flip);
        const transport = HttpClient.make(() => Effect.die(original));
        yield* Effect.gen(function* () {
          const client = yield* TaxKitRpcClient;
          const exit = yield* client
            .calculate(CalculationRequest)
            .pipe(Effect.exit);
          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            expect(Cause.hasFails(exit.cause)).toBe(false);
            expect(
              Result.match(Cause.findDie(exit.cause), {
                onFailure: () => false,
                onSuccess: (reason) => reason.defect === original,
              })
            ).toBe(true);
          }
        }).pipe(
          Effect.provide(
            TaxKitRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
      })
  );
});

it.effect.each([
  { operation: "calculate", status: 408 },
  { operation: "calculate", status: 413 },
  { operation: "calculate", status: 429 },
  { operation: "calculate", status: 503 },
  { operation: "catalogue", status: 408 },
  { operation: "catalogue", status: 413 },
  { operation: "catalogue", status: 429 },
  { operation: "catalogue", status: 503 },
] as const)(
  "classifies HTTP $status for $operation without reading its body or retrying",
  ({ status, operation }) =>
    Effect.gen(function* () {
      const calls = yield* Ref.make(0);
      const bodyRead = yield* Ref.make(false);
      const aborts = yield* Queue.make<boolean>();
      const transport = HttpClient.make((request, _url, signal) =>
        Effect.sync(() =>
          signal.addEventListener(
            "abort",
            () => {
              Queue.offerUnsafe(aborts, true);
            },
            { once: true }
          )
        ).pipe(
          Effect.andThen(Ref.update(calls, (count) => count + 1)),
          Effect.as(
            HttpServerResponse.toClientResponse(
              HttpServerResponse.stream(
                Stream.fromEffect(
                  Ref.set(bodyRead, true).pipe(
                    Effect.as(new TextEncoder().encode(sensitiveSentinel))
                  )
                ),
                { contentType: "application/json", status }
              ),
              { request }
            )
          )
        )
      );
      yield* Effect.gen(function* () {
        const client = yield* TaxKitRpcClient;
        const error = yield* (
          operation === "calculate"
            ? client.calculate(CalculationRequest).pipe(Effect.asVoid)
            : client.listCalculators(MetadataQuery.make({})).pipe(Effect.asVoid)
        ).pipe(Effect.flip);
        const expected = Match.value(status).pipe(
          Match.when(408, () => new CalculatorRpcRequestTimedOut()),
          Match.when(413, () => new CalculatorRpcRequestTooLarge()),
          Match.when(429, () => new CalculatorRpcRateLimited()),
          Match.when(503, () => new CalculatorRpcUnavailable()),
          Match.exhaustive
        );
        expect(error).toEqual(expected);
        const encoded = yield* Schema.encodeEffect(
          Schema.toCodecJson(CalculatorRpcClientError)
        )(error);
        expect(
          yield* Schema.decodeEffect(
            Schema.toCodecJson(CalculatorRpcClientError)
          )(encoded)
        ).toEqual(error);
        expect(
          yield* Schema.encodeEffect(
            Schema.fromJsonString(CalculatorRpcClientError)
          )(error)
        ).not.toContain(sensitiveSentinel);
        expect(yield* Ref.get(bodyRead)).toBe(false);
        expect(yield* Queue.clear(aborts)).toEqual([true]);
        expect(yield* Ref.get(calls)).toBe(1);
      }).pipe(
        Effect.provide(
          TaxKitRpcClientLive(origin).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
          )
        )
      );
    })
);

it.effect.each(["calculate", "catalogue"] as const)(
  "accepts a valid native %s reply at exactly two MiB",
  (operation) =>
    Effect.gen(function* () {
      const native = yield* makeHttpTransport("success");
      const released = yield* Ref.make(false);
      const transport = HttpClient.make((request) =>
        native.execute(request).pipe(
          Effect.flatMap((response) => response.text),
          Effect.map((text) =>
            HttpServerResponse.toClientResponse(
              HttpServerResponse.stream(
                Stream.succeed(
                  new TextEncoder().encode(
                    text +
                      " ".repeat(
                        2 * 1024 * 1024 -
                          new TextEncoder().encode(text).byteLength
                      )
                  )
                ).pipe(Stream.ensuring(Ref.set(released, true))),
                { contentType: "application/json" }
              ),
              { request }
            )
          )
        )
      );
      yield* Effect.gen(function* () {
        const client = yield* TaxKitRpcClient;
        if (operation === "calculate") {
          const reply = yield* client.calculate(CalculationRequest);
          expect(reply.report._tag).toBe("TakeHomePayReport");
        } else {
          const reply = yield* client.listCalculators(MetadataQuery.make({}));
          expect(reply.calculators).toHaveLength(3);
        }
        expect(yield* Ref.get(released)).toBe(true);
      }).pipe(
        Effect.provide(
          TaxKitRpcClientLive(origin).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
          )
        )
      );
    }).pipe(Effect.scoped)
);

it.effect.each([
  { operation: "calculate", representation: "chunks" },
  { operation: "catalogue", representation: "chunks" },
  { operation: "calculate", representation: "utf-8" },
  { operation: "catalogue", representation: "utf-8" },
] as const)(
  "stops oversized $representation replies to $operation before the tail and releases the source",
  ({ operation, representation }) =>
    Effect.gen(function* () {
      const tailRead = yield* Ref.make(false);
      const released = yield* Ref.make(false);
      const calls = yield* Ref.make(0);
      const first =
        representation === "chunks"
          ? Stream.make(
              new Uint8Array(1024 * 1024),
              new Uint8Array(1024 * 1024 + 1)
            )
          : Stream.succeed(
              new TextEncoder().encode("é".repeat(1024 * 1024 + 1))
            );
      const source = first.pipe(
        Stream.concat(
          Stream.fromEffect(
            Ref.set(tailRead, true).pipe(Effect.as(new Uint8Array([1])))
          )
        ),
        Stream.ensuring(Ref.set(released, true))
      );
      const transport = HttpClient.make((request) =>
        Ref.update(calls, (count) => count + 1).pipe(
          Effect.as(
            HttpServerResponse.toClientResponse(
              HttpServerResponse.stream(source, {
                contentType: "application/json",
                headers: { "content-length": "1" },
              }),
              { request }
            )
          )
        )
      );
      yield* Effect.gen(function* () {
        const client = yield* TaxKitRpcClient;
        const error = yield* (
          operation === "calculate"
            ? client.calculate(CalculationRequest).pipe(Effect.asVoid)
            : client.listCalculators(MetadataQuery.make({})).pipe(Effect.asVoid)
        ).pipe(Effect.flip);
        expect(error).toEqual(new CalculatorRpcResponseTooLarge());
        expect(yield* Ref.get(tailRead)).toBe(false);
        expect(yield* Ref.get(released)).toBe(true);
        expect(yield* Ref.get(calls)).toBe(1);
      }).pipe(
        Effect.provide(
          TaxKitRpcClientLive(origin).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
          )
        )
      );
    })
);

it.effect.each([
  { operation: "calculate", status: 204 },
  { operation: "catalogue", status: 204 },
  { operation: "calculate", status: 205 },
  { operation: "catalogue", status: 205 },
] as const)(
  "treats an empty HTTP $status reply for $operation as checked invalid data",
  ({ operation, status }) =>
    Effect.gen(function* () {
      const transport = HttpClient.make((request) =>
        Effect.succeed(
          HttpServerResponse.toClientResponse(
            HttpServerResponse.empty({ status }),
            { request }
          )
        )
      );
      yield* Effect.gen(function* () {
        const client = yield* TaxKitRpcClient;
        const error = yield* (
          operation === "calculate"
            ? client.calculate(CalculationRequest).pipe(Effect.asVoid)
            : client.listCalculators(MetadataQuery.make({})).pipe(Effect.asVoid)
        ).pipe(Effect.flip);
        expect(error).toEqual(new CalculatorRpcInvalidResponse());
      }).pipe(
        Effect.provide(
          TaxKitRpcClientLive(origin).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
          )
        )
      );
    })
);
