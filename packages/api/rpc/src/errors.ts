import { Schema } from "effect";

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
  {}
) {}

export const CalculatorRpcClientError = Schema.Union([
  CalculatorRpcExpectedError,
  CalculatorRpcUnavailable,
  CalculatorRpcInvalidResponse,
  CalculatorRpcDeadlineExceeded,
]);
export type CalculatorRpcClientError = typeof CalculatorRpcClientError.Type;
