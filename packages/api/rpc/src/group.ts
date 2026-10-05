import {
  CalculatorCatalogResponse,
  CalculatorRunResponse,
} from "@taxkit/calculators/schemas";
import { Rpc, RpcGroup } from "effect/rpc";

import { CalculatorRpcExpectedError } from "./errors.js";
import {
  CalculatorCatalogRpcPayload,
  CalculatorRpcPayload,
  CalculatorRpcSafeDefect,
} from "./schemas.js";

export class Calculate extends Rpc.make("Calculate", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorRpcPayload,
  success: CalculatorRunResponse,
}) {}

export class ListCalculators extends Rpc.make("ListCalculators", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorCatalogRpcPayload,
  success: CalculatorCatalogResponse,
}) {}

export const TaxKitRpcGroup = RpcGroup.make(Calculate, ListCalculators);
