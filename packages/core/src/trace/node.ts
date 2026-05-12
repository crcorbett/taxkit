import { Schema } from "effect";

import { IsoDate } from "../primitives/date.js";
import { RoundingMode } from "../primitives/rounding.js";

/**
 * Stable identifier for the rule that produced a trace node.
 *
 * @since 0.1.0
 */
export const RuleId = Schema.String.pipe(Schema.brand("whattax/RuleId"));

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
  Schema.brand("whattax/SourceChecksum")
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
    rowCount: Schema.Int,
    shape: Schema.String,
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

/**
 * Explanation tree for a calculated value.
 *
 * @since 0.1.0
 */
export interface TraceNode {
  readonly _tag: "TraceNode";
  readonly ruleId: RuleId;
  readonly title: string;
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly formula?: string | undefined;
  readonly result: unknown;
  readonly rounding?: RoundingMode | undefined;
  readonly sources: readonly SourceRef[];
  readonly children: readonly TraceNode[];
}

/**
 * Encoded representation of a trace node for persistence or transport.
 *
 * @since 0.1.0
 */
export interface TraceNodeEncoded {
  readonly _tag: "TraceNode";
  readonly ruleId: string;
  readonly title: string;
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly formula?: string | undefined;
  readonly result: unknown;
  readonly rounding?: typeof RoundingMode.Encoded | undefined;
  readonly sources: readonly (typeof SourceRef.Encoded)[];
  readonly children: readonly TraceNodeEncoded[];
}

/**
 * Recursive schema codec for calculation trace nodes.
 *
 * @since 0.1.0
 */
export const TraceNode: Schema.Codec<TraceNode, TraceNodeEncoded> =
  Schema.TaggedStruct("TraceNode", {
    children: Schema.Array(
      Schema.suspend((): Schema.Codec<TraceNode, TraceNodeEncoded> => TraceNode)
    ),
    formula: Schema.optional(Schema.String),
    inputs: Schema.Record(Schema.String, Schema.Unknown),
    result: Schema.Unknown,
    rounding: Schema.optional(RoundingMode),
    ruleId: RuleId,
    sources: Schema.Array(SourceRef),
    title: Schema.String,
  });
