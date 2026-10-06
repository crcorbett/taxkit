import { Match, Option, Schema } from "effect";
import type { RpcClientError } from "effect/rpc";

import {
  CalculatorRpcInvalidResponse,
  CalculatorRpcUnavailable,
  CalculatorRpcRequestTooLarge,
  CalculatorRateLimited,
  CalculatorRpcRequestTimedOut,
  CalculatorRpcResponseTooLarge,
} from "./errors.js";
import { RpcResponseBodyTooLarge } from "./response-budget.boundary.js";

export { boundedRpcHttpClient as boundedCalculatorRpcHttpClient } from "./response-budget.boundary.js";

// Native RPC retains the HTTP reason as an unknown cause. Read only the safe
// status/size projection once; never expose its request, headers or body.
const RejectedHttpStatus = Schema.TaggedStruct("StatusCodeError", {
  response: Schema.Struct({ status: Schema.Literals([408, 413, 429]) }),
});
const OversizedHttpReply = Schema.TaggedStruct("DecodeError", {
  cause: RpcResponseBodyTooLarge,
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
                  Match.when(429, () => new CalculatorRateLimited()),
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
