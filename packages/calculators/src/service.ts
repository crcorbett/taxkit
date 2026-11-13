import type { CalculationError } from "@taxkit/core/errors";
import { Context } from "effect";
import type { Effect } from "effect";

import type {
  CalculatorServiceError,
  CalculatorMetadataError,
  UnsupportedCalculatorContextError,
} from "./errors.js";
import type {
  CalculatorCatalogItem,
  CalculatorCatalogResponse,
  CalculatorGraphResponse,
  CalculatorSchemaResponse,
  CalculatorRunResponse,
  CalculatorRunRequest,
  DescriptorFilterQuery,
  FactsResponse,
  GetCalculatorGraphRequest,
  GetCalculatorRequest,
  JurisdictionsResponse,
  MetadataQuery,
  RulesResponse,
  TaxYearsResponse,
} from "./schemas.js";

/**
 * What the static catalogue itself can do and fail with: metadata projections
 * that only fail for an unknown calculator context, and owning-definition
 * execution. It has no work budget, admission or capacity, so it declares none
 * of their errors.
 */
export interface CalculatorCatalogueContract {
  readonly calculate: (
    request: CalculatorRunRequest
  ) => Effect.Effect<
    CalculatorRunResponse,
    CalculationError | UnsupportedCalculatorContextError
  >;
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

/**
 * The public calculator operations. Metadata is the catalogue's own synchronous
 * projection; only `calculate` adds the shared work budget, capacity and
 * (on the native host) rate admission, with their errors.
 */
export interface PublicCalculatorServiceContract extends Omit<
  CalculatorCatalogueContract,
  "calculate"
> {
  readonly calculate: (
    request: CalculatorRunRequest
  ) => Effect.Effect<CalculatorRunResponse, CalculatorServiceError>;
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
  CalculatorCatalogueContract
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
