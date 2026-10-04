import type { CalculatorRpcClientError } from "@taxkit/api-rpc/errors";
import type {
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/api-rpc/schemas";
import { Context } from "effect";
import type { Effect } from "effect";

import type { TaxKitWebConfigError } from "./config";
import type { WebsitePublicSettings } from "./schemas";

export interface WebsiteServerApplicationContract {
  readonly settings: Effect.Effect<WebsitePublicSettings, TaxKitWebConfigError>;
  readonly calculate: (
    request: CalculatorRunServiceRequest
  ) => Effect.Effect<
    CalculatorRunResponse,
    CalculatorRpcClientError | TaxKitWebConfigError
  >;
}
export class WebsiteServerApplication extends Context.Service<
  WebsiteServerApplication,
  WebsiteServerApplicationContract
>()("taxkit/web/WebsiteServerApplication") {}
