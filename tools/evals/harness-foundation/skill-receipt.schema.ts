import { Schema } from "effect";

// Data format for the retained July evaluation; not a current skill requirement.
const NonEmpty = Schema.NonEmptyString;

const TreeReceipt = Schema.Struct({
  entryCount: Schema.Number,
  treeDigest: NonEmpty,
});

export const CanonicalSkillBaseline = Schema.Struct({
  allowedOverlays: Schema.NonEmptyArray(
    Schema.Struct({
      owner: NonEmpty,
      path: NonEmpty,
      sha256: NonEmpty,
    })
  ),
  claudeLinks: Schema.Record(NonEmpty, NonEmpty),
  cleanCloneRule: NonEmpty,
  extras: Schema.Record(
    NonEmpty,
    Schema.Struct({
      classification: NonEmpty,
      entryCount: Schema.Number,
      owner: NonEmpty,
      scope: NonEmpty,
      treeDigest: NonEmpty,
    })
  ),
  limitations: Schema.NonEmptyArray(NonEmpty),
  nonClaims: Schema.NonEmptyArray(NonEmpty),
  observedAt: NonEmpty,
  retirementCondition: NonEmpty,
  reviewTrigger: NonEmpty,
  schemaVersion: Schema.Literal("1"),
  skills: Schema.Record(NonEmpty, TreeReceipt),
  source: Schema.Struct({
    aggregateDigest: NonEmpty,
    identityLimitation: NonEmpty,
    kind: NonEmpty,
    originalObservedAggregateDigest: NonEmpty,
    owner: NonEmpty,
    repositoryRevision: Schema.NullOr(NonEmpty),
  }),
  treeDigestAlgorithm: NonEmpty,
});
export type CanonicalSkillBaseline = typeof CanonicalSkillBaseline.Type;
