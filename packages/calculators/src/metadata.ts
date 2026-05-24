import type {
  AnyFactDescriptor,
  AnyRuleDescriptor,
  FactId,
  RuleId,
} from "@whattax/core";
import { AuPayJurisdiction, AuPayTaxYear } from "@whattax/rules-au-pay";
import { Array, Data, HashMap, Option } from "effect";
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

const schemaTag = (schema: Schema.Top): string => schema.ast._tag;

const toFactDescriptorMetadata = (
  descriptor: AnyFactDescriptor
): FactDescriptorMetadata =>
  Option.fromNullishOr(descriptor.question).pipe(
    Option.match({
      onNone: () =>
        new FactDescriptorMetadataData({
          authority: descriptor.authority,
          id: descriptor.id,
          schemaTag: schemaTag(descriptor.schema),
          title: descriptor.title,
        }),
      onSome: (question) =>
        new FactDescriptorMetadataData({
          authority: descriptor.authority,
          id: descriptor.id,
          question,
          schemaTag: schemaTag(descriptor.schema),
          title: descriptor.title,
        }),
    })
  );

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
): RuleDescriptorMetadata => {
  const parameters = Option.fromNullishOr(descriptor.parameters).pipe(
    Option.match({
      onNone: Array.empty,
      onSome: (parameterDescriptors) =>
        Array.map(parameterDescriptors, toParameterDescriptorMetadata),
    })
  );

  return Option.fromNullishOr(descriptor.allowDuplicateProvides).pipe(
    Option.match({
      onNone: () =>
        new RuleDescriptorMetadataData({
          id: descriptor.id,
          parameters,
          provides: Array.map(descriptor.provides, (fact) => fact.id),
          requires: Array.map(descriptor.requires, (fact) => fact.id),
          sourcePolicy: descriptor.sourcePolicy,
          sources: descriptor.sources,
          title: descriptor.title,
        }),
      onSome: (allowDuplicateProvides) =>
        new RuleDescriptorMetadataData({
          allowDuplicateProvides,
          id: descriptor.id,
          parameters,
          provides: Array.map(descriptor.provides, (fact) => fact.id),
          requires: Array.map(descriptor.requires, (fact) => fact.id),
          sourcePolicy: descriptor.sourcePolicy,
          sources: descriptor.sources,
          title: descriptor.title,
        }),
    })
  );
};

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
): FactsResponse => {
  const facts = collectFacts(entries);

  return new FactsResponseData({
    facts: Array.map(facts, toFactDescriptorMetadata),
  });
};

export const toRulesResponse = (
  entries: readonly CalculatorCatalogEntry[]
): RulesResponse => {
  const rules = collectRules(entries);

  return new RulesResponseData({
    rules: Array.map(rules, toRuleDescriptorMetadata),
  });
};

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
  readonly validationIssues: CalculatorGraphResponse["validationIssues"];
}): CalculatorGraphResponse => {
  const facts = collectFacts([args.entry]);

  return new CalculatorGraphResponseData({
    calculator: toCalculatorCatalogItem(args.entry),
    edges: toRuleGraphEdges(args.entry.ruleDescriptors),
    facts: Array.map(facts, toFactDescriptorMetadata),
    rules: Array.map(args.entry.ruleDescriptors, toRuleDescriptorMetadata),
    validationIssues: args.validationIssues,
  });
};

export const filterCalculatorEntries = (
  query: DescriptorFilterQuery
): readonly CalculatorCatalogEntry[] =>
  Array.filter(listCalculatorCatalogEntries(), (entry) => {
    const calculatorMatches = Option.fromNullishOr(query.calculator).pipe(
      Option.match({
        onNone: () => true,
        onSome: (calculator) => calculator === entry.calculatorId,
      })
    );
    const jurisdictionMatches = Option.fromNullishOr(query.jurisdiction).pipe(
      Option.match({
        onNone: () => true,
        onSome: (jurisdiction) => jurisdiction === entry.context.jurisdiction,
      })
    );
    const taxYearMatches = Option.fromNullishOr(query.taxYear).pipe(
      Option.match({
        onNone: () => true,
        onSome: (taxYear) => taxYear === entry.context.taxYear,
      })
    );

    return calculatorMatches && jurisdictionMatches && taxYearMatches;
  });
