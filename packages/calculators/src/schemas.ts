import {
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
import { AnnualTaxReport } from "@whattax/rules-au-income-tax";
import {
  PayWithholdingsLedger,
  TakeHomePayReport,
} from "@whattax/rules-au-pay";
import { Data, Schema } from "effect";

export const CalculatorId = Schema.Literals([
  "au.pay.take-home",
  "au.pay.withholdings",
  "au.income-tax.annual",
]);

export type CalculatorId = typeof CalculatorId.Type;

export const CalculatorContext = Schema.Struct({
  jurisdiction: Schema.Literal("AU"),
  taxYear: Schema.Literal("2025-26"),
});

export type CalculatorContext = typeof CalculatorContext.Type;

export const HelpMode = Schema.Literals([
  "none",
  "errors",
  "schema",
  "examples",
  "sources",
  "full",
]);

export type HelpMode = typeof HelpMode.Type;

export class SchemaDecodeIssue extends Schema.TaggedClass<SchemaDecodeIssue>()(
  "SchemaDecodeIssue",
  {
    message: Schema.String,
    path: Schema.Array(Schema.String),
  }
) {}

export const SchemaDecodeHelp = Schema.Struct({
  factId: FactId,
  question: Schema.optional(FactQuestion),
  title: Schema.String,
});

export type SchemaDecodeHelp = typeof SchemaDecodeHelp.Type;

export class PublicSchemaDecodeError extends Schema.TaggedClass<PublicSchemaDecodeError>()(
  "PublicSchemaDecodeError",
  {
    calculatorId: Schema.optional(CalculatorId),
    help: Schema.optional(Schema.Array(SchemaDecodeHelp)),
    issues: Schema.Array(SchemaDecodeIssue),
    message: Schema.String,
  }
) {}

export class UnsupportedCalculatorError extends Schema.TaggedClass<UnsupportedCalculatorError>()(
  "UnsupportedCalculatorError",
  {
    message: Schema.String,
    requestedCalculator: Schema.String,
  }
) {}

export class UnsupportedCalculatorContextError extends Schema.TaggedClass<UnsupportedCalculatorContextError>()(
  "UnsupportedCalculatorContextError",
  {
    context: Schema.Struct({
      jurisdiction: Schema.optional(Schema.String),
      taxYear: Schema.optional(Schema.String),
    }),
    message: Schema.String,
    requestedCalculator: CalculatorId,
  }
) {}

export const PublicApiError = Schema.Union([
  PublicSchemaDecodeError,
  UnsupportedCalculatorError,
  UnsupportedCalculatorContextError,
]);

export type PublicApiError = typeof PublicApiError.Type;

export type PublicCalculatorError = PublicApiError;

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
  code: Schema.Literal("AU"),
  title: Schema.String,
});

export type Jurisdiction = typeof Jurisdiction.Type;

export const JurisdictionsResponse = Schema.Struct({
  jurisdictions: Schema.Array(Jurisdiction),
});

export type JurisdictionsResponse = typeof JurisdictionsResponse.Type;

export const TaxYear = Schema.Struct({
  jurisdiction: Schema.Literal("AU"),
  taxYear: Schema.Literal("2025-26"),
});

export type TaxYear = typeof TaxYear.Type;

export const TaxYearsResponse = Schema.Struct({
  taxYears: Schema.Array(TaxYear),
});

export type TaxYearsResponse = typeof TaxYearsResponse.Type;

export const MetadataQuery = Schema.Struct({
  jurisdiction: Schema.optional(Schema.Literal("AU")),
  taxYear: Schema.optional(Schema.Literal("2025-26")),
});

export type MetadataQuery = typeof MetadataQuery.Type;

export const HelpQuery = Schema.Struct({
  help: Schema.optional(HelpMode),
  jurisdiction: Schema.optional(Schema.Literal("AU")),
  taxYear: Schema.optional(Schema.Literal("2025-26")),
});

export type HelpQuery = typeof HelpQuery.Type;

export const CalculationQuery = Schema.Struct({
  help: Schema.optional(HelpMode),
});

export type CalculationQuery = typeof CalculationQuery.Type;

export const GetCalculatorRequest = Schema.Struct({
  calculatorId: CalculatorId,
  help: Schema.optional(HelpMode),
  jurisdiction: Schema.optional(Schema.Literal("AU")),
  taxYear: Schema.optional(Schema.Literal("2025-26")),
});

export type GetCalculatorRequest = typeof GetCalculatorRequest.Type;

export const GetCalculatorGraphRequest = Schema.Struct({
  calculatorId: CalculatorId,
  jurisdiction: Schema.optional(Schema.Literal("AU")),
  taxYear: Schema.optional(Schema.Literal("2025-26")),
});

export type GetCalculatorGraphRequest = typeof GetCalculatorGraphRequest.Type;

export const DescriptorFilterQuery = Schema.Struct({
  calculator: Schema.optional(CalculatorId),
  jurisdiction: Schema.optional(Schema.Literal("AU")),
  taxYear: Schema.optional(Schema.Literal("2025-26")),
});

export type DescriptorFilterQuery = typeof DescriptorFilterQuery.Type;

export const ParameterDescriptorMetadata = Schema.Struct({
  effectivePeriod: ParameterEffectivePeriod,
  id: ParameterId,
  source: SourceRef,
  title: Schema.String,
});

export type ParameterDescriptorMetadata =
  typeof ParameterDescriptorMetadata.Type;

export const FactDescriptorMetadata = Schema.Struct({
  authority: FactAuthority,
  id: FactId,
  question: Schema.optional(FactQuestion),
  schemaTag: Schema.String,
  title: Schema.String,
});

export type FactDescriptorMetadata = typeof FactDescriptorMetadata.Type;

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
  jurisdiction: Schema.optional(Schema.Literal("AU")),
  taxYear: Schema.optional(Schema.Literal("2025-26")),
});

export type PublicCalculationRequest = typeof PublicCalculationRequest.Type;

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

export const PublicCalculationResponse = Schema.Struct({
  calculator: CalculatorCatalogItem,
  diagnostics: CalculationDiagnostics,
  report: PublicCalculationReport,
});

export type PublicCalculationResponse = typeof PublicCalculationResponse.Type;

export class CalculatorCatalogResponseData extends Data.Class<CalculatorCatalogResponse> {}

export class PublicCalculationResponseData extends Data.Class<PublicCalculationResponse> {}
