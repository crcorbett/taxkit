import type { CalculatorRunServiceRequest } from "@taxkit/calculators/schemas";
import { Effect, Layer, Match, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { Rpc, RpcClient, RpcSerialization } from "effect/rpc";

import {
  CalculatorRpcDeadlineExceeded,
  CalculatorRpcInvalidResponse,
  CalculatorRpcUnavailable,
} from "./errors.js";
import { Calculate, TaxKitRpcGroup } from "./group.js";
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
      return schema.ast === Rpc.exitSchema(Calculate).ast
        ? codec.pipe(
            Schema.catchDecoding<typeof codec>(() =>
              Effect.die(new RpcReplyDecodeDefect())
            )
          )
        : codec;
    },
  })
);

// The app supplies its matching-stage HttpClient. Native generated clients stay
// private and their lifetime belongs to the caller's Layer scope.
export const TaxKitRpcClientLive = (origin: CalculatorRpcOrigin) =>
  Layer.effect(
    TaxKitRpcClient,
    Effect.gen(function* () {
      const client = yield* RpcClient.make(TaxKitRpcGroup, {
        disableTracing: true,
      });
      return TaxKitRpcClient.of({
        calculate: Effect.fn("TaxKitRpcClient.calculate")(
          (request: CalculatorRunServiceRequest) =>
            client.Calculate({ request, version: CalculatorRpcVersion }).pipe(
              Effect.provideService(FetchHttpClient.RequestInit, {
                credentials: "omit",
                redirect: "error",
              }),
              Effect.timeoutOrElse({
                duration: CalculatorRpcDeadline,
                orElse: () => Effect.fail(new CalculatorRpcDeadlineExceeded()),
              }),
              Effect.catchTag("RpcClientError", (error) =>
                Effect.fail(
                  Match.value(error.reason).pipe(
                    Match.tag(
                      "RpcClientDefect",
                      () => new CalculatorRpcInvalidResponse()
                    ),
                    Match.tag("HttpError", (reason) =>
                      Match.value(reason.kind).pipe(
                        Match.whenOr(
                          "DecodeError",
                          "EmptyBodyError",
                          () => new CalculatorRpcInvalidResponse()
                        ),
                        Match.orElse(() => new CalculatorRpcUnavailable())
                      )
                    ),
                    Match.orElse(() => new CalculatorRpcUnavailable())
                  )
                )
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
      RpcClient.layerProtocolHttp({ url: new URL("/rpc", origin).href })
    ),
    Layer.provide(replySerialization)
  );
