import type {
  CalculatorCatalogItem,
  CalculatorCatalogResponse,
  CalculatorGraphResponse,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
  CalculatorSchemaResponse,
  DescriptorFilterQuery,
  FactsResponse,
  GetCalculatorGraphRequest,
  GetCalculatorRequest,
  JurisdictionsResponse,
  MetadataQuery,
  RulesResponse,
  TaxYearsResponse,
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
    readonly getCalculator: (
      request: GetCalculatorRequest
    ) => Effect.Effect<CalculatorCatalogItem, CalculatorRpcClientError>;
    readonly getCalculatorGraph: (
      request: GetCalculatorGraphRequest
    ) => Effect.Effect<CalculatorGraphResponse, CalculatorRpcClientError>;
    readonly getCalculatorSchema: (
      request: GetCalculatorRequest
    ) => Effect.Effect<CalculatorSchemaResponse, CalculatorRpcClientError>;
    readonly listCalculators: (
      query: MetadataQuery
    ) => Effect.Effect<CalculatorCatalogResponse, CalculatorRpcClientError>;
    readonly listFacts: (
      query: DescriptorFilterQuery
    ) => Effect.Effect<FactsResponse, CalculatorRpcClientError>;
    readonly listJurisdictions: () => Effect.Effect<
      JurisdictionsResponse,
      CalculatorRpcClientError
    >;
    readonly listRules: (
      query: DescriptorFilterQuery
    ) => Effect.Effect<RulesResponse, CalculatorRpcClientError>;
    readonly listTaxYears: (
      query: MetadataQuery
    ) => Effect.Effect<TaxYearsResponse, CalculatorRpcClientError>;
  }
>()("@taxkit/api-rpc/TaxKitRpcClient") {}
