import { CalculationEngine } from "@taxkit/core";
import type {
  AnyFactDescriptor,
  CalculationError,
  AnyRuleDescriptor,
  CalculationResult,
  GraphValidationIssue,
} from "@taxkit/core";
import {
  AnnualTaxLedgerDescriptor,
  AnnualTaxReport,
  AnnualTaxScenarioInputSchema,
  AnnualTaxScenario,
  AnnualTaxScenarioLive,
  AnnualTaxableIncomeDescriptor,
  AuAnnualTax2025_26_Live,
  AuAnnualTaxRuleDescriptors,
  CalculateAnnualTax,
} from "@taxkit/rules-au-income-tax";
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
  TaxablePayDescriptor,
  TaxablePayRuleDescriptor,
  TaxFreeThresholdClaimedDescriptor,
  TakeHomeScenarioInputSchema,
  TakeHomeScenario,
  TakeHomeScenarioLive,
} from "@taxkit/rules-au-pay";
import type { Option } from "effect";
import { Array, Data, Effect, HashMap, Layer, Schema } from "effect";

import type {
  CalculatorContext,
  CalculatorId,
  CalculatorRunReport,
  HelpMode,
} from "./schemas.js";
import {
  AnnualTaxCalculatorSummary,
  PayWithholdingsCalculatorSummary,
  TakeHomeCalculatorSummary,
} from "./summaries.js";

type UntrustedCalculatorFacts = typeof Schema.Unknown.Type;

type CalculatorExecution = (
  facts: UntrustedCalculatorFacts,
  validationIssues: readonly GraphValidationIssue[]
) => Effect.Effect<
  CalculationResult<CalculatorRunReport>,
  CalculationError | Schema.SchemaError,
  CalculationEngine
>;

type CalculatorInputSchema =
  | typeof AnnualTaxScenarioInputSchema
  | typeof TakeHomeScenarioInputSchema;

type TypedCalculatorExecution<InputSchema extends CalculatorInputSchema> = (
  facts: InputSchema["Type"],
  validationIssues: readonly GraphValidationIssue[]
) => Effect.Effect<
  CalculationResult<CalculatorRunReport>,
  CalculationError,
  CalculationEngine
>;

export interface CalculatorCatalogEntry {
  readonly calculate: CalculatorExecution;
  readonly calculatorId: CalculatorId;
  readonly context: CalculatorContext;
  readonly description: string;
  readonly inputFacts: readonly AnyFactDescriptor[];
  readonly inputSchema: CalculatorInputSchema;
  readonly outputFacts: readonly AnyFactDescriptor[];
  readonly reportSchema: Schema.Top;
  readonly reportSchemaName: string;
  readonly ruleDescriptors: readonly AnyRuleDescriptor[];
  readonly rulePackLayer: Layer.Any;
  readonly supportedHelpModes: readonly HelpMode[];
  readonly title: string;
}

class CalculatorCatalogEntryData extends Data.Class<CalculatorCatalogEntry> {}

export interface CalculatorCatalogEntryDefinition<
  InputSchema extends CalculatorInputSchema,
> extends Omit<CalculatorCatalogEntry, "calculate" | "inputSchema"> {
  readonly calculate: TypedCalculatorExecution<InputSchema>;
  readonly inputSchema: InputSchema;
}

/**
 * Couples a selected input schema with its typed calculator continuation
 * before heterogeneous catalogue storage erases the concrete input type.
 */
export const defineCalculatorCatalogEntry = <
  InputSchema extends CalculatorInputSchema,
>(
  definition: CalculatorCatalogEntryDefinition<InputSchema>
): CalculatorCatalogEntry =>
  new CalculatorCatalogEntryData({
    ...definition,
    calculate: (input, validationIssues) =>
      Schema.decodeUnknownEffect(definition.inputSchema)(input).pipe(
        Effect.flatMap((facts) => definition.calculate(facts, validationIssues))
      ),
  });

const SupportedHelpModes: readonly HelpMode[] = [
  "none",
  "errors",
  "schema",
  "examples",
  "sources",
  "full",
];

const CatalogEntries: readonly CalculatorCatalogEntry[] = [
  defineCalculatorCatalogEntry({
    calculate: (facts, validationIssues) =>
      Effect.gen(function* () {
        const engine = yield* CalculationEngine;
        return yield* engine.run({
          calculation: CalculateTakeHomePay,
          layer: AuTakeHomePay2025_26_Live.pipe(
            Layer.provideMerge(TakeHomeScenarioLive),
            Layer.provide(Layer.succeed(TakeHomeScenario)(facts))
          ),
          validationIssues,
        });
      }),
    ...TakeHomeCalculatorSummary,
    description:
      "Australian pay-period take-home pay after PAYG-only withholdings.",
    inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
    inputSchema: TakeHomeScenarioInputSchema,
    outputFacts: [
      NetPayDescriptor,
      TaxablePayDescriptor,
      PayWithholdingsLedgerDescriptor,
      PaygWithholdingComponentDescriptor,
    ],
    reportSchema: TakeHomePayReport,
    reportSchemaName: "TakeHomePayReport",
    ruleDescriptors: AuTakeHomePayRuleDescriptors,
    rulePackLayer: AuTakeHomePay2025_26_Live,
    supportedHelpModes: SupportedHelpModes,
  }),
  defineCalculatorCatalogEntry({
    calculate: (facts, validationIssues) =>
      Effect.gen(function* () {
        const engine = yield* CalculationEngine;
        return yield* engine.run({
          calculation: CalculatePayWithholdings,
          layer: AuPayWithholdings2025_26_Live.pipe(
            Layer.provideMerge(TakeHomeScenarioLive),
            Layer.provide(Layer.succeed(TakeHomeScenario)(facts))
          ),
          validationIssues,
        });
      }),
    ...PayWithholdingsCalculatorSummary,
    description: "Australian PAYG-only pay-period withholding ledger.",
    inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
    inputSchema: TakeHomeScenarioInputSchema,
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
  }),
  defineCalculatorCatalogEntry({
    calculate: (facts, validationIssues) =>
      Effect.gen(function* () {
        const engine = yield* CalculationEngine;
        return yield* engine.run({
          calculation: CalculateAnnualTax,
          layer: AuAnnualTax2025_26_Live.pipe(
            Layer.provideMerge(AnnualTaxScenarioLive),
            Layer.provide(Layer.succeed(AnnualTaxScenario)(facts))
          ),
          validationIssues,
        });
      }),
    ...AnnualTaxCalculatorSummary,
    description: "Australian annual income tax liability estimate.",
    inputFacts: [AnnualTaxableIncomeDescriptor],
    inputSchema: AnnualTaxScenarioInputSchema,
    outputFacts: [AnnualTaxLedgerDescriptor],
    reportSchema: AnnualTaxReport,
    reportSchemaName: "AnnualTaxReport",
    ruleDescriptors: AuAnnualTaxRuleDescriptors,
    rulePackLayer: AuAnnualTax2025_26_Live,
    supportedHelpModes: SupportedHelpModes,
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
