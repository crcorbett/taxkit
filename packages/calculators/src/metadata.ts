import type {
  AnyFactDescriptor,
  AnyRuleDescriptor,
  FactId,
  RuleId,
} from "@taxkit/core";
import { AuPayJurisdiction, AuPayTaxYear } from "@taxkit/rules-au-pay";
import {
  Function as EffectFunction,
  Array,
  Data,
  HashMap,
  Option,
  Match,
} from "effect";
import type { Schema } from "effect";

import type { CalculatorCatalogEntry } from "./catalog.js";
import { listCalculatorCatalogEntries } from "./catalog.js";
import { CalculatorCatalogResponseData } from "./schemas.js";
import type {
  CalculatorCatalogItem,
  CalculatorGraphResponse,
  CalculatorSchemaResponse,
  DescriptorFilterQuery,
  FactDescriptorMetadata,
  FactsResponse,
  Jurisdiction,
  JurisdictionsResponse,
  ParameterDescriptorMetadata,
  RuleDescriptorMetadata,
  RuleGraphEdge,
  RulesResponse,
  TaxYear,
  TaxYearsResponse,
} from "./schemas.js";

class CalculatorCatalogItemData extends Data.Class<CalculatorCatalogItem> {}
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
export const toCalculatorCatalogItem = (
  entry: CalculatorCatalogEntry
): CalculatorCatalogItem =>
  new CalculatorCatalogItemData({
    calculatorId: entry.calculatorId,
    context: entry.context,
    description: entry.description,
    inputFactIds: EffectFunction.pipe(
      entry.inputFacts,
      Array.map((fact) => fact.id)
    ),
    outputFactIds: EffectFunction.pipe(
      entry.outputFacts,
      Array.map((fact) => fact.id)
    ),
    reportSchemaName: entry.reportSchemaName,
    ruleIds: EffectFunction.pipe(
      entry.ruleDescriptors,
      Array.map((rule) => rule.id)
    ),
    supportedHelpModes: entry.supportedHelpModes,
    title: entry.title,
  });
export const CalculatorCatalogItems = EffectFunction.pipe(
  listCalculatorCatalogEntries(),
  Array.map(toCalculatorCatalogItem)
);
export const CalculatorCatalogResponseValue = new CalculatorCatalogResponseData(
  {
    calculators: CalculatorCatalogItems,
  }
);
export const JurisdictionsResponseValue = new JurisdictionsResponseData({
  jurisdictions: [
    new JurisdictionData({
      code: AuPayJurisdiction.make("AU"),
      title: "Australia",
    }),
  ],
});
export const TaxYearsResponseValue = new TaxYearsResponseData({
  taxYears: [
    new TaxYearData({
      jurisdiction: AuPayJurisdiction.make("AU"),
      taxYear: AuPayTaxYear.make("2025-26"),
    }),
  ],
});
const schemaTag = (schema: Schema.Top): string =>
  Match.value(schema.ast).pipe(
    Match.tagsExhaustive({
      Declaration: () => "Declaration",
      Null: () => "Null",
      Undefined: () => "Undefined",
      Void: () => "Void",
      Never: () => "Never",
      Unknown: () => "Unknown",
      Any: () => "Any",
      String: () => "String",
      Number: () => "Number",
      Boolean: () => "Boolean",
      BigInt: () => "BigInt",
      Symbol: () => "Symbol",
      Literal: () => "Literal",
      UniqueSymbol: () => "UniqueSymbol",
      ObjectKeyword: () => "ObjectKeyword",
      Enum: () => "Enum",
      TemplateLiteral: () => "TemplateLiteral",
      Arrays: () => "Arrays",
      Objects: () => "Objects",
      Union: () => "Union",
      Suspend: () => "Suspend",
    })
  );
const toFactDescriptorMetadata = (
  descriptor: AnyFactDescriptor
): FactDescriptorMetadata =>
  new FactDescriptorMetadataData({
    authority: descriptor.authority,
    id: descriptor.id,
    question: EffectFunction.pipe(descriptor.question, Option.map(Option.some)),
    schemaTag: schemaTag(descriptor.schema),
    title: descriptor.title,
  });
const toParameterDescriptorMetadata = (
  descriptor: AnyRuleDescriptor["parameters"][number]
): ParameterDescriptorMetadata =>
  new ParameterDescriptorMetadataData({
    effectivePeriod: descriptor.effectivePeriod,
    id: descriptor.id,
    source: descriptor.source,
    title: descriptor.title,
  });
const toRuleDescriptorMetadata = (
  descriptor: AnyRuleDescriptor
): RuleDescriptorMetadata => {
  const parameters = EffectFunction.pipe(
    descriptor.parameters,
    Array.map(toParameterDescriptorMetadata)
  );
  return new RuleDescriptorMetadataData({
    allowDuplicateProvides: EffectFunction.pipe(
      descriptor.allowDuplicateProvides,
      Option.map(Option.some)
    ),
    id: descriptor.id,
    parameters,
    provides: EffectFunction.pipe(
      descriptor.provides,
      Array.map((fact) => fact.id)
    ),
    requires: EffectFunction.pipe(
      descriptor.requires,
      Array.map((fact) => fact.id)
    ),
    sourcePolicy: descriptor.sourcePolicy,
    sources: descriptor.sources,
    title: descriptor.title,
  });
};
const collectFacts = (
  entries: readonly CalculatorCatalogEntry[]
): readonly AnyFactDescriptor[] =>
  Array.fromIterable(
    HashMap.values(
      EffectFunction.pipe(
        entries,
        Array.reduce(
          HashMap.empty<FactId, AnyFactDescriptor>(),
          (facts, entry) =>
            EffectFunction.pipe(
              Array.appendAll(entry.inputFacts, entry.outputFacts),
              Array.reduce(facts, (updatedFacts, fact) =>
                HashMap.set(updatedFacts, fact.id, fact)
              )
            )
        )
      )
    )
  );
const collectRules = (
  entries: readonly CalculatorCatalogEntry[]
): readonly AnyRuleDescriptor[] =>
  Array.fromIterable(
    HashMap.values(
      EffectFunction.pipe(
        entries,
        Array.reduce(
          HashMap.empty<RuleId, AnyRuleDescriptor>(),
          (rules, entry) =>
            EffectFunction.pipe(
              entry.ruleDescriptors,
              Array.reduce(rules, (updatedRules, rule) =>
                HashMap.set(updatedRules, rule.id, rule)
              )
            )
        )
      )
    )
  );
export const toFactsResponse = (
  entries: readonly CalculatorCatalogEntry[]
): FactsResponse => {
  const facts = collectFacts(entries);
  return new FactsResponseData({
    facts: EffectFunction.pipe(facts, Array.map(toFactDescriptorMetadata)),
  });
};
export const toRulesResponse = (
  entries: readonly CalculatorCatalogEntry[]
): RulesResponse => {
  const rules = collectRules(entries);
  return new RulesResponseData({
    rules: EffectFunction.pipe(rules, Array.map(toRuleDescriptorMetadata)),
  });
};
export const toCalculatorSchemaResponse = (
  entry: CalculatorCatalogEntry
): CalculatorSchemaResponse =>
  new CalculatorSchemaResponseData({
    calculator: toCalculatorCatalogItem(entry),
    inputFacts: EffectFunction.pipe(
      entry.inputFacts,
      Array.map(toFactDescriptorMetadata)
    ),
    outputFacts: EffectFunction.pipe(
      entry.outputFacts,
      Array.map(toFactDescriptorMetadata)
    ),
    reportSchemaName: entry.reportSchemaName,
    rules: EffectFunction.pipe(
      entry.ruleDescriptors,
      Array.map(toRuleDescriptorMetadata)
    ),
  });
const toRuleGraphEdges = (
  rules: readonly AnyRuleDescriptor[]
): readonly RuleGraphEdge[] =>
  EffectFunction.pipe(
    rules,
    Array.flatMap((rule) =>
      EffectFunction.pipe(
        rule.requires,
        Array.flatMap((required) =>
          EffectFunction.pipe(
            rule.provides,
            Array.map(
              (provided) =>
                new RuleGraphEdgeData({
                  from: required.id,
                  ruleId: rule.id,
                  to: provided.id,
                })
            )
          )
        )
      )
    )
  );
export const toCalculatorGraphResponse = (args: {
  readonly entry: CalculatorCatalogEntry;
  readonly validationIssues: CalculatorGraphResponse["validationIssues"];
}): CalculatorGraphResponse => {
  const facts = collectFacts([args.entry]);
  return new CalculatorGraphResponseData({
    calculator: toCalculatorCatalogItem(args.entry),
    edges: toRuleGraphEdges(args.entry.ruleDescriptors),
    facts: EffectFunction.pipe(facts, Array.map(toFactDescriptorMetadata)),
    rules: EffectFunction.pipe(
      args.entry.ruleDescriptors,
      Array.map(toRuleDescriptorMetadata)
    ),
    validationIssues: args.validationIssues,
  });
};
export const filterCalculatorEntries = (
  query: DescriptorFilterQuery
): readonly CalculatorCatalogEntry[] =>
  EffectFunction.pipe(
    listCalculatorCatalogEntries(),
    Array.filter((entry) => {
      const calculatorMatches = query.calculator.pipe(
        Option.flatten,
        Option.match({
          onNone: () => true,
          onSome: (calculator) => calculator === entry.calculatorId,
        })
      );
      const jurisdictionMatches = query.jurisdiction.pipe(
        Option.flatten,
        Option.match({
          onNone: () => true,
          onSome: (jurisdiction) => jurisdiction === entry.context.jurisdiction,
        })
      );
      const taxYearMatches = query.taxYear.pipe(
        Option.flatten,
        Option.match({
          onNone: () => true,
          onSome: (taxYear) => taxYear === entry.context.taxYear,
        })
      );
      return calculatorMatches && jurisdictionMatches && taxYearMatches;
    })
  );
