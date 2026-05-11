import { Schema } from "effect";
import type { Context } from "effect";

import { TaxYear } from "../primitives/tax.js";
import type { TaxYear as TaxYearType } from "../primitives/tax.js";
import type { SourceRef } from "../trace/node.js";

/**
 * Stable identifier for an official parameter service.
 *
 * @since 0.1.0
 */
export const ParameterId = Schema.String.pipe(
  Schema.brand("whattax/ParameterId")
);

/**
 * Stable identifier for an official parameter service.
 *
 * @since 0.1.0
 */
export type ParameterId = typeof ParameterId.Type;

/**
 * Tax-year range in which a parameter descriptor is valid.
 *
 * `to` is optional for an open-ended rule source, but official annual rule
 * packs should normally use closed one-year ranges so graph validation can
 * detect accidental overlap between alternative parameter tables.
 *
 * @since 0.1.0
 */
export const ParameterEffectivePeriod = Schema.Struct({
  from: TaxYear,
  to: Schema.optional(TaxYear),
});

/**
 * Tax-year range in which a parameter descriptor is valid.
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
  readonly effectivePeriod: {
    readonly from: TaxYearType;
    readonly to?: TaxYearType;
  };
  readonly id: string;
  readonly schema: Schema.Schema<Shape>;
  readonly source: SourceRef;
  readonly tag: Context.Key<Self, Shape>;
  readonly title: string;
}): ParameterDescriptor<Self, Shape> => ({
  effectivePeriod: ParameterEffectivePeriod.make(args.effectivePeriod),
  id: ParameterId.make(args.id),
  schema: args.schema,
  source: args.source,
  tag: args.tag,
  title: args.title,
});
