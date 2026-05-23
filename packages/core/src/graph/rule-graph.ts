import { Array, Graph, HashMap, HashSet, Option, Schema } from "effect";

import type { FactId } from "../facts/descriptor.js";
import type {
  AnyParameterDescriptor,
  ParameterId,
} from "../parameters/descriptor.js";
import { dateIntervalsOverlap } from "../primitives/date.js";
import type {
  AnyFactDescriptor,
  AnyRuleDescriptor,
} from "../rules/descriptor.js";

/**
 * Kind of structural problem found in a selected rule graph.
 *
 * @since 0.1.0
 */
export const GraphValidationIssueKind = Schema.Literals([
  "duplicate-provider",
  "missing-provider",
  "missing-source",
  "parameter-overlap",
  "parameter-source-mismatch",
  "cycle",
]);

/**
 * Kind of structural problem found in a selected rule graph.
 *
 * @since 0.1.0
 */
export type GraphValidationIssueKind = typeof GraphValidationIssueKind.Type;

/**
 * A structural validation issue found before composing rule layers.
 *
 * @since 0.1.0
 */
export class GraphValidationIssue extends Schema.TaggedClass<GraphValidationIssue>()(
  "GraphValidationIssue",
  {
    kind: GraphValidationIssueKind,
    message: Schema.String,
  }
) {}

const factKey = (fact: AnyFactDescriptor): FactId => fact.id;
const sourceKey = (source: {
  readonly kind: string;
  readonly reference: string;
}) => `${source.kind}:${source.reference}`;
const parameterInstanceKey = (parameter: AnyParameterDescriptor): string =>
  `${parameter.id}:${sourceKey(parameter.source)}:${parameter.effectivePeriod.from}:${parameter.effectivePeriod.toExclusive ?? "open"}`;
const parametersOverlap = (
  left: AnyParameterDescriptor,
  right: AnyParameterDescriptor
): boolean => dateIntervalsOverlap(left.effectivePeriod, right.effectivePeriod);

const makeIssue = (
  kind: GraphValidationIssueKind,
  message: string
): GraphValidationIssue => new GraphValidationIssue({ kind, message });

const collectProviders = (
  rules: readonly AnyRuleDescriptor[]
): HashMap.HashMap<FactId, readonly AnyRuleDescriptor[]> =>
  Array.reduce(
    rules,
    HashMap.empty<FactId, readonly AnyRuleDescriptor[]>(),
    (providers, rule) =>
      Array.reduce(rule.provides, providers, (updatedProviders, provided) => {
        const key = factKey(provided);
        const existing = HashMap.get(updatedProviders, key);
        const nextProviders = Option.isSome(existing)
          ? Array.append(existing.value, rule)
          : Array.of(rule);

        return HashMap.set(updatedProviders, key, nextProviders);
      })
  );

const collectParameters = (
  rules: readonly AnyRuleDescriptor[]
): HashMap.HashMap<ParameterId, readonly AnyParameterDescriptor[]> =>
  Array.reduce(
    rules,
    HashMap.empty<ParameterId, readonly AnyParameterDescriptor[]>(),
    (parameters, rule) =>
      Array.reduce(
        rule.parameters ?? Array.empty<AnyParameterDescriptor>(),
        parameters,
        (updatedParameters, parameter) => {
          const existing = HashMap.get(updatedParameters, parameter.id);
          const nextParameters = Option.isSome(existing)
            ? Array.append(existing.value, parameter)
            : Array.of(parameter);

          return HashMap.set(updatedParameters, parameter.id, nextParameters);
        }
      )
  );

const buildDependencyGraph = (
  rules: readonly AnyRuleDescriptor[],
  providers: HashMap.HashMap<FactId, readonly AnyRuleDescriptor[]>
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
        if (Option.isNone(sourceIndex)) {
          continue;
        }

        for (const provided of rule.provides) {
          const providedKey = factKey(provided);
          const targetIndex = HashMap.get(nodeIndices, providedKey);
          if (Option.isSome(targetIndex)) {
            Graph.addEdge(
              mutable,
              sourceIndex.value,
              targetIndex.value,
              `${requiredKey} -> ${providedKey}`
            );
          }
        }
      }
    }
  });

/**
 * Validates that selected rule descriptors can be composed for input facts.
 *
 * The validator checks provider uniqueness, missing inputs or derived facts,
 * required official sources, parameter-source drift, and dependency cycles.
 * @since 0.1.0
 */
export const validateRuleGraph = (args: {
  readonly rules: readonly AnyRuleDescriptor[];
  readonly inputFacts?: readonly AnyFactDescriptor[];
}): readonly GraphValidationIssue[] => {
  const inputFacts = HashSet.fromIterable(
    Array.map(args.inputFacts ?? Array.empty<AnyFactDescriptor>(), factKey)
  );
  const providers = collectProviders(args.rules);
  const parameters = collectParameters(args.rules);

  const sourceIssues = Array.reduce(
    args.rules,
    Array.empty<GraphValidationIssue>(),
    (issues, rule) =>
      rule.sourcePolicy === "required" && rule.sources.length === 0
        ? Array.append(
            issues,
            makeIssue(
              "missing-source",
              `${rule.id} requires at least one source reference`
            )
          )
        : issues
  );

  const duplicateIssues = HashMap.reduce(
    providers,
    Array.empty<GraphValidationIssue>(),
    (issues, factProviders, factId) => {
      const duplicateProviders = Array.filter(
        factProviders,
        (provider) => provider.allowDuplicateProvides !== true
      );

      return duplicateProviders.length > 1
        ? Array.append(
            issues,
            makeIssue(
              "duplicate-provider",
              `${factId} is provided by ${Array.join(
                Array.map(duplicateProviders, (provider) => provider.id),
                ", "
              )}`
            )
          )
        : issues;
    }
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
                  `${rule.id} parameter ${parameter.id} source must be listed on rule sources`
                )
              )
      );
    }
  );

  const parameterOverlapIssues = HashMap.reduce(
    parameters,
    Array.empty<GraphValidationIssue>(),
    (issues, parameterDescriptors, parameterId) =>
      Array.reduce(parameterDescriptors, issues, (updatedIssues, parameter) => {
        const overlapping = Array.findFirst(
          parameterDescriptors,
          (candidate) =>
            parameterInstanceKey(candidate) !==
              parameterInstanceKey(parameter) &&
            parametersOverlap(candidate, parameter)
        );

        return Option.isSome(overlapping)
          ? Array.append(
              updatedIssues,
              makeIssue(
                "parameter-overlap",
                `${parameterId} has overlapping effective periods`
              )
            )
          : updatedIssues;
      })
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
                `${rule.id} requires ${key}, but no input fact or rule provides it`
              )
            )
          : updatedIssues;
      })
  );

  const dependencyGraph = buildDependencyGraph(args.rules, providers);
  const cycleIssues = Graph.isAcyclic(dependencyGraph)
    ? Array.empty<GraphValidationIssue>()
    : Array.of(makeIssue("cycle", "rule graph contains cycle"));

  return [
    ...sourceIssues,
    ...duplicateIssues,
    ...parameterSourceIssues,
    ...parameterOverlapIssues,
    ...missingProviderIssues,
    ...cycleIssues,
  ];
};
