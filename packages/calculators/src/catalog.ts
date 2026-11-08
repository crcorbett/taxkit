import type {
  CalculatorDefinition,
  AnyFactDescriptor,
  AnyRuleDescriptor,
} from "@taxkit/core";
import type { AnnualTaxScenarioInputSchema } from "@taxkit/rules-au-income-tax";
import {
  AuAnnualIncomeTaxCalculation,
  AnnualTaxLedgerDescriptor,
} from "@taxkit/rules-au-income-tax";
import type { TakeHomeScenarioInputSchema } from "@taxkit/rules-au-pay";
import {
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
  NetPayDescriptor,
  PayWithholdingsLedgerDescriptor,
  PaygWithholdingComponentDescriptor,
  TaxablePayDescriptor,
} from "@taxkit/rules-au-pay";
import {
  Function as EffectFunction,
  Array,
  Data,
  HashSet,
  Option,
  Schema,
} from "effect";

import type {
  CalculatorContext,
  CalculatorJurisdiction,
  CalculatorTaxYear,
  CalculatorId,
  CalculatorRunReport,
  HelpMode,
} from "./schemas.js";
import {
  CalculatorContextQuery,
  CalculatorId as CatalogCalculatorId,
  CalculatorContext as CatalogContext,
} from "./schemas.js";
import {
  AnnualTaxCalculatorSummary,
  PayWithholdingsCalculatorSummary,
  TakeHomeCalculatorSummary,
} from "./summaries.js";

type CalculatorInputSchema =
  | typeof AnnualTaxScenarioInputSchema
  | typeof TakeHomeScenarioInputSchema;
export interface CalculatorCatalogEntry {
  readonly calculatorId: CalculatorId;
  readonly context: CalculatorContext;
  readonly description: string;
  readonly inputFacts: readonly AnyFactDescriptor[];
  readonly inputSchema: CalculatorInputSchema;
  readonly outputFacts: readonly AnyFactDescriptor[];
  readonly reportSchema: Schema.Top;
  readonly reportSchemaName: string;
  readonly ruleDescriptors: readonly AnyRuleDescriptor[];
  readonly supportedHelpModes: readonly HelpMode[];
  readonly title: string;
}
class CalculatorCatalogEntryData extends Data.Class<CalculatorCatalogEntry> {}
/**
 * Metadata can register an owning definition, never replace its contract.
 * Exported only for the compile-only catalogue type tests.
 *
 * @internal
 */
export const defineCalculatorCatalogEntry = <
  Input extends CalculatorInputSchema,
  Output extends Schema.Decoder<CalculatorRunReport>,
>({
  definition,
  ...metadata
}: Omit<
  CalculatorCatalogEntry,
  | "calculatorId"
  | "context"
  | "inputSchema"
  | "reportSchema"
  | "inputFacts"
  | "ruleDescriptors"
> & {
  readonly definition: CalculatorDefinition<Input, Output> & {
    readonly calculatorId: CalculatorId;
    readonly jurisdiction: CalculatorJurisdiction;
    readonly taxYear: CalculatorTaxYear;
  };
}): CalculatorCatalogEntry =>
  new CalculatorCatalogEntryData({
    ...metadata,
    calculatorId: definition.calculatorId,
    context: {
      jurisdiction: definition.jurisdiction,
      taxYear: definition.taxYear,
    },
    inputSchema: definition.inputSchema,
    reportSchema: definition.outputSchema,
    inputFacts: definition.inputFacts,
    ruleDescriptors: definition.ruleDescriptors,
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
    definition: AuPayTakeHomeCalculation,
    title: TakeHomeCalculatorSummary.title,
    description:
      "Australian pay-period take-home pay after PAYG-only withholdings.",
    outputFacts: [
      NetPayDescriptor,
      TaxablePayDescriptor,
      PayWithholdingsLedgerDescriptor,
      PaygWithholdingComponentDescriptor,
    ],
    reportSchemaName: "TakeHomePayReport",
    supportedHelpModes: SupportedHelpModes,
  }),
  defineCalculatorCatalogEntry({
    definition: AuPayWithholdingsCalculation,
    title: PayWithholdingsCalculatorSummary.title,
    description: "Australian PAYG-only pay-period withholding ledger.",
    outputFacts: [
      TaxablePayDescriptor,
      PaygWithholdingComponentDescriptor,
      PayWithholdingsLedgerDescriptor,
    ],
    reportSchemaName: "PayWithholdingsLedger",
    supportedHelpModes: SupportedHelpModes,
  }),
  defineCalculatorCatalogEntry({
    definition: AuAnnualIncomeTaxCalculation,
    title: AnnualTaxCalculatorSummary.title,
    description: "Australian annual income tax liability estimate.",
    outputFacts: [AnnualTaxLedgerDescriptor],
    reportSchemaName: "AnnualTaxReport",
    supportedHelpModes: SupportedHelpModes,
  }),
];
// Registration is trusted static construction; duplicates are a programming error.
const CatalogIdentitySchema = Schema.Struct({
  calculatorId: CatalogCalculatorId,
  ...CatalogContext.fields,
});
class CatalogIdentity extends Data.Class<typeof CatalogIdentitySchema.Type> {}
Schema.Array(CatalogIdentitySchema)
  .check(
    Schema.makeFilter(
      (identities) =>
        EffectFunction.pipe(
          identities,
          Array.map((identity) => new CatalogIdentity(identity)),
          HashSet.fromIterable,
          HashSet.size
        ) === identities.length,
      { expected: "unique calculator ID, jurisdiction and tax-year identities" }
    )
  )
  .make(
    EffectFunction.pipe(
      CatalogEntries,
      Array.map((entry) => ({
        calculatorId: entry.calculatorId,
        ...entry.context,
      }))
    )
  );
export const listCalculatorCatalogEntries =
  (): readonly CalculatorCatalogEntry[] => CatalogEntries;
export const getCalculatorCatalogEntry = (
  calculatorId: CalculatorId,
  context: CalculatorContextQuery = CalculatorContextQuery.make({})
): Option.Option<CalculatorCatalogEntry> => {
  const matches = EffectFunction.pipe(
    CatalogEntries,
    Array.filter(
      (entry) =>
        entry.calculatorId === calculatorId &&
        context.jurisdiction.pipe(
          Option.match({
            onNone: () => true,
            onSome: (value) => value === entry.context.jurisdiction,
          })
        ) &&
        context.taxYear.pipe(
          Option.match({
            onNone: () => true,
            onSome: (value) => value === entry.context.taxYear,
          })
        )
    )
  );
  if (matches.length !== 1) {
    return Option.none();
  }
  return Array.head(matches);
};
