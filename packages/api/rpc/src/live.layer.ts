import type {
  CalculatorRunServiceRequest,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import { Effect, Layer, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { Rpc, RpcClient, RpcSerialization } from "effect/rpc";

import {
  boundedCalculatorRpcHttpClient,
  calculatorRpcTransportFailure,
} from "./client-response.boundary.js";
import {
  CalculatorRpcDeadlineExceeded,
  CalculatorRpcInvalidResponse,
} from "./errors.js";
import { Calculate, ListCalculators, TaxKitRpcGroup } from "./group.js";
import { CalculatorRpcDeadline, CalculatorRpcVersion } from "./schemas.js";
import type { CalculatorRpcOrigin } from "./schemas.js";
import { TaxKitRpcClient } from "./service.js";

class RpcReplyDecodeDefect extends Schema.TaggedError<RpcReplyDecodeDefect>()(
  "RpcReplyDecodeDefect",
  {}
) {}

// Effect 4 caches the native exit Schema. Mark only its reply decoder's failure;
// an independent adapter SchemaError remains a defect with its original identity.
const replySerialization = Layer.succeed(
  RpcSerialization.RpcSerialization,
  RpcSerialization.RpcSerialization.of({
    ...RpcSerialization.json,
    codecFor: <S extends Schema.Top>(schema: S) => {
      const codec = RpcSerialization.json.codecFor(schema);
      return schema.ast === Rpc.exitSchema(Calculate).ast ||
        schema.ast === Rpc.exitSchema(ListCalculators).ast
        ? codec.pipe(
            Schema.catchDecoding<typeof codec>(() =>
              Effect.die(new RpcReplyDecodeDefect())
            )
          )
        : codec;
    },
  })
);

// The app supplies its matching-stage HttpClient. The Layer retains transport
// configuration, while each named operation owns its native client scope. A
// Worker can suspend between requests: retaining a receive-loop fibre acquired
// by an earlier request leaves later calls waiting. No runtime or Layer is built
// by a calculation; native RPC creation and finalisation run in its own scope.
export const TaxKitRpcClientLive = (origin: CalculatorRpcOrigin) =>
  Layer.effect(
    TaxKitRpcClient,
    Effect.gen(function* () {
      const protocol = yield* RpcClient.Protocol;
      return TaxKitRpcClient.of({
        calculate: Effect.fn("TaxKitRpcClient.calculate")(
          (request: CalculatorRunServiceRequest) =>
            RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
              Effect.flatMap((client) =>
                client.Calculate({ request, version: CalculatorRpcVersion })
              ),
              Effect.scoped,
              Effect.provideService(RpcClient.Protocol, protocol),
              // HTTP tracing is separate from RPC wire tracing. Keep both off
              // for this private transport: native headers otherwise introduce
              // an extra browser preflight policy and unqualified trace egress.
              Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
              Effect.provideService(FetchHttpClient.RequestInit, {
                credentials: "omit",
                redirect: "error",
              }),
              Effect.timeoutOrElse({
                duration: CalculatorRpcDeadline,
                orElse: () => Effect.fail(new CalculatorRpcDeadlineExceeded()),
              }),
              Effect.catchTag("RpcClientError", (error) =>
                Effect.fail(calculatorRpcTransportFailure(error))
              ),
              Effect.catchDefect((defect) =>
                Schema.is(RpcReplyDecodeDefect)(defect)
                  ? Effect.fail(new CalculatorRpcInvalidResponse())
                  : Effect.die(defect)
              )
            )
        ),
        listCalculators: Effect.fn("TaxKitRpcClient.listCalculators")(
          (query: MetadataQuery) =>
            RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
              Effect.flatMap((client) =>
                client.ListCalculators({ query, version: CalculatorRpcVersion })
              ),
              Effect.scoped,
              Effect.provideService(RpcClient.Protocol, protocol),
              // HTTP tracing is separate from RPC wire tracing. Keep both off
              // for this private transport: native headers otherwise introduce
              // an extra browser preflight policy and unqualified trace egress.
              Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
              Effect.provideService(FetchHttpClient.RequestInit, {
                credentials: "omit",
                redirect: "error",
              }),
              Effect.timeoutOrElse({
                duration: CalculatorRpcDeadline,
                orElse: () => Effect.fail(new CalculatorRpcDeadlineExceeded()),
              }),
              Effect.catchTag("RpcClientError", (error) =>
                Effect.fail(calculatorRpcTransportFailure(error))
              ),
              Effect.catchDefect((defect) =>
                Schema.is(RpcReplyDecodeDefect)(defect)
                  ? Effect.fail(new CalculatorRpcInvalidResponse())
                  : Effect.die(defect)
              )
            )
        ),
      });
    })
  ).pipe(
    Layer.provide(
      Layer.effect(
        RpcClient.Protocol,
        HttpClient.HttpClient.pipe(
          Effect.map((client) =>
            client.pipe(
              HttpClient.mapRequest(
                HttpClientRequest.setUrl(new URL("/rpc", origin).href)
              ),
              boundedCalculatorRpcHttpClient
            )
          ),
          Effect.flatMap(RpcClient.makeProtocolHttp)
        )
      )
    ),
    Layer.provide(replySerialization)
  );
