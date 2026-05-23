import {
  CalculationDiagnostics,
  CalculationEngine,
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
import type {
  AnyFactDescriptor,
  AnyRuleDescriptor,
  CalculationResult,
} from "@whattax/core";
import {
  AnnualTaxScenarioLive,
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
  CalculatePayWithholdings,
  CalculateTakeHomePay,
  GrossPayDescriptor,
  NetPayDescriptor,
  PayWithholdingsLedger,
  PayWithholdingsLedgerDescriptor,
  PayWithholdingsLedgerRuleDescriptor,
  PaygWithholdingComponentDescriptor,
  PaygWithholdingRuleDescriptor,
  TakeHomePayReport,
  TakeHomeScenarioLive,
  TaxablePayDescriptor,
  TaxablePayRuleDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "@whattax/rules-au-pay";
import type { Layer, Option, Schema } from "effect";
import {
  Array,
  Data,
  Effect,
  HashMap,
  Layer as LayerApi,
  Schema as SchemaApi,
} from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";

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

export const SchemaDecodeHelp = SchemaApi.Struct({
  factId: FactId,
  question: SchemaApi.optional(FactQuestion),
  title: SchemaApi.String,
});

export type SchemaDecodeHelp = typeof SchemaDecodeHelp.Type;

export class PublicSchemaDecodeError extends SchemaApi.TaggedClass<PublicSchemaDecodeError>()(
  "PublicSchemaDecodeError",
  {
    calculatorId: SchemaApi.optional(CalculatorId),
    help: SchemaApi.optional(SchemaApi.Array(SchemaDecodeHelp)),
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
}).pipe(HttpApiSchema.status("BadRequest"));

export type PublicErrorEnvelope = typeof PublicErrorEnvelope.Type;

export class PublicErrorEnvelopeData extends Data.Class<PublicErrorEnvelope> {}

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

const Jurisdiction = SchemaApi.Struct({
  code: SchemaApi.Literal("AU"),
  title: SchemaApi.String,
});

type Jurisdiction = typeof Jurisdiction.Type;

const JurisdictionsResponse = SchemaApi.Struct({
  jurisdictions: SchemaApi.Array(Jurisdiction),
});

type JurisdictionsResponse = typeof JurisdictionsResponse.Type;

const TaxYear = SchemaApi.Struct({
  jurisdiction: SchemaApi.Literal("AU"),
  taxYear: SchemaApi.Literal("2025-26"),
});

type TaxYear = typeof TaxYear.Type;

const TaxYearsResponse = SchemaApi.Struct({
  taxYears: SchemaApi.Array(TaxYear),
});

type TaxYearsResponse = typeof TaxYearsResponse.Type;

export const MetadataQuery = SchemaApi.Struct({
  jurisdiction: SchemaApi.optional(SchemaApi.Literal("AU")),
  taxYear: SchemaApi.optional(SchemaApi.Literal("2025-26")),
});

export type MetadataQuery = typeof MetadataQuery.Type;

export const HelpQuery = SchemaApi.Struct({
  help: SchemaApi.optional(HelpMode),
  jurisdiction: SchemaApi.optional(SchemaApi.Literal("AU")),
  taxYear: SchemaApi.optional(SchemaApi.Literal("2025-26")),
});

export type HelpQuery = typeof HelpQuery.Type;

export const CalculationQuery = SchemaApi.Struct({
  help: SchemaApi.optional(HelpMode),
});

export type CalculationQuery = typeof CalculationQuery.Type;

export const DescriptorFilterQuery = SchemaApi.Struct({
  calculator: SchemaApi.optional(CalculatorId),
  jurisdiction: SchemaApi.optional(SchemaApi.Literal("AU")),
  taxYear: SchemaApi.optional(SchemaApi.Literal("2025-26")),
});

export type DescriptorFilterQuery = typeof DescriptorFilterQuery.Type;

const CalculatorParams = SchemaApi.Struct({
  calculatorId: CalculatorId,
});

type CalculatorParams = typeof CalculatorParams.Type;

export const ParameterDescriptorMetadata = SchemaApi.Struct({
  effectivePeriod: ParameterEffectivePeriod,
  id: ParameterId,
  source: SourceRef,
  title: SchemaApi.String,
});

export type ParameterDescriptorMetadata =
  typeof ParameterDescriptorMetadata.Type;

export const FactDescriptorMetadata = SchemaApi.Struct({
  authority: FactAuthority,
  id: FactId,
  question: SchemaApi.optional(FactQuestion),
  schemaTag: SchemaApi.String,
  title: SchemaApi.String,
});

export type FactDescriptorMetadata = typeof FactDescriptorMetadata.Type;

export const RuleDescriptorMetadata = SchemaApi.Struct({
  allowDuplicateProvides: SchemaApi.optional(SchemaApi.Boolean),
  id: RuleId,
  parameters: SchemaApi.Array(ParameterDescriptorMetadata),
  provides: SchemaApi.Array(FactId),
  requires: SchemaApi.Array(FactId),
  sourcePolicy: RuleSourcePolicy,
  sources: SchemaApi.Array(SourceRef),
  title: SchemaApi.String,
});

export type RuleDescriptorMetadata = typeof RuleDescriptorMetadata.Type;

export const FactsResponse = SchemaApi.Struct({
  facts: SchemaApi.Array(FactDescriptorMetadata),
});

export type FactsResponse = typeof FactsResponse.Type;

export const RulesResponse = SchemaApi.Struct({
  rules: SchemaApi.Array(RuleDescriptorMetadata),
});

export type RulesResponse = typeof RulesResponse.Type;

export const CalculatorSchemaResponse = SchemaApi.Struct({
  calculator: CalculatorCatalogItem,
  inputFacts: SchemaApi.Array(FactDescriptorMetadata),
  outputFacts: SchemaApi.Array(FactDescriptorMetadata),
  reportSchemaName: SchemaApi.String,
  rules: SchemaApi.Array(RuleDescriptorMetadata),
});

export type CalculatorSchemaResponse = typeof CalculatorSchemaResponse.Type;

export const RuleGraphEdge = SchemaApi.Struct({
  from: FactId,
  ruleId: RuleId,
  to: FactId,
});

export type RuleGraphEdge = typeof RuleGraphEdge.Type;

export const CalculatorGraphResponse = SchemaApi.Struct({
  calculator: CalculatorCatalogItem,
  edges: SchemaApi.Array(RuleGraphEdge),
  facts: SchemaApi.Array(FactDescriptorMetadata),
  rules: SchemaApi.Array(RuleDescriptorMetadata),
  validationIssues: SchemaApi.Array(GraphValidationIssue),
});

export type CalculatorGraphResponse = typeof CalculatorGraphResponse.Type;

export const PublicCalculationRequest = SchemaApi.Struct({
  facts: SchemaApi.Unknown,
  jurisdiction: SchemaApi.optional(SchemaApi.Literal("AU")),
  taxYear: SchemaApi.optional(SchemaApi.Literal("2025-26")),
});

export type PublicCalculationRequest = typeof PublicCalculationRequest.Type;

export const PublicCalculationReport = SchemaApi.Union([
  TakeHomePayReport,
  PayWithholdingsLedger,
  AnnualTaxReport,
]);

export type PublicCalculationReport = typeof PublicCalculationReport.Type;

export const PublicCalculationResponse = SchemaApi.Struct({
  calculator: CalculatorCatalogItem,
  diagnostics: CalculationDiagnostics,
  report: PublicCalculationReport,
});

export type PublicCalculationResponse = typeof PublicCalculationResponse.Type;

type CalculatorProgram = Effect.Effect<unknown, unknown, unknown>;

type CalculatorExecution = (
  facts: unknown,
  validationIssues: readonly GraphValidationIssue[]
) => Effect.Effect<
  CalculationResult<PublicCalculationReport>,
  unknown,
  CalculationEngine
>;

export interface CalculatorCatalogEntry {
  readonly calculate: CalculatorExecution;
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

export class CalculatorCatalogResponseData extends Data.Class<CalculatorCatalogResponse> {}

class JurisdictionData extends Data.Class<Jurisdiction> {}

class JurisdictionsResponseData extends Data.Class<JurisdictionsResponse> {}

class TaxYearData extends Data.Class<TaxYear> {}

class TaxYearsResponseData extends Data.Class<TaxYearsResponse> {}

class ParameterDescriptorMetadataData extends Data.Class<ParameterDescriptorMetadata> {}

class FactDescriptorMetadataData extends Data.Class<FactDescriptorMetadata> {}

class RuleDescriptorMetadataData extends Data.Class<RuleDescriptorMetadata> {}

class FactsResponseData extends Data.Class<FactsResponse> {}

class RulesResponseData extends Data.Class<RulesResponse> {}

class CalculatorSchemaResponseData extends Data.Class<CalculatorSchemaResponse> {}

class RuleGraphEdgeData extends Data.Class<RuleGraphEdge> {}

class CalculatorGraphResponseData extends Data.Class<CalculatorGraphResponse> {}

export class PublicCalculationResponseData extends Data.Class<PublicCalculationResponse> {}

const ContextAu2025_26 = new CalculatorContextData({
  jurisdiction: "AU",
  taxYear: "2025-26",
});

const SupportedHelpModes = HelpMode.literals;

const CatalogEntries: readonly CalculatorCatalogEntry[] = [
  new CalculatorCatalogEntryData({
    calculate: (facts, validationIssues) =>
      Effect.gen(function* () {
        const engine = yield* CalculationEngine;
        return yield* engine.run({
          calculation: CalculateTakeHomePay,
          layer: AuTakeHomePay2025_26_Live.pipe(
            LayerApi.provideMerge(TakeHomeScenarioLive(facts))
          ),
          validationIssues,
        });
      }),
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
    calculate: (facts, validationIssues) =>
      Effect.gen(function* () {
        const engine = yield* CalculationEngine;
        return yield* engine.run({
          calculation: CalculatePayWithholdings,
          layer: AuPayWithholdings2025_26_Live.pipe(
            LayerApi.provideMerge(TakeHomeScenarioLive(facts))
          ),
          validationIssues,
        });
      }),
    calculatorId: "au.pay.withholdings",
    context: ContextAu2025_26,
    description: "Australian PAYG-only pay-period withholding ledger.",
    inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
    outputFacts: [
      TaxablePayDescriptor,
      PaygWithholdingComponentDescriptor,
      PayWithholdingsLedgerDescriptor,
    ],
    program: CalculatePayWithholdings,
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
    calculate: (facts, validationIssues) =>
      Effect.gen(function* () {
        const engine = yield* CalculationEngine;
        return yield* engine.run({
          calculation: CalculateAnnualTax,
          layer: AuAnnualTax2025_26_Live.pipe(
            LayerApi.provideMerge(AnnualTaxScenarioLive(facts))
          ),
          validationIssues,
        });
      }),
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
];

export const CalculatorCatalog = HashMap.fromIterable(
  Array.map(
    CatalogEntries,
    (entry): readonly [CalculatorId, CalculatorCatalogEntry] => [
      entry.calculatorId,
      entry,
    ]
  )
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

export const JurisdictionsResponseValue = new JurisdictionsResponseData({
  jurisdictions: [
    new JurisdictionData({
      code: "AU",
      title: "Australia",
    }),
  ],
});

export const TaxYearsResponseValue = new TaxYearsResponseData({
  taxYears: [
    new TaxYearData({
      jurisdiction: "AU",
      taxYear: "2025-26",
    }),
  ],
});

const schemaTag = (schema: Schema.Top): string => schema.ast._tag;

const toFactDescriptorMetadata = (
  descriptor: AnyFactDescriptor
): FactDescriptorMetadata =>
  new FactDescriptorMetadataData({
    authority: descriptor.authority,
    id: descriptor.id,
    ...(descriptor.question === undefined
      ? {}
      : { question: descriptor.question }),
    schemaTag: schemaTag(descriptor.schema),
    title: descriptor.title,
  });

const toParameterDescriptorMetadata = (
  descriptor: NonNullable<AnyRuleDescriptor["parameters"]>[number]
): ParameterDescriptorMetadata =>
  new ParameterDescriptorMetadataData({
    effectivePeriod: descriptor.effectivePeriod,
    id: descriptor.id,
    source: descriptor.source,
    title: descriptor.title,
  });

const toRuleDescriptorMetadata = (
  descriptor: AnyRuleDescriptor
): RuleDescriptorMetadata =>
  new RuleDescriptorMetadataData({
    ...(descriptor.allowDuplicateProvides === undefined
      ? {}
      : { allowDuplicateProvides: descriptor.allowDuplicateProvides }),
    id: descriptor.id,
    parameters: Array.map(
      descriptor.parameters ?? Array.empty(),
      toParameterDescriptorMetadata
    ),
    provides: Array.map(descriptor.provides, (fact) => fact.id),
    requires: Array.map(descriptor.requires, (fact) => fact.id),
    sourcePolicy: descriptor.sourcePolicy,
    sources: descriptor.sources,
    title: descriptor.title,
  });

const collectFacts = (
  entries: readonly CalculatorCatalogEntry[]
): readonly AnyFactDescriptor[] =>
  Array.fromIterable(
    HashMap.values(
      Array.reduce(
        entries,
        HashMap.empty<FactId, AnyFactDescriptor>(),
        (facts, entry) =>
          Array.reduce(
            Array.appendAll(entry.inputFacts, entry.outputFacts),
            facts,
            (updatedFacts, fact) => HashMap.set(updatedFacts, fact.id, fact)
          )
      )
    )
  );

const collectRules = (
  entries: readonly CalculatorCatalogEntry[]
): readonly AnyRuleDescriptor[] =>
  Array.fromIterable(
    HashMap.values(
      Array.reduce(
        entries,
        HashMap.empty<RuleId, AnyRuleDescriptor>(),
        (rules, entry) =>
          Array.reduce(entry.ruleDescriptors, rules, (updatedRules, rule) =>
            HashMap.set(updatedRules, rule.id, rule)
          )
      )
    )
  );

export const toFactsResponse = (
  entries: readonly CalculatorCatalogEntry[]
): FactsResponse =>
  new FactsResponseData({
    facts: Array.map(collectFacts(entries), toFactDescriptorMetadata),
  });

export const toRulesResponse = (
  entries: readonly CalculatorCatalogEntry[]
): RulesResponse =>
  new RulesResponseData({
    rules: Array.map(collectRules(entries), toRuleDescriptorMetadata),
  });

export const toCalculatorSchemaResponse = (
  entry: CalculatorCatalogEntry
): CalculatorSchemaResponse =>
  new CalculatorSchemaResponseData({
    calculator: toCalculatorCatalogItem(entry),
    inputFacts: Array.map(entry.inputFacts, toFactDescriptorMetadata),
    outputFacts: Array.map(entry.outputFacts, toFactDescriptorMetadata),
    reportSchemaName: entry.reportSchemaName,
    rules: Array.map(entry.ruleDescriptors, toRuleDescriptorMetadata),
  });

const toRuleGraphEdges = (
  rules: readonly AnyRuleDescriptor[]
): readonly RuleGraphEdge[] =>
  Array.flatMap(rules, (rule) =>
    Array.flatMap(rule.requires, (required) =>
      Array.map(
        rule.provides,
        (provided) =>
          new RuleGraphEdgeData({
            from: required.id,
            ruleId: rule.id,
            to: provided.id,
          })
      )
    )
  );

export const toCalculatorGraphResponse = (args: {
  readonly entry: CalculatorCatalogEntry;
  readonly validationIssues: readonly GraphValidationIssue[];
}): CalculatorGraphResponse =>
  new CalculatorGraphResponseData({
    calculator: toCalculatorCatalogItem(args.entry),
    edges: toRuleGraphEdges(args.entry.ruleDescriptors),
    facts: Array.map(collectFacts([args.entry]), toFactDescriptorMetadata),
    rules: Array.map(args.entry.ruleDescriptors, toRuleDescriptorMetadata),
    validationIssues: args.validationIssues,
  });

export const filterCalculatorEntries = (
  query: DescriptorFilterQuery | HelpQuery | MetadataQuery
): readonly CalculatorCatalogEntry[] =>
  Array.filter(listCalculatorCatalogEntries(), (entry) => {
    const calculatorMatches =
      !("calculator" in query) ||
      query.calculator === undefined ||
      query.calculator === entry.calculatorId;
    const jurisdictionMatches =
      query.jurisdiction === undefined ||
      query.jurisdiction === entry.context.jurisdiction;
    const taxYearMatches =
      query.taxYear === undefined || query.taxYear === entry.context.taxYear;

    return calculatorMatches && jurisdictionMatches && taxYearMatches;
  });

const GetJurisdictionsEndpoint = HttpApiEndpoint.get(
  "getJurisdictions",
  "/jurisdictions",
  {
    success: JurisdictionsResponse,
  }
).annotate(OpenApi.Description, "List supported public API jurisdictions.");

const GetTaxYearsEndpoint = HttpApiEndpoint.get("getTaxYears", "/tax-years", {
  query: MetadataQuery,
  success: TaxYearsResponse,
}).annotate(
  OpenApi.Description,
  "List supported tax years for a jurisdiction."
);

const ListCalculatorsEndpoint = HttpApiEndpoint.get(
  "listCalculators",
  "/calculators",
  {
    query: MetadataQuery,
    success: CalculatorCatalogResponse,
  }
).annotate(OpenApi.Description, "List public calculator catalog entries.");

const GetCalculatorEndpoint = HttpApiEndpoint.get(
  "getCalculator",
  "/calculators/:calculatorId",
  {
    error: PublicErrorEnvelope,
    params: CalculatorParams,
    query: HelpQuery,
    success: CalculatorCatalogItem,
  }
).annotate(OpenApi.Description, "Return one public calculator catalog entry.");

const GetCalculatorSchemaEndpoint = HttpApiEndpoint.get(
  "getCalculatorSchema",
  "/calculators/:calculatorId/schema",
  {
    error: PublicErrorEnvelope,
    params: CalculatorParams,
    query: HelpQuery,
    success: CalculatorSchemaResponse,
  }
).annotate(
  OpenApi.Description,
  "Return fact, rule and report schema metadata for one calculator."
);

const GetCalculatorGraphEndpoint = HttpApiEndpoint.get(
  "getCalculatorGraph",
  "/calculators/:calculatorId/graph",
  {
    error: PublicErrorEnvelope,
    params: CalculatorParams,
    query: MetadataQuery,
    success: CalculatorGraphResponse,
  }
).annotate(
  OpenApi.Description,
  "Return graph edges and canonical graph validation diagnostics for one calculator."
);

const CalculateEndpoint = HttpApiEndpoint.post(
  "calculate",
  "/calculators/:calculatorId/calculate",
  {
    error: PublicErrorEnvelope,
    params: CalculatorParams,
    payload: PublicCalculationRequest,
    query: CalculationQuery,
    success: PublicCalculationResponse,
  }
).annotate(
  OpenApi.Description,
  "Run one public calculator using canonical scenario decoding and rule-pack layers."
);

const ListFactsEndpoint = HttpApiEndpoint.get("listFacts", "/facts", {
  query: DescriptorFilterQuery,
  success: FactsResponse,
}).annotate(
  OpenApi.Description,
  "List canonical fact descriptors, optionally filtered by calculator context."
);

const ListRulesEndpoint = HttpApiEndpoint.get("listRules", "/rules", {
  query: DescriptorFilterQuery,
  success: RulesResponse,
}).annotate(
  OpenApi.Description,
  "List canonical rule descriptors, optionally filtered by calculator context."
);

export class PublicCalculationMetadataGroup extends HttpApiGroup.make(
  "publicCalculationMetadata"
)
  .add(GetJurisdictionsEndpoint)
  .add(GetTaxYearsEndpoint)
  .add(ListCalculatorsEndpoint)
  .add(GetCalculatorEndpoint)
  .add(GetCalculatorSchemaEndpoint)
  .add(GetCalculatorGraphEndpoint)
  .add(CalculateEndpoint)
  .add(ListFactsEndpoint)
  .add(ListRulesEndpoint)
  .prefix("/api/v1")
  .annotate(OpenApi.Title, "Public calculation metadata") {}
