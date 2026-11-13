import { CalculationDiagnostics } from "@taxkit/core/engine/schemas";
import { InputValidationError, CalculationError } from "@taxkit/core/errors";
import { FactAuthority, FactId, FactQuestion } from "@taxkit/core/facts";
import { GraphValidationIssue } from "@taxkit/core/graph";
import { ParameterEffectivePeriod, ParameterId } from "@taxkit/core/parameters";
import { RuleSourcePolicy } from "@taxkit/core/rules";
import { RuleId, SourceRef } from "@taxkit/core/trace";
import {
  AuAnnualTaxContract,
  AnnualTaxReport,
  AuAnnualTaxCalculatorId,
  AuAnnualTaxJurisdiction,
  AuAnnualTaxYear,
} from "@taxkit/rules-au-income-tax/schemas";
import {
  AuPayTakeHomeContract,
  AuPayWithholdingsContract,
  AuPayTakeHomeId,
  AuPayWithholdingsId,
  AuPayCalculatorId,
  AuPayJurisdiction,
  AuPayTaxYear,
  PayWithholdingsLedger,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import { Data, Effect, Schema } from "effect";
/**
 * Public calculator ids supported by this package.
 *
 * The literals are owned by the rule packages. This package only composes them
 * into the public calculator API surface so it cannot drift from rule-owned
 * calculator metadata.
 */
export const CalculatorId = Schema.Union([
  Schema.toEncoded(AuPayCalculatorId),
  Schema.toEncoded(AuAnnualTaxCalculatorId),
]).pipe(Schema.brand("taxkit/CalculatorId"));
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
  jurisdiction: Schema.OptionFromOptional(CalculatorJurisdiction).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
  taxYear: Schema.OptionFromOptional(CalculatorTaxYear).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
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
 * One Option represents absent context; constructors never invent a value.
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
 * Public error for a supported request shape that names no catalog entry.
 */
export class UnsupportedCalculatorError extends Schema.TaggedClass<
  UnsupportedCalculatorError,
  {
    readonly brand: unique symbol;
  }
>()("UnsupportedCalculatorError", {
  message: Schema.String,
  requestedCalculator: Schema.String,
}) {}
/**
 * Public error for calculator/context combinations that are not in the catalog.
 */
export class UnsupportedCalculatorContextError extends Schema.TaggedClass<
  UnsupportedCalculatorContextError,
  {
    readonly brand: unique symbol;
  }
>()("UnsupportedCalculatorContextError", {
  context: CalculatorContextQuery,
  message: Schema.String,
  requestedCalculator: CalculatorId,
}) {}
export class CalculatorCapacityExceeded extends Schema.TaggedError<
  CalculatorCapacityExceeded,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorCapacityExceeded", {
  code: Schema.tag("calculation-capacity"),
  message: Schema.tag(
    "The calculators are busy. Try again when you are ready."
  ),
  retry: Schema.tag("try-again-manually"),
}) {}
export class CalculatorOperationTimedOut extends Schema.TaggedError<
  CalculatorOperationTimedOut,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorOperationTimedOut", {
  code: Schema.tag("calculation-timeout"),
  message: Schema.tag(
    "The calculation could not finish within five seconds. Try again when you are ready."
  ),
  retry: Schema.tag("try-again-manually"),
}) {}
export class CalculatorRateLimited extends Schema.TaggedError<
  CalculatorRateLimited,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorRateLimited", {
  code: Schema.tag("rate-limited"),
  message: Schema.tag(
    "Too many calculations were sent. Wait a minute before trying again."
  ),
  retry: Schema.tag("wait-then-try-manually"),
}) {}
export class CalculatorAdmissionUnavailable extends Schema.TaggedError<
  CalculatorAdmissionUnavailable,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorAdmissionUnavailable", {
  code: Schema.tag("calculation-admission-unavailable"),
  message: Schema.tag(
    "The calculation could not be started. Try again when you are ready."
  ),
  retry: Schema.tag("try-again-manually"),
}) {}
export const CalculatorRequestError = Schema.Union([
  InputValidationError,
  CalculationError,
  UnsupportedCalculatorError,
  UnsupportedCalculatorContextError,
]);
export type CalculatorRequestError = typeof CalculatorRequestError.Type;
/** Metadata lookups fail only for a calculator/context outside the catalogue. */
export const CalculatorMetadataError = Schema.Union([
  UnsupportedCalculatorContextError,
]);
export type CalculatorMetadataError = typeof CalculatorMetadataError.Type;
export const CalculatorServiceError = Schema.Union([
  CalculatorRequestError,
  CalculatorRateLimited,
  CalculatorAdmissionUnavailable,
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
]);
export type CalculatorServiceError = typeof CalculatorServiceError.Type;
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
/** Publication metadata shared by the API catalogue and browser navigation. */
export const CalculatorSummary = Schema.Struct({
  calculatorId: CalculatorCatalogItem.fields.calculatorId,
  context: CalculatorCatalogItem.fields.context,
  title: CalculatorCatalogItem.fields.title,
});
export type CalculatorSummary = typeof CalculatorSummary.Type;
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
  help: Schema.OptionFromOptional(HelpMode).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
  ...OptionalCalculatorContextFields,
});
export type HelpQuery = typeof HelpQuery.Type;
export const GetCalculatorRequest = Schema.Struct({
  calculatorId: CalculatorId,
  help: Schema.OptionFromOptional(HelpMode).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
  ...OptionalCalculatorContextFields,
});
export type GetCalculatorRequest = typeof GetCalculatorRequest.Type;
export const GetCalculatorGraphRequest = Schema.Struct({
  calculatorId: CalculatorId,
  ...OptionalCalculatorContextFields,
});
export type GetCalculatorGraphRequest = typeof GetCalculatorGraphRequest.Type;
export const DescriptorFilterQuery = Schema.Struct({
  calculator: Schema.OptionFromOptional(CalculatorId).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
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
  question: Schema.OptionFromOptional(FactQuestion).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
  schemaTag: Schema.String,
  title: Schema.String,
});
export type FactDescriptorMetadata = typeof FactDescriptorMetadata.Type;
/**
 * Public metadata for one rule descriptor and its dependency edges.
 */
export const RuleDescriptorMetadata = Schema.Struct({
  allowDuplicateProvides: Schema.OptionFromOptional(Schema.Boolean).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
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
/** A transport variant selects exactly one owning scenario codec. */
export const TakeHomeCalculationRequest = Schema.Struct({
  calculatorId: Schema.toEncoded(AuPayTakeHomeId),
  payload: Schema.Struct({
    facts: AuPayTakeHomeContract.inputSchema,
    ...OptionalCalculatorContextFields,
  }),
});
export const WithholdingsCalculationRequest = Schema.Struct({
  calculatorId: Schema.toEncoded(AuPayWithholdingsId),
  payload: Schema.Struct({
    facts: AuPayWithholdingsContract.inputSchema,
    ...OptionalCalculatorContextFields,
  }),
});
export const AnnualTaxCalculationRequest = Schema.Struct({
  calculatorId: Schema.toEncoded(AuAnnualTaxCalculatorId),
  payload: Schema.Struct({
    facts: AuAnnualTaxContract.inputSchema,
    ...OptionalCalculatorContextFields,
  }),
});
export const CalculatorRunRequest = Schema.Union([
  TakeHomeCalculationRequest,
  WithholdingsCalculationRequest,
  AnnualTaxCalculationRequest,
]).pipe(Schema.toTaggedUnion("calculatorId"));
export type CalculatorRunRequest = typeof CalculatorRunRequest.Type;
export const CalculatorRunReport = Schema.Union([
  TakeHomePayReport,
  PayWithholdingsLedger,
  AnnualTaxReport,
]);
export type CalculatorRunReport = typeof CalculatorRunReport.Type;
/**
 * Calculator run response with catalog metadata, diagnostics and the typed
 * calculator-specific report.
 */
export const CalculatorRunResponse = Schema.Union([
  Schema.Struct({
    calculatorId: Schema.toEncoded(AuPayTakeHomeId),
    calculator: Schema.Struct({
      ...CalculatorCatalogItem.fields,
      calculatorId: AuPayTakeHomeId,
    }),
    diagnostics: CalculationDiagnostics,
    report: AuPayTakeHomeContract.outputSchema,
  }),
  Schema.Struct({
    calculatorId: Schema.toEncoded(AuPayWithholdingsId),
    calculator: Schema.Struct({
      ...CalculatorCatalogItem.fields,
      calculatorId: AuPayWithholdingsId,
    }),
    diagnostics: CalculationDiagnostics,
    report: AuPayWithholdingsContract.outputSchema,
  }),
  Schema.Struct({
    calculatorId: Schema.toEncoded(AuAnnualTaxCalculatorId),
    calculator: Schema.Struct({
      ...CalculatorCatalogItem.fields,
      calculatorId: AuAnnualTaxCalculatorId,
    }),
    diagnostics: CalculationDiagnostics,
    report: AuAnnualTaxContract.outputSchema,
  }),
]).pipe(Schema.toTaggedUnion("calculatorId"));
export type CalculatorRunResponse = typeof CalculatorRunResponse.Type;
export class CalculatorCatalogResponseData extends Data.Class<CalculatorCatalogResponse> {}
