import { Context } from "effect";
import type { Effect } from "effect";

import type {
  CalculatorCatalogItem,
  CalculatorCatalogResponse,
  CalculatorGraphResponse,
  CalculatorSchemaResponse,
  CalculatorRunResponse,
  CalculatorRunRequest,
  CalculatorServiceError,
  CalculatorMetadataError,
  CalculatorOperationTimedOut,
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
    request: CalculatorRunRequest
  ) => Effect.Effect<CalculatorRunResponse, CalculatorServiceError>;
  readonly getCalculator: (
    request: GetCalculatorRequest
  ) => Effect.Effect<CalculatorCatalogItem, CalculatorMetadataError>;
  readonly getCalculatorGraph: (
    request: GetCalculatorGraphRequest
  ) => Effect.Effect<CalculatorGraphResponse, CalculatorMetadataError>;
  readonly getCalculatorSchema: (
    request: GetCalculatorRequest
  ) => Effect.Effect<CalculatorSchemaResponse, CalculatorMetadataError>;
  readonly listCalculators: (
    query: MetadataQuery
  ) => Effect.Effect<CalculatorCatalogResponse, CalculatorOperationTimedOut>;
  readonly listFacts: (
    query: DescriptorFilterQuery
  ) => Effect.Effect<FactsResponse, CalculatorOperationTimedOut>;
  readonly listJurisdictions: () => Effect.Effect<
    JurisdictionsResponse,
    CalculatorOperationTimedOut
  >;
  readonly listRules: (
    query: DescriptorFilterQuery
  ) => Effect.Effect<RulesResponse, CalculatorOperationTimedOut>;
  readonly listTaxYears: (
    query: MetadataQuery
  ) => Effect.Effect<TaxYearsResponse, CalculatorOperationTimedOut>;
}

export class PublicCalculatorService extends Context.Service<
  PublicCalculatorService,
  PublicCalculatorServiceContract
>()("@taxkit/calculators/PublicCalculatorService") {}

/**
 * The calculator catalogue itself: metadata projections and owning-definition
 * execution, without host work, admission or usage policy. The public service
 * implementation acquires it; tests substitute it to control the work.
 */
export class CalculatorCatalogue extends Context.Service<
  CalculatorCatalogue,
  PublicCalculatorServiceContract
>()("@taxkit/calculators/CalculatorCatalogue") {}

/**
 * Observes each successful calculation once, after its work budget. Every
 * composition names its observer; hosts without usage collection supply
 * `CalculatorUsageDisabled`.
 */
export class CalculatorUsage extends Context.Service<
  CalculatorUsage,
  {
    readonly record: (response: CalculatorRunResponse) => Effect.Effect<void>;
  }
>()("@taxkit/calculators/CalculatorUsage") {}
