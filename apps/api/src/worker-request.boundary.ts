import type { HttpEffect } from "alchemy/Http";
import { ByteSize, Effect, Option, Stream } from "effect";
import {
  Headers,
  HttpClientRequest,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import {
  ApiRequestBodyDeadline,
  ApiRequestBodyLimit,
  ApiRequestBodyRejected,
} from "./schemas.js";

// Native web-request readers do not use MaxBodySize in this selected version.
// Bound the native stream before materialising bytes, then reuse the native
// request conversion rather than replacing JSON parsing or RPC framing.
export const withApiRequestBodyLimit = (handler: HttpEffect) =>
  Effect.gen(function* () {
    const incoming = yield* HttpServerRequest.HttpServerRequest;
    if (incoming.method !== "POST") {
      return yield* handler;
    }
    const bytes = yield* incoming.stream.pipe(
      Stream.mapAccumEffect(
        () => ByteSize.bytes(0),
        (total, chunk) => {
          const next = ByteSize.sum(total, ByteSize.bytes(chunk.byteLength));
          return ByteSize.isGreaterThan(next, ApiRequestBodyLimit)
            ? Effect.fail(new ApiRequestBodyRejected({ reason: "size" }))
            : Effect.succeed([next, [chunk]] as const);
        }
      ),
      Stream.mkUint8Array,
      Effect.timeoutOrElse({
        duration: ApiRequestBodyDeadline,
        orElse: () =>
          Effect.fail(new ApiRequestBodyRejected({ reason: "deadline" })),
      })
    );
    const bounded = HttpServerRequest.toClientRequest(incoming)
      .pipe(
        HttpClientRequest.bodyUint8Array(
          bytes,
          Headers.get(incoming.headers, "content-type").pipe(
            Option.getOrUndefined
          )
        ),
        HttpServerRequest.fromClientRequest
      )
      .modify({ remoteAddress: incoming.remoteAddress, url: incoming.url });
    return yield* handler.pipe(
      Effect.provideService(HttpServerRequest.HttpServerRequest, bounded)
    );
  }).pipe(
    Effect.catchTag("ApiRequestBodyRejected", ({ reason }) =>
      Effect.succeed(
        HttpServerResponse.empty({ status: reason === "size" ? 413 : 408 })
      )
    )
  );
