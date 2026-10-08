import type { HttpEffect } from "alchemy/Http";
import { ByteSize, Cause, Effect, Option, Stream } from "effect";
import { HttpClientRequest, HttpServerResponse } from "effect/http";

import {
  McpResponseDeadline,
  McpResponseLimit,
  McpResponseTooLarge,
} from "./mcp.schemas.js";

// The selected tools return complete replies. Read native JSON/SSE framing
// inside the native request Scope, with a byte cap and one total deadline.
// No subscription, resumption or unbounded event stream is advertised.
export const withBoundedMcpReply = Effect.fnUntraced(function* (
  handler: HttpEffect
) {
  return yield* handler.pipe(
    Effect.flatMap((response) =>
      HttpServerResponse.toClientResponse(response, {
        request: HttpClientRequest.post("/mcp"),
      }).stream.pipe(
        Stream.mapAccumEffect(
          () => ByteSize.bytes(0),
          (total, chunk) => {
            const next = ByteSize.sum(total, ByteSize.bytes(chunk.byteLength));
            return ByteSize.isGreaterThan(next, McpResponseLimit)
              ? Effect.fail(new McpResponseTooLarge())
              : Effect.succeed([next, [chunk]] as const);
          }
        ),
        Stream.mkUint8Array,
        Effect.map((bytes) =>
          HttpServerResponse.uint8Array(bytes, {
            cookies: response.cookies,
            headers: response.headers,
            status: response.status,
            statusText: response.statusText,
          })
        )
      )
    ),
    Effect.timeoutOption(McpResponseDeadline),
    Effect.catchCause((cause) =>
      Cause.hasInterrupts(cause) ? Effect.interrupt : Effect.succeedNone
    ),
    Effect.map(
      Option.getOrElse(() => HttpServerResponse.empty({ status: 503 }))
    )
  );
});
