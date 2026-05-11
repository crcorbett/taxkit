import { Schema, type Context } from "effect";

export const FactId = Schema.String.pipe(Schema.brand("whattax/FactId"));
export type FactId = typeof FactId.Type;

export const FactAuthority = Schema.Literals(["input", "derived", "parameter"]);
export type FactAuthority = typeof FactAuthority.Type;

export const FactQuestionId = Schema.String.pipe(
  Schema.brand("whattax/FactQuestionId"),
);
export type FactQuestionId = typeof FactQuestionId.Type;

export const FactQuestionInputKind = Schema.Literals([
  "money",
  "boolean",
  "selection",
]);
export type FactQuestionInputKind = typeof FactQuestionInputKind.Type;

export class FactQuestion
  extends Schema.TaggedClass<FactQuestion>()("FactQuestion", {
    id: FactQuestionId,
    prompt: Schema.String,
    inputKind: FactQuestionInputKind,
    helpText: Schema.optional(Schema.String),
  }) {}

export interface FactDescriptor<Self, Shape> {
  readonly id: FactId;
  readonly title: string;
  readonly authority: FactAuthority;
  readonly schema: Schema.Schema<Shape>;
  readonly tag: Context.Key<Self, Shape>;
  readonly question?: FactQuestion;
}

export const makeFactDescriptor = <Self, Shape>(args: {
  readonly id: string;
  readonly title: string;
  readonly authority: FactAuthority;
  readonly schema: Schema.Schema<Shape>;
  readonly tag: Context.Key<Self, Shape>;
  readonly question?: FactQuestion;
}): FactDescriptor<Self, Shape> => ({
  id: FactId.make(args.id),
  title: args.title,
  authority: args.authority,
  schema: args.schema,
  tag: args.tag,
  ...(args.question === undefined ? {} : { question: args.question }),
});
