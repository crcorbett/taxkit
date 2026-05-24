import {
  CalculationError,
  CalculationDiagnostics,
  FactAuthority,
  FactId,
  FactQuestion,
  GraphValidationIssue,
  ParameterEffectivePeriod,
  ParameterId,
  RuleId,
  RuleSourcePolicy,
  SourceRef,
} from "@whattax/core";
import {
  AnnualTaxReport,
  AuAnnualTaxCalculatorId,
  AuAnnualTaxJurisdiction,
  AuAnnualTaxYear,
} from "@whattax/rules-au-income-tax";
import {
  AuPayCalculatorId,
  AuPayJurisdiction,
  AuPayTaxYear,
  PayWithholdingsLedger,
  TakeHomePayReport,
} from "@whattax/rules-au-pay";
import { Data, Schema } from "effect";

/**
 * Public calculator ids supported by this package.
 *
 * The literals are owned by the rule packages. This package only composes them
 * into the public calculator API surface so it cannot drift from rule-owned
 * calculator metadata.
 */
export const CalculatorId = Schema.Union([
  AuPayCalculatorId,
  AuAnnualTaxCalculatorId,
]);

export type CalculatorId = typeof CalculatorId.Type;

/**
 * Public jurisdictions supported by the composed calculator catalog.
 *
 * Jurisdiction literals remain canonical in the owning rule package; adding a
 * new jurisdiction should extend the relevant rule package first.
 */
export const CalculatorJurisdiction = Schema.Union([
  AuPayJurisdiction,
  AuAnnualTaxJurisdiction,
]);

export type CalculatorJurisdiction = typeof CalculatorJurisdiction.Type;

/**
 * Public tax years supported by the composed calculator catalog.
 */
export const CalculatorTaxYear = Schema.Union([AuPayTaxYear, AuAnnualTaxYear]);

export type CalculatorTaxYear = typeof CalculatorTaxYear.Type;

const CalculatorContextFields = {
  jurisdiction: CalculatorJurisdiction,
  taxYear: CalculatorTaxYear,
};

const OptionalCalculatorContextFields = {
  jurisdiction: Schema.optional(CalculatorJurisdiction),
  taxYear: Schema.optional(CalculatorTaxYear),
};

export const CalculatorContext = Schema.Struct({
  ...CalculatorContextFields,
});

export type CalculatorContext = typeof CalculatorContext.Type;

/**
 * Optional calculator context supplied by list/detail/calculate requests.
 *
 * Optionality belongs in this schema so service code can use typed request
 * values without raw `undefined` checks or conditional response shaping.
 */
export const CalculatorContextQuery = Schema.Struct({
  ...OptionalCalculatorContextFields,
});

export type CalculatorContextQuery = typeof CalculatorContextQuery.Type;

export const HelpMode = Schema.Literals([
  "none",
  "errors",
  "schema",
  "examples",
  "sources",
  "full",
]);

export type HelpMode = typeof HelpMode.Type;

/**
 * Transport-safe representation of one schema decode issue.
 */
export class CalculatorInputIssue extends Schema.TaggedClass<CalculatorInputIssue>()(
  "CalculatorInputIssue",
  {
    message: Schema.String,
    path: Schema.Array(Schema.String),
  }
) {}

/**
 * Field-level guidance returned when the caller asks for error help.
 */
export const CalculatorInputHelp = Schema.Struct({
  factId: FactId,
  question: Schema.optional(FactQuestion),
  title: Schema.String,
});

export type CalculatorInputHelp = typeof CalculatorInputHelp.Type;

/**
 * Public error returned when request facts do not match the calculator's input
 * fact schema.
 */
export class CalculatorInputDecodeError extends Schema.TaggedClass<CalculatorInputDecodeError>()(
  "CalculatorInputDecodeError",
  {
    calculatorId: Schema.optional(CalculatorId),
    help: Schema.optional(Schema.Array(CalculatorInputHelp)),
    issues: Schema.Array(CalculatorInputIssue),
    message: Schema.String,
  }
) {}

/**
 * Public error for a supported request shape that names no catalog entry.
 */
export class UnsupportedCalculatorError extends Schema.TaggedClass<UnsupportedCalculatorError>()(
  "UnsupportedCalculatorError",
  {
    message: Schema.String,
    requestedCalculator: Schema.String,
  }
) {}

/**
 * Public error for calculator/context combinations that are not in the catalog.
 */
export class UnsupportedCalculatorContextError extends Schema.TaggedClass<UnsupportedCalculatorContextError>()(
  "UnsupportedCalculatorContextError",
  {
    context: CalculatorContextQuery,
    message: Schema.String,
    requestedCalculator: CalculatorId,
  }
) {}

export const PublicApiError = Schema.Union([
  CalculationError,
  CalculatorInputDecodeError,
  UnsupportedCalculatorError,
  UnsupportedCalculatorContextError,
]);

export type PublicApiError = typeof PublicApiError.Type;

export type PublicCalculatorError = PublicApiError;

/**
 * Catalog entry shape returned by discovery endpoints.
 */
export const CalculatorCatalogItem = Schema.Struct({
  calculatorId: CalculatorId,
  context: CalculatorContext,
  description: Schema.String,
  inputFactIds: Schema.Array(FactId),
  outputFactIds: Schema.Array(FactId),
  reportSchemaName: Schema.String,
  ruleIds: Schema.Array(RuleId),
  supportedHelpModes: Schema.Array(HelpMode),
  title: Schema.String,
});

export type CalculatorCatalogItem = typeof CalculatorCatalogItem.Type;

export const CalculatorCatalogResponse = Schema.Struct({
  calculators: Schema.Array(CalculatorCatalogItem),
});

export type CalculatorCatalogResponse = typeof CalculatorCatalogResponse.Type;

export const Jurisdiction = Schema.Struct({
  code: CalculatorJurisdiction,
  title: Schema.String,
});

export type Jurisdiction = typeof Jurisdiction.Type;

export const JurisdictionsResponse = Schema.Struct({
  jurisdictions: Schema.Array(Jurisdiction),
});

export type JurisdictionsResponse = typeof JurisdictionsResponse.Type;

export const TaxYear = Schema.Struct({
  ...CalculatorContextFields,
});

export type TaxYear = typeof TaxYear.Type;

export const TaxYearsResponse = Schema.Struct({
  taxYears: Schema.Array(TaxYear),
});

export type TaxYearsResponse = typeof TaxYearsResponse.Type;

export const MetadataQuery = Schema.Struct({
  ...OptionalCalculatorContextFields,
});

export type MetadataQuery = typeof MetadataQuery.Type;

export const HelpQuery = Schema.Struct({
  help: Schema.optional(HelpMode),
  ...OptionalCalculatorContextFields,
});

export type HelpQuery = typeof HelpQuery.Type;

export const CalculationQuery = Schema.Struct({
  help: Schema.optional(HelpMode),
});

export type CalculationQuery = typeof CalculationQuery.Type;

export const GetCalculatorRequest = Schema.Struct({
  calculatorId: CalculatorId,
  help: Schema.optional(HelpMode),
  ...OptionalCalculatorContextFields,
});

export type GetCalculatorRequest = typeof GetCalculatorRequest.Type;

export const GetCalculatorGraphRequest = Schema.Struct({
  calculatorId: CalculatorId,
  ...OptionalCalculatorContextFields,
});

export type GetCalculatorGraphRequest = typeof GetCalculatorGraphRequest.Type;

export const DescriptorFilterQuery = Schema.Struct({
  calculator: Schema.optional(CalculatorId),
  ...OptionalCalculatorContextFields,
});

export type DescriptorFilterQuery = typeof DescriptorFilterQuery.Type;

/**
 * Public metadata for one parameter descriptor.
 */
export const ParameterDescriptorMetadata = Schema.Struct({
  effectivePeriod: ParameterEffectivePeriod,
  id: ParameterId,
  source: SourceRef,
  title: Schema.String,
});

export type ParameterDescriptorMetadata =
  typeof ParameterDescriptorMetadata.Type;

/**
 * Public metadata for one input or output fact descriptor.
 */
export const FactDescriptorMetadata = Schema.Struct({
  authority: FactAuthority,
  id: FactId,
  question: Schema.optional(FactQuestion),
  schemaTag: Schema.String,
  title: Schema.String,
});

export type FactDescriptorMetadata = typeof FactDescriptorMetadata.Type;

/**
 * Public metadata for one rule descriptor and its dependency edges.
 */
export const RuleDescriptorMetadata = Schema.Struct({
  allowDuplicateProvides: Schema.optional(Schema.Boolean),
  id: RuleId,
  parameters: Schema.Array(ParameterDescriptorMetadata),
  provides: Schema.Array(FactId),
  requires: Schema.Array(FactId),
  sourcePolicy: RuleSourcePolicy,
  sources: Schema.Array(SourceRef),
  title: Schema.String,
});

export type RuleDescriptorMetadata = typeof RuleDescriptorMetadata.Type;

export const FactsResponse = Schema.Struct({
  facts: Schema.Array(FactDescriptorMetadata),
});

export type FactsResponse = typeof FactsResponse.Type;

export const RulesResponse = Schema.Struct({
  rules: Schema.Array(RuleDescriptorMetadata),
});

export type RulesResponse = typeof RulesResponse.Type;

export const CalculatorSchemaResponse = Schema.Struct({
  calculator: CalculatorCatalogItem,
  inputFacts: Schema.Array(FactDescriptorMetadata),
  outputFacts: Schema.Array(FactDescriptorMetadata),
  reportSchemaName: Schema.String,
  rules: Schema.Array(RuleDescriptorMetadata),
});

export type CalculatorSchemaResponse = typeof CalculatorSchemaResponse.Type;

export const RuleGraphEdge = Schema.Struct({
  from: FactId,
  ruleId: RuleId,
  to: FactId,
});

export type RuleGraphEdge = typeof RuleGraphEdge.Type;

export const CalculatorGraphResponse = Schema.Struct({
  calculator: CalculatorCatalogItem,
  edges: Schema.Array(RuleGraphEdge),
  facts: Schema.Array(FactDescriptorMetadata),
  rules: Schema.Array(RuleDescriptorMetadata),
  validationIssues: Schema.Array(GraphValidationIssue),
});

export type CalculatorGraphResponse = typeof CalculatorGraphResponse.Type;

export const PublicCalculationRequest = Schema.Struct({
  facts: Schema.Unknown,
  ...OptionalCalculatorContextFields,
});

export type PublicCalculationRequest = typeof PublicCalculationRequest.Type;

/**
 * Service-level calculation request after route params, query params and JSON
 * body have been decoded by the HTTP API package.
 */
export const PublicCalculationServiceRequest = Schema.Struct({
  calculatorId: CalculatorId,
  help: Schema.optional(HelpMode),
  payload: PublicCalculationRequest,
});

export type PublicCalculationServiceRequest =
  typeof PublicCalculationServiceRequest.Type;

export const PublicCalculationReport = Schema.Union([
  TakeHomePayReport,
  PayWithholdingsLedger,
  AnnualTaxReport,
]);

export type PublicCalculationReport = typeof PublicCalculationReport.Type;

/**
 * Public calculation response with catalog metadata, diagnostics and the typed
 * calculator-specific report.
 */
export const PublicCalculationResponse = Schema.Struct({
  calculator: CalculatorCatalogItem,
  diagnostics: CalculationDiagnostics,
  report: PublicCalculationReport,
});

export type PublicCalculationResponse = typeof PublicCalculationResponse.Type;

export class CalculatorCatalogResponseData extends Data.Class<CalculatorCatalogResponse> {}

export class PublicCalculationResponseData extends Data.Class<PublicCalculationResponse> {}
