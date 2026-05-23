import { FactId, RuleId } from "@whattax/core";
import type { AnyFactDescriptor, AnyRuleDescriptor } from "@whattax/core";
import {
  AnnualTaxLedgerDescriptor,
  AnnualTaxReport,
  AnnualTaxableIncomeDescriptor,
  AuAnnualTax2025_26_Live,
  AuAnnualTaxRuleDescriptors,
  CalculateAnnualTax,
} from "@whattax/rules-au-income-tax";
import {
  AuPayWithholdings2025_26_Live,
  AuTakeHomePay2025_26_Live,
  AuTakeHomePayRuleDescriptors,
  CalculateTakeHomePay,
  GrossPayDescriptor,
  NetPayDescriptor,
  PayWithholdingsLedger,
  PayWithholdingsLedgerDescriptor,
  PayWithholdingsLedgerRuleDescriptor,
  PaygWithholdingComponentDescriptor,
  PaygWithholdingRuleDescriptor,
  TakeHomePayReport,
  TaxablePayDescriptor,
  TaxablePayRuleDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "@whattax/rules-au-pay";
import type { Effect, Layer, Option, Schema } from "effect";
import { Array, Data, HashMap, Schema as SchemaApi } from "effect";

export const CalculatorId = SchemaApi.Literals([
  "au.pay.take-home",
  "au.pay.withholdings",
  "au.income-tax.annual",
]);

export type CalculatorId = typeof CalculatorId.Type;

export const CalculatorContext = SchemaApi.Struct({
  jurisdiction: SchemaApi.Literal("AU"),
  taxYear: SchemaApi.Literal("2025-26"),
});

export type CalculatorContext = typeof CalculatorContext.Type;

export const HelpMode = SchemaApi.Literals([
  "none",
  "errors",
  "schema",
  "examples",
  "sources",
  "full",
]);

export type HelpMode = typeof HelpMode.Type;

export class SchemaDecodeIssue extends SchemaApi.TaggedClass<SchemaDecodeIssue>()(
  "SchemaDecodeIssue",
  {
    message: SchemaApi.String,
    path: SchemaApi.Array(SchemaApi.String),
  }
) {}

export class PublicSchemaDecodeError extends SchemaApi.TaggedClass<PublicSchemaDecodeError>()(
  "PublicSchemaDecodeError",
  {
    issues: SchemaApi.Array(SchemaDecodeIssue),
    message: SchemaApi.String,
  }
) {}

export class UnsupportedCalculatorError extends SchemaApi.TaggedClass<UnsupportedCalculatorError>()(
  "UnsupportedCalculatorError",
  {
    message: SchemaApi.String,
    requestedCalculator: SchemaApi.String,
  }
) {}

export class UnsupportedCalculatorContextError extends SchemaApi.TaggedClass<UnsupportedCalculatorContextError>()(
  "UnsupportedCalculatorContextError",
  {
    context: SchemaApi.Struct({
      jurisdiction: SchemaApi.String,
      taxYear: SchemaApi.String,
    }),
    message: SchemaApi.String,
    requestedCalculator: CalculatorId,
  }
) {}

export const PublicApiError = SchemaApi.Union([
  PublicSchemaDecodeError,
  UnsupportedCalculatorError,
  UnsupportedCalculatorContextError,
]);

export type PublicApiError = typeof PublicApiError.Type;

export const PublicErrorEnvelope = SchemaApi.Struct({
  error: PublicApiError,
});

export type PublicErrorEnvelope = typeof PublicErrorEnvelope.Type;

export const CalculatorCatalogItem = SchemaApi.Struct({
  calculatorId: CalculatorId,
  context: CalculatorContext,
  description: SchemaApi.String,
  inputFactIds: SchemaApi.Array(FactId),
  outputFactIds: SchemaApi.Array(FactId),
  reportSchemaName: SchemaApi.String,
  ruleIds: SchemaApi.Array(RuleId),
  supportedHelpModes: SchemaApi.Array(HelpMode),
  title: SchemaApi.String,
});

export type CalculatorCatalogItem = typeof CalculatorCatalogItem.Type;

export const CalculatorCatalogResponse = SchemaApi.Struct({
  calculators: SchemaApi.Array(CalculatorCatalogItem),
});

export type CalculatorCatalogResponse = typeof CalculatorCatalogResponse.Type;

type CalculatorProgram = Effect.Effect<unknown, unknown, unknown>;

export interface CalculatorCatalogEntry {
  readonly calculatorId: CalculatorId;
  readonly context: CalculatorContext;
  readonly description: string;
  readonly inputFacts: readonly AnyFactDescriptor[];
  readonly outputFacts: readonly AnyFactDescriptor[];
  readonly reportSchema: Schema.Top;
  readonly reportSchemaName: string;
  readonly ruleDescriptors: readonly AnyRuleDescriptor[];
  readonly rulePackLayer: Layer.Any;
  readonly supportedHelpModes: readonly HelpMode[];
  readonly title: string;
  readonly program?: CalculatorProgram;
}

class CalculatorContextData extends Data.Class<CalculatorContext> {}

class CalculatorCatalogEntryData extends Data.Class<CalculatorCatalogEntry> {}

class CalculatorCatalogItemData extends Data.Class<CalculatorCatalogItem> {}

class CalculatorCatalogResponseData extends Data.Class<CalculatorCatalogResponse> {}

const ContextAu2025_26 = new CalculatorContextData({
  jurisdiction: "AU",
  taxYear: "2025-26",
});

const SupportedHelpModes = HelpMode.literals;

const CatalogEntries = [
  new CalculatorCatalogEntryData({
    calculatorId: "au.pay.take-home",
    context: ContextAu2025_26,
    description:
      "Australian pay-period take-home pay after PAYG-only withholdings.",
    inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
    outputFacts: [
      NetPayDescriptor,
      TaxablePayDescriptor,
      PayWithholdingsLedgerDescriptor,
      PaygWithholdingComponentDescriptor,
    ],
    program: CalculateTakeHomePay,
    reportSchema: TakeHomePayReport,
    reportSchemaName: "TakeHomePayReport",
    ruleDescriptors: AuTakeHomePayRuleDescriptors,
    rulePackLayer: AuTakeHomePay2025_26_Live,
    supportedHelpModes: SupportedHelpModes,
    title: "AU take-home pay",
  }),
  new CalculatorCatalogEntryData({
    calculatorId: "au.pay.withholdings",
    context: ContextAu2025_26,
    description: "Australian PAYG-only pay-period withholding ledger.",
    inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
    outputFacts: [
      TaxablePayDescriptor,
      PaygWithholdingComponentDescriptor,
      PayWithholdingsLedgerDescriptor,
    ],
    reportSchema: PayWithholdingsLedger,
    reportSchemaName: "PayWithholdingsLedger",
    ruleDescriptors: [
      TaxablePayRuleDescriptor,
      PaygWithholdingRuleDescriptor,
      PayWithholdingsLedgerRuleDescriptor,
    ],
    rulePackLayer: AuPayWithholdings2025_26_Live,
    supportedHelpModes: SupportedHelpModes,
    title: "AU pay withholdings",
  }),
  new CalculatorCatalogEntryData({
    calculatorId: "au.income-tax.annual",
    context: ContextAu2025_26,
    description: "Australian annual income tax liability estimate.",
    inputFacts: [AnnualTaxableIncomeDescriptor],
    outputFacts: [AnnualTaxLedgerDescriptor],
    program: CalculateAnnualTax,
    reportSchema: AnnualTaxReport,
    reportSchemaName: "AnnualTaxReport",
    ruleDescriptors: AuAnnualTaxRuleDescriptors,
    rulePackLayer: AuAnnualTax2025_26_Live,
    supportedHelpModes: SupportedHelpModes,
    title: "AU annual income tax",
  }),
] as const;

export const CalculatorCatalog = HashMap.fromIterable(
  Array.map(CatalogEntries, (entry) => [entry.calculatorId, entry] as const)
);

export const listCalculatorCatalogEntries =
  (): readonly CalculatorCatalogEntry[] =>
    Array.fromIterable(HashMap.values(CalculatorCatalog));

export const getCalculatorCatalogEntry = (
  calculatorId: CalculatorId
): Option.Option<CalculatorCatalogEntry> =>
  HashMap.get(CalculatorCatalog, calculatorId);

export const toCalculatorCatalogItem = (
  entry: CalculatorCatalogEntry
): CalculatorCatalogItem =>
  new CalculatorCatalogItemData({
    calculatorId: entry.calculatorId,
    context: entry.context,
    description: entry.description,
    inputFactIds: Array.map(entry.inputFacts, (fact) => fact.id),
    outputFactIds: Array.map(entry.outputFacts, (fact) => fact.id),
    reportSchemaName: entry.reportSchemaName,
    ruleIds: Array.map(entry.ruleDescriptors, (rule) => rule.id),
    supportedHelpModes: entry.supportedHelpModes,
    title: entry.title,
  });

export const CalculatorCatalogItems = Array.map(
  listCalculatorCatalogEntries(),
  toCalculatorCatalogItem
);

export const CalculatorCatalogResponseValue = new CalculatorCatalogResponseData(
  {
    calculators: CalculatorCatalogItems,
  }
);
