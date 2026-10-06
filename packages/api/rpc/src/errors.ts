import {
  CalculatorRateLimited,
  CalculatorAdmissionUnavailable,
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
} from "@taxkit/calculators/schemas";
import { Schema } from "effect";

export {
  CalculatorRateLimited,
  CalculatorAdmissionUnavailable,
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
} from "@taxkit/calculators/schemas";

export class CalculatorRpcRejected extends Schema.TaggedError<CalculatorRpcRejected>()(
  "CalculatorRpcRejected",
  {
    reason: Schema.Literals(["input", "context", "unsupported", "calculation"]),
  }
) {}

export class CalculatorRpcVersionMismatch extends Schema.TaggedError<CalculatorRpcVersionMismatch>()(
  "CalculatorRpcVersionMismatch",
  {}
) {}

export const CalculatorRpcExpectedError = Schema.Union([
  CalculatorRpcRejected,
  CalculatorRpcVersionMismatch,
  CalculatorRateLimited,
  CalculatorAdmissionUnavailable,
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
]);

export class CalculatorRpcUnavailable extends Schema.TaggedError<CalculatorRpcUnavailable>()(
  "CalculatorRpcUnavailable",
  {}
) {}

export class CalculatorRpcInvalidResponse extends Schema.TaggedError<CalculatorRpcInvalidResponse>()(
  "CalculatorRpcInvalidResponse",
  {}
) {}

export class CalculatorRpcDeadlineExceeded extends Schema.TaggedError<CalculatorRpcDeadlineExceeded>()(
  "CalculatorRpcDeadlineExceeded",
  {
    code: Schema.tag("response-deadline"),
    message: Schema.tag(
      "The calculation could not finish within ten seconds. Try again when you are ready."
    ),
    retry: Schema.tag("try-again-manually"),
  }
) {}

export class CalculatorRpcRequestTooLarge extends Schema.TaggedError<CalculatorRpcRequestTooLarge>()(
  "CalculatorRpcRequestTooLarge",
  {
    code: Schema.tag("request-too-large"),
    message: Schema.tag(
      "The request is too large. Reduce it to 64 KiB or less before trying again."
    ),
    retry: Schema.tag("reduce-request"),
  }
) {}

export class CalculatorRpcRequestTimedOut extends Schema.TaggedError<CalculatorRpcRequestTimedOut>()(
  "CalculatorRpcRequestTimedOut",
  {
    code: Schema.tag("request-timeout"),
    message: Schema.tag(
      "The request timed out before it finished. Try again when you are ready."
    ),
    retry: Schema.tag("try-again-manually"),
  }
) {}

export class CalculatorRpcResponseTooLarge extends Schema.TaggedError<CalculatorRpcResponseTooLarge>()(
  "CalculatorRpcResponseTooLarge",
  {
    code: Schema.tag("response-too-large"),
    message: Schema.tag(
      "The reply is too large. Reduce the query before trying again."
    ),
    retry: Schema.tag("reduce-query"),
  }
) {}

export const CalculatorRpcClientError = Schema.Union([
  CalculatorRpcExpectedError,
  CalculatorRpcUnavailable,
  CalculatorRpcInvalidResponse,
  CalculatorRpcDeadlineExceeded,
  CalculatorRpcRequestTooLarge,

  CalculatorRpcRequestTimedOut,
  CalculatorRpcResponseTooLarge,
]);
export type CalculatorRpcClientError = typeof CalculatorRpcClientError.Type;
