import { CalculationEngine } from "@whattax/core";
import type {
  AnyFactDescriptor,
  AnyRuleDescriptor,
  CalculationResult,
  GraphValidationIssue,
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
import type { Option, Schema } from "effect";
import { Array, Data, Effect, HashMap, Layer } from "effect";

import type {
  CalculatorContext,
  CalculatorId,
  HelpMode,
  PublicCalculationReport,
} from "./schemas.js";

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

const ContextAu2025_26 = new CalculatorContextData({
  jurisdiction: "AU",
  taxYear: "2025-26",
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
  new CalculatorCatalogEntryData({
    calculate: (facts, validationIssues) =>
      Effect.gen(function* () {
        const engine = yield* CalculationEngine;
        return yield* engine.run({
          calculation: CalculateTakeHomePay,
          layer: AuTakeHomePay2025_26_Live.pipe(
            Layer.provideMerge(TakeHomeScenarioLive(facts))
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
            Layer.provideMerge(TakeHomeScenarioLive(facts))
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
            Layer.provideMerge(AnnualTaxScenarioLive(facts))
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
