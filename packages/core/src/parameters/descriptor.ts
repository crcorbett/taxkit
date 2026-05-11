import { Schema, type Context } from "effect";
import type { SourceRef } from "../trace/node.js";

export const ParameterId = Schema.String.pipe(
  Schema.brand("whattax/ParameterId"),
);
export type ParameterId = typeof ParameterId.Type;

export interface ParameterDescriptor<Self, Shape> {
  readonly id: ParameterId;
  readonly title: string;
  readonly schema: Schema.Schema<Shape>;
  readonly tag: Context.Key<Self, Shape>;
  readonly source: SourceRef;
}

export type AnyParameterDescriptor = ParameterDescriptor<any, any>;

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
