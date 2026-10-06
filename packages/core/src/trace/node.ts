import { Schema } from "effect";

import { IsoDate } from "../primitives/date.js";
import { RoundingMode } from "../primitives/rounding.js";

/**
 * Stable identifier for the rule that produced a trace node.
 *
 * @since 0.1.0
 */
export const RuleId = Schema.String.pipe(Schema.brand("taxkit/RuleId"));

/**
 * Stable identifier for the rule that produced a trace node.
 *
 * @since 0.1.0
 */
export type RuleId = typeof RuleId.Type;

/**
 * Kind of authority referenced by a rule or parameter source.
 *
 * @since 0.1.0
 */
export const SourceKind = Schema.Literals([
  "ato-publication",
  "legislation",
  "regulation",
  "internal-validation",
]);

/**
 * Kind of authority referenced by a rule or parameter source.
 *
 * @since 0.1.0
 */
export type SourceKind = typeof SourceKind.Type;

/**
 * A source citation that justifies a rule or parameter value.
 * @since 0.1.0
 */
export const SourceRef = Schema.TaggedStruct("SourceRef", {
  kind: SourceKind,
  reference: Schema.String,
  title: Schema.String,
});

/**
 * A source citation that justifies a rule or parameter value.
 *
 * @since 0.1.0
 */
export type SourceRef = typeof SourceRef.Type;

/**
 * Stable checksum for an extracted official source artifact.
 *
 * @since 0.1.0
 */
export const SourceChecksum = Schema.String.pipe(
  Schema.brand("taxkit/SourceChecksum")
);

/**
 * Stable checksum for an extracted official source artifact.
 *
 * @since 0.1.0
 */
export type SourceChecksum = typeof SourceChecksum.Type;

/**
 * Metadata for the extracted rows used by a parameter table.
 *
 * @since 0.1.0
 */
export class SourceExtract extends Schema.TaggedClass<SourceExtract>()(
  "SourceExtract",
  {
    rowContract: Schema.String,
    rowCount: Schema.Int,
  }
) {}

/**
 * Canonical audit record for official parameter data.
 *
 * @since 0.1.0
 */
export class SourceArtifact extends Schema.TaggedClass<SourceArtifact>()(
  "SourceArtifact",
  {
    checksum: SourceChecksum,
    documentVersion: Schema.String,
    extract: SourceExtract,
    retrievedOn: IsoDate,
    source: SourceRef,
  }
) {}

/**
 * Brands a source artifact checksum.
 *
 * @since 0.1.0
 */
export const sourceChecksum = (value: string): SourceChecksum =>
  SourceChecksum.make(value);

// The non-recursive fields have one Schema owner. Only the children relation
// needs a local recursive annotation; its other fields are inferred here.
const TraceNodeFields = Schema.TaggedStruct("TraceNode", {
  formula: Schema.optional(Schema.String),
  inputs: Schema.Record(Schema.String, Schema.Json),
  result: Schema.Json,
  rounding: Schema.optional(RoundingMode),
  ruleId: RuleId,
  sources: Schema.Array(SourceRef),
  title: Schema.String,
});

/**
 * Explanation tree for a calculated value.
 *
 * @since 0.1.0
 */
export type TraceNode = typeof TraceNodeFields.Type & {
  readonly children: readonly TraceNode[];
};

/**
 * Encoded representation of a trace node for persistence or transport.
 *
 * @since 0.1.0
 */
export type TraceNodeEncoded = typeof TraceNodeFields.Encoded & {
  readonly children: readonly TraceNodeEncoded[];
};

/**
 * Recursive schema codec for calculation trace nodes.
 *
 * Keep children before the remaining fields to preserve historical encoding.
 *
 * @since 0.1.0
 */
export const TraceNode: Schema.Codec<TraceNode, TraceNodeEncoded> =
  Schema.TaggedStruct("TraceNode", {
    children: Schema.Array(
      Schema.suspend((): Schema.Codec<TraceNode, TraceNodeEncoded> => TraceNode)
    ),
    ...TraceNodeFields.fields,
  });
