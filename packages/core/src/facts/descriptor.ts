import { Schema } from "effect";
import type { Context } from "effect";

export const FactId = Schema.String.pipe(Schema.brand("whattax/FactId"));
export type FactId = typeof FactId.Type;

export const FactAuthority = Schema.Literals(["input", "derived", "parameter"]);
export type FactAuthority = typeof FactAuthority.Type;

export const FactQuestionId = Schema.String.pipe(
  Schema.brand("whattax/FactQuestionId")
);
export type FactQuestionId = typeof FactQuestionId.Type;

export const FactQuestionInputKind = Schema.Literals([
  "money",
  "boolean",
  "selection",
]);
export type FactQuestionInputKind = typeof FactQuestionInputKind.Type;

/**
 * Describes caller-facing metadata for an input fact without coupling the
 * calculation engine to a UI implementation.
 */
export class FactQuestion extends Schema.TaggedClass<FactQuestion>()(
  "FactQuestion",
  {
    id: FactQuestionId,
    prompt: Schema.String,
    inputKind: FactQuestionInputKind,
    helpText: Schema.optional(Schema.String),
  }
) {}

/**
 * Static metadata for a fact service.
 *
 * Descriptors are used by graph validation, docs generation, source review,
 * and caller question planning. The descriptor must match the actual
 * `Context.Service` tag supplied or derived by rule layers.
 */
export interface FactDescriptor<Self, Shape> {
  readonly id: FactId;
  readonly title: string;
  readonly authority: FactAuthority;
  readonly schema: Schema.Schema<Shape>;
  readonly tag: Context.Key<Self, Shape>;
  readonly question?: FactQuestion;
}

/**
 * Builds a schema-backed fact descriptor with a branded stable ID.
 */
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
