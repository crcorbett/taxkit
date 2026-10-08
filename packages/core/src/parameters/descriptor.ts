import { Effect, Option, Schema } from "effect";
import type { Context } from "effect";

import { DateInterval } from "../primitives/date.js";
import { SourceArtifact, SourceRef } from "../trace/node.js";

/**
 * Stable identifier for an official parameter service.
 *
 * @since 0.1.0
 */
export const ParameterId = Schema.String.pipe(
  Schema.brand("taxkit/ParameterId")
);

/**
 * Stable identifier for an official parameter service.
 *
 * @since 0.1.0
 */
export type ParameterId = typeof ParameterId.Type;

/**
 * Date range in which a parameter descriptor is valid.
 *
 * The interval is half-open: `[from, toExclusive)`. Date-level precision is
 * required because official tax changes can start mid-year.
 *
 * @since 0.1.0
 */
export const ParameterEffectivePeriod = DateInterval;

/**
 * Date range in which a parameter descriptor is valid.
 *
 * @since 0.1.0
 */
export type ParameterEffectivePeriod = typeof ParameterEffectivePeriod.Type;

const ParameterDescriptorFields = Schema.Struct({
  effectivePeriod: Schema.toType(ParameterEffectivePeriod),
  id: ParameterId,
  source: SourceRef,
  sourceArtifact: Schema.OptionFromOptional(Schema.toType(SourceArtifact)).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
  title: Schema.String,
});

/**
 * Checked parameter metadata with its schema-to-service relation.
 * @since 0.1.0
 */
export type ParameterDescriptor<Self, Value> =
  typeof ParameterDescriptorFields.Type & {
    readonly schema: Schema.Schema<Value>;
    readonly tag: Context.Key<Self, Value>;
  };

/**
 * Parameter descriptor whose service relation is not needed by graph checks.
 * @since 0.1.0
 */
export type AnyParameterDescriptor = ParameterDescriptor<unknown, unknown>;

/**
 * Builds a parameter descriptor from its owning field representation.
 * The supplied period and artifact are already checked domain values.
 * @since 0.1.0
 */
export const makeParameterDescriptor = <Self, Value>(
  args: Omit<typeof ParameterDescriptorFields.Encoded, "id"> & {
    readonly id: string;
    readonly schema: Schema.Schema<Value>;
    readonly tag: Context.Key<Self, Value>;
  }
): ParameterDescriptor<Self, Value> => ({
  ...ParameterDescriptorFields.make({
    effectivePeriod: args.effectivePeriod,
    id: ParameterId.make(args.id),
    source: args.source,
    sourceArtifact: Option.fromUndefinedOr(args.sourceArtifact),
    title: args.title,
  }),
  schema: args.schema,
  tag: args.tag,
});
