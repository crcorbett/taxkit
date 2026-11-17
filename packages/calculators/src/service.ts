import type { CalculationError } from "@taxkit/core/errors";
import { Context } from "effect";
import type { Effect, Option } from "effect";

import type {
  CalculatorAdmissionUnavailable,
  CalculatorRateLimited,
  CalculatorServiceError,
  CalculatorMetadataError,
  UnsupportedCalculatorContextError,
} from "./errors.js";
import type {
  CalculatorCatalogItem,
  CalculatorCatalogResponse,
  CalculatorClientRateKey,
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

/**
 * The current request's admission identity, as its host derives it. The
 * rate-limited service requires it, so a host that cannot name its caller
 * fails to compose rather than refusing every calculation at run time. No
 * identity for a request is `Option.none` and refuses admission.
 */
export class CalculatorRequestRateKey extends Context.Service<
  CalculatorRequestRateKey,
  {
    readonly current: Effect.Effect<Option.Option<CalculatorClientRateKey>>;
  }
>()("@taxkit/calculators/CalculatorRequestRateKey") {}

export class CalculatorAdmission extends Context.Service<
  CalculatorAdmission,
  {
    readonly admitCalculation: (
      key: CalculatorClientRateKey
    ) => Effect.Effect<
      void,
      CalculatorRateLimited | CalculatorAdmissionUnavailable
    >;
  }
>()("@taxkit/calculators/CalculatorAdmission") {}
