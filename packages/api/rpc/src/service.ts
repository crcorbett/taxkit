import type {
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/calculators/schemas";
import { Context } from "effect";
import type { Effect } from "effect";

import type { CalculatorRpcClientError } from "./errors.js";

export class TaxKitRpcClient extends Context.Service<
  TaxKitRpcClient,
  {
    readonly calculate: (
      request: CalculatorRunServiceRequest
    ) => Effect.Effect<CalculatorRunResponse, CalculatorRpcClientError>;
  }
>()("@taxkit/api-rpc/TaxKitRpcClient") {}
