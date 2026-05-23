import type { Layer } from "effect";
import { Schema } from "effect";

import type { FactDescriptor } from "../facts/descriptor.js";
import type {
  AnyParameterDescriptor,
  ParameterDescriptor,
} from "../parameters/descriptor.js";
import type { RuleId, SourceRef } from "../trace/node.js";

/**
 * Fact descriptor with its service type erased for rule metadata.
 *
 * @since 0.1.0
 */
export type AnyFactDescriptor = FactDescriptor<unknown, unknown>;

/**
 * Extracts the service tag represented by a fact descriptor tuple.
 *
 * @since 0.1.0
 */
export type FactDescriptorServices<
  Descriptors extends readonly AnyFactDescriptor[],
> =
  Descriptors[number] extends FactDescriptor<infer Self, unknown>
    ? Self
    : never;

/**
 * Extracts the service tag represented by a parameter descriptor tuple.
 *
 * @since 0.1.0
 */
export type ParameterDescriptorServices<
  Descriptors extends readonly AnyParameterDescriptor[],
> =
  Descriptors[number] extends ParameterDescriptor<infer Self, unknown>
    ? Self
    : never;

/**
 * Source evidence policy for a rule descriptor.
 *
 * @since 0.1.0
 */
export const RuleSourcePolicy = Schema.Literals(["not-required", "required"]);

/**
 * Source evidence policy for a rule descriptor.
 *
 * @since 0.1.0
 */
export type RuleSourcePolicy = typeof RuleSourcePolicy.Type;

/**
 * Static metadata for a rule layer and its graph dependencies.
 *
 * The descriptor explains which facts the rule requires and provides, which
 * parameter services it uses, and which sources justify official calculations.
 * It must stay aligned with the actual Effect layer so graph validation can
 * catch drift before consumers compose an invalid rule pack.
 *
 * @since 0.1.0
 */
export interface RuleDescriptor<ROut = unknown, E = unknown, RIn = unknown> {
  readonly id: RuleId;
  readonly title: string;
  readonly provides: readonly AnyFactDescriptor[];
  readonly requires: readonly AnyFactDescriptor[];
  readonly parameters?: readonly AnyParameterDescriptor[];
  readonly layer: Layer.Layer<ROut, E, RIn>;
  readonly sources: readonly SourceRef[];
  readonly sourcePolicy: RuleSourcePolicy;
  readonly allowDuplicateProvides?: boolean;
}

/**
 * Compile-time checked descriptor input for a rule layer.
 *
 * `provides`, `requires`, and `parameters` are tuples so the layer's provided
 * and required services can be inferred from the descriptors rather than
 * repeated manually.
 *
 * @since 0.1.0
 */
export interface RuleDescriptorInput<
  Provides extends readonly AnyFactDescriptor[],
  Requires extends readonly AnyFactDescriptor[],
  Parameters extends readonly AnyParameterDescriptor[],
  E,
> {
  readonly id: RuleId;
  readonly title: string;
  readonly provides: Provides;
  readonly requires: Requires;
  readonly parameters?: Parameters;
  readonly layer: Layer.Layer<
    FactDescriptorServices<Provides>,
    E,
    FactDescriptorServices<Requires> | ParameterDescriptorServices<Parameters>
  >;
  readonly sources: readonly SourceRef[];
  readonly sourcePolicy: RuleSourcePolicy;
  readonly allowDuplicateProvides?: boolean;
}

/**
 * Erased descriptor used by graph validation when the layer type is preserved
 * on each concrete descriptor but not needed by the validator.
 *
 * @since 0.1.0
 */
export interface AnyRuleDescriptor {
  readonly id: RuleId;
  readonly title: string;
  readonly provides: readonly AnyFactDescriptor[];
  readonly requires: readonly AnyFactDescriptor[];
  readonly parameters?: readonly AnyParameterDescriptor[];
  readonly sources: readonly SourceRef[];
  readonly sourcePolicy: RuleSourcePolicy;
  readonly allowDuplicateProvides?: boolean;
}

/**
 * Preserves a rule layer's generic type while recording public metadata.
 *
 * @since 0.1.0
 */
export const makeRuleDescriptor = <
  const Provides extends readonly AnyFactDescriptor[],
  const Requires extends readonly AnyFactDescriptor[],
  const Parameters extends readonly AnyParameterDescriptor[] = readonly [],
  E = never,
>(
  descriptor: RuleDescriptorInput<Provides, Requires, Parameters, E>
): RuleDescriptor<
  FactDescriptorServices<Provides>,
  E,
  FactDescriptorServices<Requires> | ParameterDescriptorServices<Parameters>
> & {
  readonly parameters?: Parameters;
  readonly provides: Provides;
  readonly requires: Requires;
} => descriptor;
