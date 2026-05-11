import { Schema } from "effect";

import { RoundingMode } from "../primitives/rounding.js";

export const RuleId = Schema.String.pipe(Schema.brand("whattax/RuleId"));
export type RuleId = typeof RuleId.Type;

export const SourceKind = Schema.Literals([
  "ato-publication",
  "legislation",
  "regulation",
  "internal-validation",
]);
export type SourceKind = typeof SourceKind.Type;

export const SourceRef = Schema.TaggedStruct("SourceRef", {
  kind: SourceKind,
  title: Schema.String,
  reference: Schema.String,
});
export type SourceRef = typeof SourceRef.Type;

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

export const TraceNode: Schema.Codec<TraceNode, TraceNodeEncoded> =
  Schema.TaggedStruct("TraceNode", {
    ruleId: RuleId,
    title: Schema.String,
    inputs: Schema.Record(Schema.String, Schema.Unknown),
    formula: Schema.optional(Schema.String),
    result: Schema.Unknown,
    rounding: Schema.optional(RoundingMode),
    sources: Schema.Array(SourceRef),
    children: Schema.Array(
      Schema.suspend((): Schema.Codec<TraceNode, TraceNodeEncoded> => TraceNode)
    ),
  });
