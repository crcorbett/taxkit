import type {
  CalculatorRunServiceRequest,
  DescriptorFilterQuery,
  GetCalculatorGraphRequest,
  GetCalculatorRequest,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import { Array, Effect, Layer, Schema } from "effect";
import type { Scope } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import type { RpcClientError } from "effect/rpc";
import { Rpc, RpcClient, RpcSerialization } from "effect/rpc";

import {
  boundedCalculatorRpcHttpClient,
  calculatorRpcTransportFailure,
} from "./client-response.boundary.js";
import type { CalculatorRpcExpectedError } from "./errors.js";
import {
  CalculatorRpcDeadlineExceeded,
  CalculatorRpcInvalidResponse,
} from "./errors.js";
import { TaxKitRpcGroup } from "./group.js";
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
      return Array.some(
        Array.fromIterable(TaxKitRpcGroup.requests.values()),
        (procedure) => schema.ast === Rpc.exitSchema(procedure).ast
      )
        ? codec.pipe(
            Schema.catchDecoding<typeof codec>(() =>
              Effect.die(new RpcReplyDecodeDefect())
            )
          )
        : codec;
    },
  })
);

// The concrete native operation owns its client scope, complete-response budget
// and safe failure projection. This accepts an Effect, never a raw-client callback.
const checkedRpcOperation = <A>(
  operation: Effect.Effect<
    A,
    typeof CalculatorRpcExpectedError.Type | RpcClientError.RpcClientError,
    Scope.Scope | RpcClient.Protocol
  >,
  protocol: RpcClient.Protocol["Service"]
) =>
  operation.pipe(
    Effect.scoped,
    Effect.provideService(RpcClient.Protocol, protocol),
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
            checkedRpcOperation(
              RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
                Effect.flatMap((client) =>
                  client.Calculate({ request, version: CalculatorRpcVersion })
                )
              ),
              protocol
            )
        ),
        getCalculator: Effect.fn("TaxKitRpcClient.getCalculator")(
          (request: GetCalculatorRequest) =>
            checkedRpcOperation(
              RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
                Effect.flatMap((client) =>
                  client.GetCalculator({
                    request,
                    version: CalculatorRpcVersion,
                  })
                )
              ),
              protocol
            )
        ),
        getCalculatorGraph: Effect.fn("TaxKitRpcClient.getCalculatorGraph")(
          (request: GetCalculatorGraphRequest) =>
            checkedRpcOperation(
              RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
                Effect.flatMap((client) =>
                  client.GetCalculatorGraph({
                    request,
                    version: CalculatorRpcVersion,
                  })
                )
              ),
              protocol
            )
        ),
        getCalculatorSchema: Effect.fn("TaxKitRpcClient.getCalculatorSchema")(
          (request: GetCalculatorRequest) =>
            checkedRpcOperation(
              RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
                Effect.flatMap((client) =>
                  client.GetCalculatorSchema({
                    request,
                    version: CalculatorRpcVersion,
                  })
                )
              ),
              protocol
            )
        ),
        listCalculators: Effect.fn("TaxKitRpcClient.listCalculators")(
          (query: MetadataQuery) =>
            checkedRpcOperation(
              RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
                Effect.flatMap((client) =>
                  client.ListCalculators({
                    query,
                    version: CalculatorRpcVersion,
                  })
                )
              ),
              protocol
            )
        ),
        listFacts: Effect.fn("TaxKitRpcClient.listFacts")(
          (query: DescriptorFilterQuery) =>
            checkedRpcOperation(
              RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
                Effect.flatMap((client) =>
                  client.ListFacts({ query, version: CalculatorRpcVersion })
                )
              ),
              protocol
            )
        ),
        listJurisdictions: Effect.fn("TaxKitRpcClient.listJurisdictions")(() =>
          checkedRpcOperation(
            RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
              Effect.flatMap((client) =>
                client.ListJurisdictions({ version: CalculatorRpcVersion })
              )
            ),
            protocol
          )
        ),
        listRules: Effect.fn("TaxKitRpcClient.listRules")(
          (query: DescriptorFilterQuery) =>
            checkedRpcOperation(
              RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
                Effect.flatMap((client) =>
                  client.ListRules({ query, version: CalculatorRpcVersion })
                )
              ),
              protocol
            )
        ),
        listTaxYears: Effect.fn("TaxKitRpcClient.listTaxYears")(
          (query: MetadataQuery) =>
            checkedRpcOperation(
              RpcClient.make(TaxKitRpcGroup, { disableTracing: true }).pipe(
                Effect.flatMap((client) =>
                  client.ListTaxYears({ query, version: CalculatorRpcVersion })
                )
              ),
              protocol
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
