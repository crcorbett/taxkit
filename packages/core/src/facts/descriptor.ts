import { Schema, type Context } from "effect";

export const FactId = Schema.String.pipe(Schema.brand("whattax/FactId"));
export type FactId = typeof FactId.Type;

export const FactAuthority = Schema.Literals(["input", "derived", "parameter"]);
export type FactAuthority = typeof FactAuthority.Type;

export interface FactDescriptor<Self, Shape> {
  readonly id: FactId;
  readonly title: string;
  readonly authority: FactAuthority;
  readonly schema: Schema.Schema<Shape>;
  readonly tag: Context.Key<Self, Shape>;
}

export const makeFactDescriptor = <Self, Shape>(args: {
  readonly id: string;
  readonly title: string;
  readonly authority: FactAuthority;
  readonly schema: Schema.Schema<Shape>;
  readonly tag: Context.Key<Self, Shape>;
}): FactDescriptor<Self, Shape> => ({
  id: FactId.make(args.id),
  title: args.title,
  authority: args.authority,
  schema: args.schema,
  tag: args.tag,
});
