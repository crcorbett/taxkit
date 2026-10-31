import { mcpPath } from "@taxkit/api-http/routes";
import {
  ByteSize,
  Effect,
  Option,
  Stream,
  Boolean as EffectBoolean,
} from "effect";
import type { Scope } from "effect";
import { HttpClientRequest, HttpServerResponse } from "effect/http";
import type { HttpBody, HttpServerError, HttpServerRequest } from "effect/http";

import {
  McpResponseDeadline,
  McpResponseLimit,
  McpResponseTooLarge,
} from "./schemas.js";
// The selected tools return complete replies. Read native JSON/SSE framing
// inside the native request Scope, with a byte cap and one total deadline.
// No subscription, resumption or unbounded event stream is advertised.
export const withBoundedMcpReply = Effect.fnUntraced(function* (
  handler: Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    HttpServerError.HttpServerError | HttpBody.HttpBodyError,
    HttpServerRequest.HttpServerRequest | Scope.Scope
  >
) {
  return yield* handler.pipe(
    Effect.flatMap((response) =>
      HttpServerResponse.toClientResponse(response, {
        request: HttpClientRequest.post(mcpPath),
      }).stream.pipe(
        Stream.mapAccumEffect(
          () => ByteSize.bytes(0),
          (total, chunk) => {
            const next = ByteSize.sum(total, ByteSize.bytes(chunk.byteLength));
            return EffectBoolean.match(
              ByteSize.isGreaterThan(next, McpResponseLimit),
              {
                onFalse: () => Effect.succeed([next, [chunk]] as const),
                onTrue: () => Effect.fail(new McpResponseTooLarge()),
              }
            );
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
    // Only this adapter's own body-read, size and deadline failures become
    // 503. Interruption and unexpected defects reach the native host handler.
    Effect.catchTags({
      HttpClientError: () => Effect.succeedNone,
      McpResponseTooLarge: () => Effect.succeedNone,
    }),
    Effect.map(
      Option.getOrElse(() => HttpServerResponse.empty({ status: 503 }))
    )
  );
});
