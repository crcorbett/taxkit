import type { Layer } from "effect";
import { Effect, Option, Schema } from "effect";

import type { FactDescriptor } from "../facts/descriptor.js";
import type { AnyParameterDescriptor } from "../parameters/descriptor.js";
import { RuleId, SourceRef } from "../trace/node.js";

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
> = Descriptors[number]["tag"]["Identifier"];

/**
 * Extracts the service tag represented by a parameter descriptor tuple.
 *
 * @since 0.1.0
 */
export type ParameterDescriptorServices<
  Descriptors extends readonly AnyParameterDescriptor[],
> = Descriptors[number]["tag"]["Identifier"];

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

const RuleDescriptorFields = Schema.Struct({
  allowDuplicateProvides: Schema.OptionFromOptional(Schema.Boolean).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
  id: Schema.toType(RuleId),
  sourcePolicy: RuleSourcePolicy,
  sources: Schema.Array(SourceRef),
  title: Schema.String,
});

/**
 * Checked rule metadata with its actual Layer and descriptor relations.
 * @since 0.1.0
 */
export type RuleDescriptor<
  ROut = unknown,
  E = unknown,
  RIn = unknown,
> = typeof RuleDescriptorFields.Type & {
  readonly layer: Layer.Layer<ROut, E, RIn>;
  readonly parameters: readonly AnyParameterDescriptor[];
  readonly provides: readonly AnyFactDescriptor[];
  readonly requires: readonly AnyFactDescriptor[];
};

/**
 * Constructor representation whose tuples infer the Layer services.
 * Optional parameters have a total empty-collection meaning.
 * @since 0.1.0
 */
export type RuleDescriptorInput<
  Provides extends readonly AnyFactDescriptor[],
  Requires extends readonly AnyFactDescriptor[],
  Parameters extends readonly AnyParameterDescriptor[],
  E,
> = typeof RuleDescriptorFields.Encoded & {
  readonly layer: Layer.Layer<
    FactDescriptorServices<Provides>,
    E,
    FactDescriptorServices<Requires> | ParameterDescriptorServices<Parameters>
  >;
  readonly parameters?: Parameters;
  readonly provides: Provides;
  readonly requires: Requires;
};

/**
 * Checked descriptor metadata without its executable Layer.
 * @since 0.1.0
 */
export type AnyRuleDescriptor = Omit<RuleDescriptor, "layer">;

/**
 * Keeps tuple inference and checks the canonical ordinary metadata fields.
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
  readonly parameters: Parameters | readonly [];
  readonly provides: Provides;
  readonly requires: Requires;
} => ({
  ...RuleDescriptorFields.make({
    allowDuplicateProvides: Option.fromUndefinedOr(
      descriptor.allowDuplicateProvides
    ),
    id: descriptor.id,
    sourcePolicy: descriptor.sourcePolicy,
    sources: descriptor.sources,
    title: descriptor.title,
  }),
  layer: descriptor.layer,
  parameters: descriptor.parameters ?? [],
  provides: descriptor.provides,
  requires: descriptor.requires,
});
