import { Schema } from "effect";
import type { Context } from "effect";

import { DateInterval } from "../primitives/date.js";
import type { SourceArtifact, SourceRef } from "../trace/node.js";

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

/**
 * Static metadata for a sourced parameter service supplied to rule layers.
 *
 * Parameter descriptors let graph validation tie a rule's required parameter
 * services back to the source references that justify them.
 *
 * @since 0.1.0
 */
export interface ParameterDescriptor<Self, Shape> {
  readonly effectivePeriod: ParameterEffectivePeriod;
  readonly id: ParameterId;
  readonly schema: Schema.Schema<Shape>;
  readonly source: SourceRef;
  readonly sourceArtifact?: SourceArtifact;
  readonly tag: Context.Key<Self, Shape>;
  readonly title: string;
}

/**
 * Parameter descriptor with its service type erased for graph validation.
 *
 * @since 0.1.0
 */
export type AnyParameterDescriptor = ParameterDescriptor<unknown, unknown>;

/**
 * Builds a schema-backed parameter descriptor with a branded stable ID.
 *
 * @since 0.1.0
 */
export const makeParameterDescriptor = <Self, Shape>(args: {
  readonly effectivePeriod: ParameterEffectivePeriod;
  readonly id: string;
  readonly schema: Schema.Schema<Shape>;
  readonly source: SourceRef;
  readonly sourceArtifact?: SourceArtifact;
  readonly tag: Context.Key<Self, Shape>;
  readonly title: string;
}): ParameterDescriptor<Self, Shape> => ({
  effectivePeriod: ParameterEffectivePeriod.make(args.effectivePeriod),
  id: ParameterId.make(args.id),
  schema: args.schema,
  source: args.source,
  ...(args.sourceArtifact === undefined
    ? {}
    : { sourceArtifact: args.sourceArtifact }),
  tag: args.tag,
  title: args.title,
});
