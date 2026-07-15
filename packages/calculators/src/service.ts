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
  DescriptorFilterQuery,
  FactsResponse,
  GetCalculatorGraphRequest,
  GetCalculatorRequest,
  JurisdictionsResponse,
  MetadataQuery,
  RulesResponse,
  TaxYearsResponse,
} from "./schemas.js";

export interface PublicCalculatorServiceShape {
  readonly calculate: (
    request: CalculatorRunServiceRequest
  ) => Effect.Effect<CalculatorRunResponse, CalculatorServiceError>;
  readonly getCalculator: (
    request: GetCalculatorRequest
  ) => Effect.Effect<CalculatorCatalogItem, CalculatorServiceError>;
  readonly getCalculatorGraph: (
    request: GetCalculatorGraphRequest
  ) => Effect.Effect<CalculatorGraphResponse, CalculatorServiceError>;
  readonly getCalculatorSchema: (
    request: GetCalculatorRequest
  ) => Effect.Effect<CalculatorSchemaResponse, CalculatorServiceError>;
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
  PublicCalculatorServiceShape
>()("@taxkit/calculators/PublicCalculatorService") {}
