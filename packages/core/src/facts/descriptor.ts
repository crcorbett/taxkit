import { Effect, Option, Schema } from "effect";
import type { Context } from "effect";

/**
 * Stable identifier for a fact produced or consumed by rules.
 *
 * @since 0.1.0
 */
export const FactId = Schema.String.pipe(Schema.brand("taxkit/FactId"));

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
  Schema.brand("taxkit/FactQuestionId")
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
    helpText: Schema.OptionFromOptionalKey(
      Schema.OptionFromUndefinedOr(Schema.String)
    ).pipe(Schema.withConstructorDefault(Effect.succeedNone)),
    id: FactQuestionId,
    inputKind: FactQuestionInputKind,
    prompt: Schema.String,
  }
) {}

const FactDescriptorFields = Schema.Struct({
  authority: FactAuthority,
  id: FactId,
  question: Schema.OptionFromOptional(Schema.toType(FactQuestion)).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
  title: Schema.String,
});

/**
 * Checked fact metadata with its genuine schema-to-service relation.
 * @since 0.1.0
 */
export type FactDescriptor<Self, Value> = typeof FactDescriptorFields.Type & {
  readonly schema: Schema.Schema<Value>;
  readonly tag: Context.Key<Self, Value>;
};

/**
 * Builds a fact descriptor from its owning field representation.
 * Missing and explicit undefined questions retain their old absent meaning.
 * @since 0.1.0
 */
export const makeFactDescriptor = <Self, Value>(
  args: Omit<typeof FactDescriptorFields.Encoded, "id"> & {
    readonly id: string;
    readonly schema: Schema.Schema<Value>;
    readonly tag: Context.Key<Self, Value>;
  }
): FactDescriptor<Self, Value> => ({
  ...FactDescriptorFields.make({
    authority: args.authority,
    id: FactId.make(args.id),
    question: Option.fromUndefinedOr(args.question),
    title: args.title,
  }),
  schema: args.schema,
  tag: args.tag,
});
