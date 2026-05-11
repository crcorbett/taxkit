import type { Layer } from "effect";
import { Schema } from "effect";
import type { FactDescriptor } from "../facts/descriptor.js";
import type { AnyParameterDescriptor } from "../parameters/descriptor.js";
import { RuleId, type SourceRef } from "../trace/node.js";

export type AnyFactDescriptor = FactDescriptor<any, any>;

export const RuleSourcePolicy = Schema.Literals(["not-required", "required"]);
export type RuleSourcePolicy = typeof RuleSourcePolicy.Type;

export interface RuleDescriptor<ROut = unknown, E = unknown, RIn = unknown> {
  readonly id: RuleId;
  readonly title: string;
  readonly provides: ReadonlyArray<AnyFactDescriptor>;
  readonly requires: ReadonlyArray<AnyFactDescriptor>;
  readonly parameters?: ReadonlyArray<AnyParameterDescriptor>;
  readonly layer: Layer.Layer<ROut, E, RIn>;
  readonly sources: ReadonlyArray<SourceRef>;
  readonly sourcePolicy: RuleSourcePolicy;
  readonly allowDuplicateProvides?: boolean;
}

export type AnyRuleDescriptor = RuleDescriptor<any, any, any>;

export const makeRuleDescriptor = <ROut, E, RIn>(
  descriptor: RuleDescriptor<ROut, E, RIn>,
): RuleDescriptor<ROut, E, RIn> => descriptor;
