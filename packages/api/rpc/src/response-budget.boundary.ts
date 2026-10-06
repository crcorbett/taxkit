import { ByteSize, Effect, Schema, Stream } from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";

import { CalculatorRpcResponseLimit } from "./schemas.js";

// Private channel failure: each named client projects it to its own safe error.
export class RpcResponseBodyTooLarge extends Schema.TaggedError<RpcResponseBodyTooLarge>()(
  "RpcResponseBodyTooLarge",
  {}
) {}

// Both closed JSON groups share one byte policy and native body lifetime.
export const boundedRpcHttpClient = (client: HttpClient.HttpClient) =>
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
                        cause: new RpcResponseBodyTooLarge(),
                        request: response.request,
                        response,
                      }),
                    })
                  )
                : Effect.succeed([next, [chunk]] as const);
            }
          ),
          Stream.mkUint8Array,
          // The native Web reader ignores MaxBodySize. Reuse its adapter after
          // the bounded read; the copy owns an ArrayBuffer-backed body.
          Effect.map((bytes) =>
            HttpClientResponse.fromWeb(
              response.request,
              new Response(new Uint8Array(bytes), { headers: response.headers })
            )
          )
        )
      )
    ),
    HttpClient.transformResponse(Effect.scoped)
  );
