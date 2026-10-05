import type {
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import { Context } from "effect";
import type { Effect } from "effect";

import type { CalculatorRpcClientError } from "./errors.js";

export class TaxKitRpcClient extends Context.Service<
  TaxKitRpcClient,
  {
    readonly listCalculators: (
      query: MetadataQuery
    ) => Effect.Effect<CalculatorCatalogResponse, CalculatorRpcClientError>;
    readonly calculate: (
      request: CalculatorRunServiceRequest
    ) => Effect.Effect<CalculatorRunResponse, CalculatorRpcClientError>;
  }
>()("@taxkit/api-rpc/TaxKitRpcClient") {}
