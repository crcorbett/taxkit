import { ByteSize, Effect, Match, Option, Schema, Stream } from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";
import type { RpcClientError } from "effect/rpc";

import {
  CalculatorRpcInvalidResponse,
  CalculatorRpcUnavailable,
  CalculatorRpcRequestTooLarge,
  CalculatorRpcRateLimited,
  CalculatorRpcRequestTimedOut,
  CalculatorRpcResponseTooLarge,
} from "./errors.js";
import { CalculatorRpcResponseLimit } from "./schemas.js";

// Native RPC retains the HTTP reason as an unknown cause. Read only the safe
// status/size projection once; never expose its request, headers or body.
const RejectedHttpStatus = Schema.TaggedStruct("StatusCodeError", {
  response: Schema.Struct({ status: Schema.Literals([408, 413, 429]) }),
});
const OversizedHttpReply = Schema.TaggedStruct("DecodeError", {
  cause: CalculatorRpcResponseTooLarge,
});

export const calculatorRpcTransportFailure = (
  error: RpcClientError.RpcClientError
) =>
  Match.value(error.reason).pipe(
    Match.tag("RpcClientDefect", () => new CalculatorRpcInvalidResponse()),
    Match.tag("HttpError", (reason) =>
      Schema.decodeUnknownOption(
        Schema.Union([RejectedHttpStatus, OversizedHttpReply])
      )(reason.cause).pipe(
        Option.match({
          onNone: () =>
            Match.value(reason.kind).pipe(
              Match.whenOr(
                "DecodeError",
                "EmptyBodyError",
                () => new CalculatorRpcInvalidResponse()
              ),
              Match.orElse(() => new CalculatorRpcUnavailable())
            ),
          onSome: (rejection) =>
            Match.value(rejection).pipe(
              Match.tag(
                "DecodeError",
                () => new CalculatorRpcResponseTooLarge()
              ),
              Match.tag("StatusCodeError", ({ response }) =>
                Match.value(response.status).pipe(
                  Match.when(408, () => new CalculatorRpcRequestTimedOut()),
                  Match.when(413, () => new CalculatorRpcRequestTooLarge()),
                  Match.when(429, () => new CalculatorRpcRateLimited()),
                  Match.exhaustive
                )
              ),
              Match.exhaustive
            ),
        })
      )
    ),
    Match.orElse(() => new CalculatorRpcUnavailable())
  );

// One concrete private HTTP adapter for both closed native operations. Keep
// the native Protocol/parser/exit Schemas; count bytes before materialisation.
export const boundedCalculatorRpcHttpClient = (client: HttpClient.HttpClient) =>
  client.pipe(
    HttpClient.withScope,
    HttpClient.filterStatusOk,
    HttpClient.transformResponse(
      Effect.flatMap((response) =>
        response.stream.pipe(
          Stream.mapAccumEffect(
            () => ByteSize.bytes(0),
            (total, chunk) => {
              const next = ByteSize.sum(
                total,
                ByteSize.bytes(chunk.byteLength)
              );
              return ByteSize.isGreaterThan(next, CalculatorRpcResponseLimit)
                ? Effect.fail(
                    new HttpClientError.HttpClientError({
                      reason: new HttpClientError.DecodeError({
                        cause: new CalculatorRpcResponseTooLarge(),
                        request: response.request,
                        response,
                      }),
                    })
                  )
                : Effect.succeed([next, [chunk]] as const);
            }
          ),
          Stream.mkUint8Array,
          // This native Web reader ignores MaxBodySize. After the bounded read,
          // reuse its Response adapter. The byte copy owns an ArrayBuffer body.
          Effect.map((bytes) =>
            HttpClientResponse.fromWeb(
              response.request,
              new Response(new Uint8Array(bytes), {
                headers: response.headers,
              })
            )
          )
        )
      )
    ),
    // Close the actual HTTP request after the bounded body read, or on status
    // rejection/interruption, before native RPC parses the retained bytes.
    HttpClient.transformResponse(Effect.scoped)
  );
