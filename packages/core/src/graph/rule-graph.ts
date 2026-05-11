import { Array, Graph, HashMap, HashSet, Option, Schema } from "effect";
import type { FactId } from "../facts/descriptor.js";
import type { AnyFactDescriptor, AnyRuleDescriptor } from "../rules/descriptor.js";

export const GraphValidationIssueKind = Schema.Literals([
  "duplicate-provider",
  "missing-provider",
  "missing-source",
  "parameter-source-mismatch",
  "cycle",
]);
export type GraphValidationIssueKind = typeof GraphValidationIssueKind.Type;

export class GraphValidationIssue
  extends Schema.TaggedClass<GraphValidationIssue>()("GraphValidationIssue", {
    kind: GraphValidationIssueKind,
    message: Schema.String,
  }) {}

const factKey = (fact: AnyFactDescriptor): FactId => fact.id;
const sourceKey = (source: { readonly kind: string; readonly reference: string }) =>
  `${source.kind}:${source.reference}`;

const makeIssue = (
  kind: GraphValidationIssueKind,
  message: string,
): GraphValidationIssue => new GraphValidationIssue({ kind, message });

const collectProviders = (
  rules: ReadonlyArray<AnyRuleDescriptor>,
): HashMap.HashMap<FactId, ReadonlyArray<AnyRuleDescriptor>> =>
  Array.reduce(
    rules,
    HashMap.empty<FactId, ReadonlyArray<AnyRuleDescriptor>>(),
    (providers, rule) =>
      Array.reduce(rule.provides, providers, (updatedProviders, provided) => {
        const key = factKey(provided);
        const existing = HashMap.get(updatedProviders, key);
        const nextProviders = Option.isSome(existing)
          ? Array.append(existing.value, rule)
          : Array.of(rule);

        return HashMap.set(updatedProviders, key, nextProviders);
      }),
  );

const buildDependencyGraph = (
  rules: ReadonlyArray<AnyRuleDescriptor>,
  providers: HashMap.HashMap<FactId, ReadonlyArray<AnyRuleDescriptor>>,
): Graph.DirectedGraph<FactId, string> =>
  Graph.directed<FactId, string>((mutable) => {
    let nodeIndices = HashMap.empty<FactId, Graph.NodeIndex>();

    for (const key of HashMap.keys(providers)) {
      nodeIndices = HashMap.set(nodeIndices, key, Graph.addNode(mutable, key));
    }

    for (const rule of rules) {
      for (const required of rule.requires) {
        const requiredKey = factKey(required);
        const sourceIndex = HashMap.get(nodeIndices, requiredKey);
        if (Option.isNone(sourceIndex)) continue;

        for (const provided of rule.provides) {
          const providedKey = factKey(provided);
          const targetIndex = HashMap.get(nodeIndices, providedKey);
          if (Option.isSome(targetIndex)) {
            Graph.addEdge(
              mutable,
              sourceIndex.value,
              targetIndex.value,
              `${requiredKey} -> ${providedKey}`,
            );
          }
        }
      }
    }
  });

export const validateRuleGraph = (args: {
  readonly rules: ReadonlyArray<AnyRuleDescriptor>;
  readonly inputFacts?: ReadonlyArray<AnyFactDescriptor>;
}): ReadonlyArray<GraphValidationIssue> => {
  const inputFacts = HashSet.fromIterable(
    Array.map(args.inputFacts ?? Array.empty<AnyFactDescriptor>(), factKey),
  );
  const providers = collectProviders(args.rules);

  const sourceIssues = Array.reduce(
    args.rules,
    Array.empty<GraphValidationIssue>(),
    (issues, rule) =>
      rule.sourcePolicy === "required" && rule.sources.length === 0
        ? Array.append(
            issues,
            makeIssue(
              "missing-source",
              `${rule.id} requires at least one source reference`,
            ),
          )
        : issues,
  );

  const duplicateIssues = HashMap.reduce(
    providers,
    Array.empty<GraphValidationIssue>(),
    (issues, factProviders, factId) => {
      const duplicateProviders = Array.filter(
        factProviders,
        (provider) => !provider.allowDuplicateProvides,
      );

      return duplicateProviders.length > 1
        ? Array.append(
            issues,
            makeIssue(
              "duplicate-provider",
              `${factId} is provided by ${Array.join(
                Array.map(duplicateProviders, (provider) => provider.id),
                ", ",
              )}`,
            ),
          )
        : issues;
    },
  );

  const parameterSourceIssues = Array.reduce(
    args.rules,
    Array.empty<GraphValidationIssue>(),
    (issues, rule) => {
      const sources = HashSet.fromIterable(Array.map(rule.sources, sourceKey));

      return Array.reduce(
        rule.parameters ?? Array.empty(),
        issues,
        (updatedIssues, parameter) =>
          HashSet.has(sources, sourceKey(parameter.source))
            ? updatedIssues
            : Array.append(
                updatedIssues,
                makeIssue(
                  "parameter-source-mismatch",
                  `${rule.id} parameter ${parameter.id} source must be listed on rule sources`,
                ),
              ),
      );
    },
  );

  const missingProviderIssues = Array.reduce(
    args.rules,
    Array.empty<GraphValidationIssue>(),
    (issues, rule) =>
      Array.reduce(rule.requires, issues, (updatedIssues, required) => {
        const key = factKey(required);

        return !HashSet.has(inputFacts, key) && !HashMap.has(providers, key)
          ? Array.append(
              updatedIssues,
              makeIssue(
                "missing-provider",
                `${rule.id} requires ${key}, but no input fact or rule provides it`,
              ),
            )
          : updatedIssues;
      }),
  );

  const dependencyGraph = buildDependencyGraph(args.rules, providers);
  const cycleIssues = Graph.isAcyclic(dependencyGraph)
    ? Array.empty<GraphValidationIssue>()
    : Array.of(makeIssue("cycle", "rule graph contains cycle"));

  return [
    ...sourceIssues,
    ...duplicateIssues,
    ...parameterSourceIssues,
    ...missingProviderIssues,
    ...cycleIssues,
  ];
};
