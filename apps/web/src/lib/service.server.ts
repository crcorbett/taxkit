import type { DocsRpcClientError } from "@taxkit/api-rpc/content/errors";
import type { CalculatorRpcClientError } from "@taxkit/api-rpc/errors";
import type {
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/api-rpc/schemas";
import type {
  DocsPagePath,
  DocsPublicNavigation,
  DocsPublicPage,
  DocsSearchResult,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import { Context } from "effect";
import type { Effect } from "effect";

import type { TaxKitWebConfigError } from "./config";
import type { WebsitePublicSettings } from "./schemas";

export interface WebsiteServerApplicationContract {
  readonly docsNavigation: Effect.Effect<
    DocsPublicNavigation,
    DocsRpcClientError | TaxKitWebConfigError
  >;
  readonly docsPage: (
    path: DocsPagePath
  ) => Effect.Effect<DocsPublicPage, DocsRpcClientError | TaxKitWebConfigError>;
  readonly docsMarkdown: (
    path: DocsPagePath
  ) => Effect.Effect<string, DocsRpcClientError | TaxKitWebConfigError>;
  readonly searchDocs: (
    term: DocsSearchTerm
  ) => Effect.Effect<
    readonly DocsSearchResult[],
    DocsRpcClientError | TaxKitWebConfigError
  >;
  readonly catalogue: Effect.Effect<
    CalculatorCatalogResponse,
    CalculatorRpcClientError | TaxKitWebConfigError
  >;
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
