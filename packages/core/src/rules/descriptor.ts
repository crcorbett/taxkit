import type { Layer } from "effect";
import { Schema } from "effect";

import type { FactDescriptor } from "../facts/descriptor.js";
import type { AnyParameterDescriptor } from "../parameters/descriptor.js";
import type { RuleId, SourceRef } from "../trace/node.js";

export type AnyFactDescriptor = FactDescriptor<unknown, unknown>;

export const RuleSourcePolicy = Schema.Literals(["not-required", "required"]);
export type RuleSourcePolicy = typeof RuleSourcePolicy.Type;

/**
 * Static metadata for a rule layer.
 *
 * The descriptor explains which facts the rule requires and provides, which
 * parameter services it uses, and which sources justify official calculations.
 * It must stay aligned with the actual Effect layer so graph validation can
 * catch drift before consumers compose an invalid rule pack.
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
 * Erased descriptor used by graph validation when the layer type is preserved
 * on each concrete descriptor but not needed by the validator.
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
 * Preserves the generic layer type while marking the object as a rule
 * descriptor.
 */
export const makeRuleDescriptor = <ROut, E, RIn>(
  descriptor: RuleDescriptor<ROut, E, RIn>
): RuleDescriptor<ROut, E, RIn> => descriptor;
