import {
  Match,
  Function as EffectFunction,
  Array,
  Chunk,
  Graph,
  HashMap,
  HashSet,
  Option,
  Schema,
  Boolean as EffectBoolean,
} from "effect";

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
export class GraphValidationIssue extends Schema.TaggedClass<
  GraphValidationIssue,
  {
    readonly brand: unique symbol;
  }
>()("GraphValidationIssue", {
  kind: GraphValidationIssueKind,
  message: Schema.String,
}) {}
const factKey = (fact: AnyFactDescriptor): FactId => fact.id;
const sourceKey = (source: {
  readonly kind: string;
  readonly reference: string;
}) => `${source.kind}:${source.reference}`;
const parameterInstanceKey = (parameter: AnyParameterDescriptor): string =>
  `${parameter.id}:${sourceKey(parameter.source)}:${parameter.effectivePeriod.from}:${Option.flatten(parameter.effectivePeriod.toExclusive).pipe(Option.getOrElse(() => "open"))}`;
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
  EffectFunction.pipe(
    rules,
    Array.reduce(
      HashMap.empty<FactId, readonly AnyRuleDescriptor[]>(),
      (providers, rule) =>
        EffectFunction.pipe(
          rule.provides,
          Array.reduce(providers, (updatedProviders, provided) => {
            const key = factKey(provided);
            const existing = HashMap.get(updatedProviders, key);
            const nextProviders = Match.value(existing).pipe(
              Match.when(Option.isSome, (matchedValue) =>
                Array.append(matchedValue.value, rule)
              ),
              Match.orElse(() => Array.of(rule))
            );
            return HashMap.set(updatedProviders, key, nextProviders);
          })
        )
    )
  );
const collectParameters = (
  rules: readonly AnyRuleDescriptor[]
): HashMap.HashMap<ParameterId, readonly AnyParameterDescriptor[]> =>
  EffectFunction.pipe(
    rules,
    Array.reduce(
      HashMap.empty<ParameterId, readonly AnyParameterDescriptor[]>(),
      (parameters, rule) =>
        EffectFunction.pipe(
          rule.parameters,
          Array.reduce(parameters, (updatedParameters, parameter) => {
            const existing = HashMap.get(updatedParameters, parameter.id);
            const nextParameters = Match.value(existing).pipe(
              Match.when(Option.isSome, (matchedValue) =>
                Array.append(matchedValue.value, parameter)
              ),
              Match.orElse(() => Array.of(parameter))
            );
            return HashMap.set(updatedParameters, parameter.id, nextParameters);
          })
        )
    )
  );
const buildDependencyGraph = (
  rules: readonly AnyRuleDescriptor[],
  providers: HashMap.HashMap<FactId, readonly AnyRuleDescriptor[]>
): Graph.DirectedGraph<FactId, string> => {
  const nodes = EffectFunction.pipe(
    Array.fromIterable(HashMap.keys(providers)),
    Array.map((data, index) => ({ data, index }))
  );
  const nodeIndices = HashMap.fromIterable(
    EffectFunction.pipe(
      nodes,
      Array.map(({ data, index }) => [data, index] as const)
    )
  );
  return Graph.fromSnapshot({
    edges: EffectFunction.pipe(
      EffectFunction.pipe(
        rules,
        Array.flatMap((rule) =>
          EffectFunction.pipe(
            rule.requires,
            Array.flatMap((required) =>
              EffectFunction.pipe(
                rule.provides,
                Array.flatMap((provided) =>
                  Option.all([
                    HashMap.get(nodeIndices, factKey(required)),
                    HashMap.get(nodeIndices, factKey(provided)),
                  ]).pipe(
                    Option.map(([source, target]) => ({
                      data: `${factKey(required)} -> ${factKey(provided)}`,
                      source,
                      target,
                    })),
                    Option.toArray
                  )
                )
              )
            )
          )
        )
      ),
      Array.map((edge, index) => ({ ...edge, index }))
    ),
    nodes,
    type: "directed",
  });
};
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
    EffectFunction.pipe(
      args.inputFacts ?? Array.empty<AnyFactDescriptor>(),
      Array.map(factKey)
    )
  );
  const providers = collectProviders(args.rules);
  const parameters = collectParameters(args.rules);
  const sourceIssues = EffectFunction.pipe(
    args.rules,
    Array.reduce(Chunk.empty<GraphValidationIssue>(), (issues, rule) =>
      EffectBoolean.match(
        rule.sourcePolicy === "required" && rule.sources.length === 0,
        {
          onFalse: () => issues,
          onTrue: () =>
            Chunk.append(
              issues,
              makeIssue(
                "missing-source",
                `${rule.id} requires at least one source reference`
              )
            ),
        }
      )
    )
  );
  const duplicateIssues = EffectFunction.pipe(
    providers,
    HashMap.reduce(
      Chunk.empty<GraphValidationIssue>(),
      (issues, factProviders, factId) => {
        const duplicateProviders = EffectFunction.pipe(
          factProviders,
          Array.filter(
            (provider) =>
              !Option.getOrElse(provider.allowDuplicateProvides, () => false)
          )
        );
        return EffectBoolean.match(duplicateProviders.length > 1, {
          onFalse: () => issues,
          onTrue: () =>
            Chunk.append(
              issues,
              makeIssue(
                "duplicate-provider",
                `${factId} is provided by ${Array.join(
                  EffectFunction.pipe(
                    duplicateProviders,
                    Array.map((provider) => provider.id)
                  ),
                  ", "
                )}`
              )
            ),
        });
      }
    )
  );
  const parameterSourceIssues = EffectFunction.pipe(
    args.rules,
    Array.reduce(Chunk.empty<GraphValidationIssue>(), (issues, rule) => {
      const sources = HashSet.fromIterable(
        EffectFunction.pipe(rule.sources, Array.map(sourceKey))
      );
      return EffectFunction.pipe(
        rule.parameters,
        Array.reduce(issues, (updatedIssues, parameter) =>
          EffectBoolean.match(
            HashSet.has(sources, sourceKey(parameter.source)),
            {
              onFalse: () =>
                Chunk.append(
                  updatedIssues,
                  makeIssue(
                    "parameter-source-mismatch",
                    `${rule.id} parameter ${parameter.id} source must be listed on rule sources`
                  )
                ),
              onTrue: () => updatedIssues,
            }
          )
        )
      );
    })
  );
  const parameterOverlapIssues = EffectFunction.pipe(
    parameters,
    HashMap.reduce(
      Chunk.empty<GraphValidationIssue>(),
      (issues, parameterDescriptors, parameterId) =>
        EffectFunction.pipe(
          parameterDescriptors,
          Array.reduce(issues, (updatedIssues, parameter) => {
            const overlapping = EffectFunction.pipe(
              parameterDescriptors,
              Array.findFirst(
                (candidate) =>
                  parameterInstanceKey(candidate) !==
                    parameterInstanceKey(parameter) &&
                  parametersOverlap(candidate, parameter)
              )
            );
            return Match.value(overlapping).pipe(
              Match.when(Option.isSome, () =>
                Chunk.append(
                  updatedIssues,
                  makeIssue(
                    "parameter-overlap",
                    `${parameterId} has overlapping effective periods`
                  )
                )
              ),
              Match.orElse(() => updatedIssues)
            );
          })
        )
    )
  );
  const missingProviderIssues = EffectFunction.pipe(
    args.rules,
    Array.reduce(Chunk.empty<GraphValidationIssue>(), (issues, rule) =>
      EffectFunction.pipe(
        rule.requires,
        Array.reduce(issues, (updatedIssues, required) => {
          const key = factKey(required);
          return EffectBoolean.match(
            !HashSet.has(inputFacts, key) && !HashMap.has(providers, key),
            {
              onFalse: () => updatedIssues,
              onTrue: () =>
                Chunk.append(
                  updatedIssues,
                  makeIssue(
                    "missing-provider",
                    `${rule.id} requires ${key}, but no input fact or rule provides it`
                  )
                ),
            }
          );
        })
      )
    )
  );
  const dependencyGraph = buildDependencyGraph(args.rules, providers);
  const cycleIssues = EffectBoolean.match(Graph.isAcyclic(dependencyGraph), {
    onFalse: () => Array.of(makeIssue("cycle", "rule graph contains cycle")),
    onTrue: () => Chunk.empty<GraphValidationIssue>(),
  });
  return [
    ...sourceIssues,
    ...duplicateIssues,
    ...parameterSourceIssues,
    ...parameterOverlapIssues,
    ...missingProviderIssues,
    ...cycleIssues,
  ];
};
