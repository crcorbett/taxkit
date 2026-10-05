import { Context } from "effect";
import type { Effect } from "effect";

import type {
  CalculatorCatalogItem,
  CalculatorCatalogResponse,
  CalculatorGraphResponse,
  CalculatorSchemaResponse,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
  CalculatorServiceError,
  CalculatorRequestError,
  DescriptorFilterQuery,
  FactsResponse,
  GetCalculatorGraphRequest,
  GetCalculatorRequest,
  JurisdictionsResponse,
  MetadataQuery,
  RulesResponse,
  TaxYearsResponse,
} from "./schemas.js";

export interface PublicCalculatorServiceContract {
  readonly calculate: (
    request: CalculatorRunServiceRequest
  ) => Effect.Effect<CalculatorRunResponse, CalculatorServiceError>;
  readonly getCalculator: (
    request: GetCalculatorRequest
  ) => Effect.Effect<CalculatorCatalogItem, CalculatorRequestError>;
  readonly getCalculatorGraph: (
    request: GetCalculatorGraphRequest
  ) => Effect.Effect<CalculatorGraphResponse, CalculatorRequestError>;
  readonly getCalculatorSchema: (
    request: GetCalculatorRequest
  ) => Effect.Effect<CalculatorSchemaResponse, CalculatorRequestError>;
  readonly listCalculators: (
    query: MetadataQuery
  ) => Effect.Effect<CalculatorCatalogResponse>;
  readonly listFacts: (
    query: DescriptorFilterQuery
  ) => Effect.Effect<FactsResponse>;
  readonly listJurisdictions: () => Effect.Effect<JurisdictionsResponse>;
  readonly listRules: (
    query: DescriptorFilterQuery
  ) => Effect.Effect<RulesResponse>;
  readonly listTaxYears: (
    query: MetadataQuery
  ) => Effect.Effect<TaxYearsResponse>;
}

export class PublicCalculatorService extends Context.Service<
  PublicCalculatorService,
  PublicCalculatorServiceContract
>()("@taxkit/calculators/PublicCalculatorService") {}
