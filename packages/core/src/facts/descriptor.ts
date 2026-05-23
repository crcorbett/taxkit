import { Schema } from "effect";
import type { Context } from "effect";

/**
 * Stable identifier for a fact produced or consumed by rules.
 *
 * @since 0.1.0
 */
export const FactId = Schema.String.pipe(Schema.brand("whattax/FactId"));

/**
 * Stable identifier for a fact produced or consumed by rules.
 *
 * @since 0.1.0
 */
export type FactId = typeof FactId.Type;

/**
 * Declares where a fact is expected to come from in a calculation graph.
 *
 * @since 0.1.0
 */
export const FactAuthority = Schema.Literals(["input", "derived", "parameter"]);

/**
 * Declares where a fact is expected to come from in a calculation graph.
 *
 * @since 0.1.0
 */
export type FactAuthority = typeof FactAuthority.Type;

/**
 * Stable identifier for a caller-facing fact question.
 *
 * @since 0.1.0
 */
export const FactQuestionId = Schema.String.pipe(
  Schema.brand("whattax/FactQuestionId")
);

/**
 * Stable identifier for a caller-facing fact question.
 *
 * @since 0.1.0
 */
export type FactQuestionId = typeof FactQuestionId.Type;

/**
 * Input control category needed to collect an input fact.
 *
 * @since 0.1.0
 */
export const FactQuestionInputKind = Schema.Literals([
  "money",
  "boolean",
  "selection",
]);

/**
 * Input control category needed to collect an input fact.
 *
 * @since 0.1.0
 */
export type FactQuestionInputKind = typeof FactQuestionInputKind.Type;

/**
 * Caller-facing metadata for an input fact without coupling core to a UI.
 *
 * @since 0.1.0
 */
export class FactQuestion extends Schema.TaggedClass<FactQuestion>()(
  "FactQuestion",
  {
    helpText: Schema.optional(Schema.String),
    id: FactQuestionId,
    inputKind: FactQuestionInputKind,
    prompt: Schema.String,
  }
) {}

/**
 * Static metadata for a fact service in a rule graph.
 *
 * Descriptors are used by graph validation, docs generation, source review,
 * and caller question planning. The descriptor must match the actual
 * `Context.Service` tag supplied or derived by rule layers.
 *
 * @since 0.1.0
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
 * @since 0.1.0
 */
export const makeFactDescriptor = <Self, Shape>(args: {
  readonly id: string;
  readonly title: string;
  readonly authority: FactAuthority;
  readonly schema: Schema.Schema<Shape>;
  readonly tag: Context.Key<Self, Shape>;
  readonly question?: FactQuestion;
}): FactDescriptor<Self, Shape> => ({
  authority: args.authority,
  id: FactId.make(args.id),
  schema: args.schema,
  tag: args.tag,
  title: args.title,
  ...(args.question === undefined ? {} : { question: args.question }),
});
