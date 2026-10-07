import { Effect, Option } from "effect";

import { McpRequestAbortSignal } from "./mcp-request.service.js";
import { McpToolUnavailable } from "./mcp.schemas.js";

// Native toolkit work must finish when its original HTTP request
// disconnects. The native AbortSignal callback removes its listener on every exit;
// raceFirst interrupts the losing work and waits for its scoped cleanup.
export const withMcpRequestCancellation = Effect.fnUntraced(function* <A, E, R>(
  operation: Effect.Effect<A, E, R>
) {
  const signal = yield* McpRequestAbortSignal;
  if (Option.isNone(signal)) {
    return yield* Effect.fail(
      new McpToolUnavailable({
        code: "service-unavailable",
        retry: "try-again-manually",
      })
    );
  }
  if (signal.value.aborted) {
    return yield* Effect.interrupt;
  }
  return yield* operation.pipe(
    Effect.raceFirst(
      // AbortSignal requires a synchronous host listener. Register first, then
      // check again: cancellation can arrive before this race branch starts.
      Effect.callback<never>((resume) => {
        const abort = () => resume(Effect.interrupt);
        signal.value.addEventListener("abort", abort, { once: true });
        if (signal.value.aborted) {
          abort();
        }
        return Effect.sync(() =>
          signal.value.removeEventListener("abort", abort)
        );
      })
    )
  );
});
