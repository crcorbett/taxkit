import { CalculatorRunResponse } from "@taxkit/calculators/schemas";
import { Rpc, RpcGroup } from "effect/rpc";

import { CalculatorRpcExpectedError } from "./errors.js";
import { CalculatorRpcPayload, CalculatorRpcSafeDefect } from "./schemas.js";

export class Calculate extends Rpc.make("Calculate", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorRpcPayload,
  success: CalculatorRunResponse,
}) {}

export const TaxKitRpcGroup = RpcGroup.make(Calculate);
