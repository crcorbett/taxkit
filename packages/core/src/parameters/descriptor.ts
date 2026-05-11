import { Schema } from "effect";
import type { Context } from "effect";

import type { SourceRef } from "../trace/node.js";

export const ParameterId = Schema.String.pipe(
  Schema.brand("whattax/ParameterId")
);
export type ParameterId = typeof ParameterId.Type;

/**
 * Static metadata for a parameter service supplied to official rule layers.
 *
 * Parameter descriptors let graph validation tie a rule's required parameter
 * services back to the source references that justify them.
 */
export interface ParameterDescriptor<Self, Shape> {
  readonly id: ParameterId;
  readonly title: string;
  readonly schema: Schema.Schema<Shape>;
  readonly tag: Context.Key<Self, Shape>;
  readonly source: SourceRef;
}

export type AnyParameterDescriptor = ParameterDescriptor<unknown, unknown>;

/**
 * Builds a schema-backed parameter descriptor with a branded stable ID.
 */
export const makeParameterDescriptor = <Self, Shape>(args: {
  readonly id: string;
  readonly title: string;
  readonly schema: Schema.Schema<Shape>;
  readonly tag: Context.Key<Self, Shape>;
  readonly source: SourceRef;
}): ParameterDescriptor<Self, Shape> => ({
  id: ParameterId.make(args.id),
  title: args.title,
  schema: args.schema,
  tag: args.tag,
  source: args.source,
});
