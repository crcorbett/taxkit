import { Schema } from "effect";

export const TaxJurisdiction = Schema.Literals(["AU", "US", "UK"]);
export type TaxJurisdiction = typeof TaxJurisdiction.Type;

export const TaxQuestion = Schema.Struct({
  jurisdiction: TaxJurisdiction,
  summary: Schema.String,
  topic: Schema.String,
});
export type TaxQuestion = typeof TaxQuestion.Type;

export const TaxBrief = Schema.Struct({
  headline: Schema.String,
  questions: Schema.Array(TaxQuestion),
});
export type TaxBrief = typeof TaxBrief.Type;
