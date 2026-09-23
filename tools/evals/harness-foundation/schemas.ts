import { Schema } from "effect";

export const epochId = "HFI-004-2026-07-24";
export const migrationBaseCommit = "8695c018accf4c4abb7e803c631c5120f90e52b2";
export const candidateCommit = "7c8a96e35ed59e4f78490d229cbfdcf21ea18ec0";
export const candidateTree = "637bc0e2145ea24be7b2a72d507f9f99a43e5a72";

export const epochPaths = {
  candidate: "docs/documentation-audit/harness-foundation/epoch-candidate.json",
  independentReview:
    "docs/documentation-audit/harness-foundation/independent-review.json",
  manifest: "tools/evals/harness-foundation-source-manifest.json",
  scenarios: "tools/evals/harness-foundation-scenarios.json",
  validation:
    "docs/documentation-audit/harness-foundation/epoch-validation.json",
};

export const failedAttemptPaths = [
  "docs/documentation-audit/harness-foundation/failed-or-inconclusive/HFI-004-candidate-1.json",
  "docs/documentation-audit/harness-foundation/failed-or-inconclusive/HFI-004-candidate-2.json",
  "docs/documentation-audit/harness-foundation/failed-or-inconclusive/HFI-004-candidate-3.json",
  "docs/documentation-audit/harness-foundation/failed-or-inconclusive/HFI-004-candidate-4.json",
  "docs/documentation-audit/harness-foundation/failed-or-inconclusive/HFI-004-candidate-5.json",
] as const;

export const receiptPaths = [
  "docs/documentation-audit/harness-foundation/receipts/calculator.json",
  "docs/documentation-audit/harness-foundation/receipts/packed-sdk.json",
  "docs/documentation-audit/harness-foundation/receipts/http-api.json",
  "docs/documentation-audit/harness-foundation/receipts/docs-runtime.json",
  "docs/documentation-audit/harness-foundation/receipts/release-readiness.json",
] as const;

const NonEmpty = Schema.NonEmptyString;
const Sha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u));
const RelativePath = NonEmpty.pipe(
  Schema.check(Schema.isPattern(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/u))
);
const ObservedAt = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
);

export const JourneyId = Schema.Literals([
  "taxkit-calculator-direct",
  "taxkit-sdk-packed",
  "taxkit-http-api",
  "taxkit-docs-runtime",
  "taxkit-release-closure",
]);
export type JourneyId = typeof JourneyId.Type;

export const validationCheckNames = [
  "candidate-paths-and-preserved-surfaces",
  "source-artifacts-and-skill-projection",
  "scenarios-and-journey-receipts",
  "failed-attempts-and-independent-review",
  "clocks-limitations-and-external-nonclaims",
  "no-changeset-and-local-authority",
] as const;
const ValidationCheckName = Schema.Literals(validationCheckNames);

export const independentReviewCheckNames = [
  "exact-candidate-and-path-identity",
  "clean-clone-portability-and-governance",
  "he-mapping-and-skill-projection",
  "journeys-and-retained-failures",
  "preserved-surfaces-and-no-changeset",
  "evaluator-adversarial-and-external-nonclaims",
] as const;
const IndependentReviewCheckName = Schema.Literals(independentReviewCheckNames);

const Artifact = Schema.Struct({
  path: RelativePath,
  sha256: Sha256,
});

const Journey = Schema.Struct({
  command: NonEmpty,
  id: JourneyId,
  nonClaim: NonEmpty,
  oracle: NonEmpty,
  owner: NonEmpty,
  receipt: RelativePath,
  recovery: NonEmpty,
});

export const Scenarios = Schema.Struct({
  authority: Schema.Struct({
    mode: Schema.Literal("local-read-and-verification"),
    stopsBefore: Schema.NonEmptyArray(NonEmpty),
  }),
  epochId: Schema.Literal(epochId),
  independentReview: Schema.Struct({
    nonClaim: NonEmpty,
    owner: NonEmpty,
    resultPath: Schema.Literal(epochPaths.independentReview),
    status: Schema.Literal("pending"),
  }),
  journeys: Schema.NonEmptyArray(Journey),
  lifecycle: Schema.Literal("current-worker-visible"),
  owner: NonEmpty,
  reviewTrigger: NonEmpty,
  schemaVersion: Schema.Literal("1"),
  targetCommit: Schema.Literal(candidateCommit),
});
export type Scenarios = typeof Scenarios.Type;

export const SourceManifest = Schema.Struct({
  artifacts: Schema.NonEmptyArray(Artifact),
  candidate: Schema.Struct({
    changedPathCount: Schema.Number,
    changedPathDigest: Sha256,
    commit: Schema.Literal(candidateCommit),
    tree: Schema.Literal(candidateTree),
  }),
  circularityExclusions: Schema.NonEmptyArray(NonEmpty),
  epoch: Schema.Struct({
    host: NonEmpty,
    model: NonEmpty,
    runtime: Schema.NonEmptyArray(
      Schema.Struct({ name: NonEmpty, version: NonEmpty })
    ),
    tools: Schema.NonEmptyArray(
      Schema.Struct({
        name: NonEmpty,
        observedAt: ObservedAt,
        version: NonEmpty,
      })
    ),
    worker: NonEmpty,
  }),
  epochId: Schema.Literal(epochId),
  extras: Schema.NonEmptyArray(
    Schema.Struct({
      classification: NonEmpty,
      entryCount: Schema.Number,
      id: NonEmpty,
      treeDigest: Sha256,
    })
  ),
  limitations: Schema.NonEmptyArray(NonEmpty),
  migrationBaseCommit: Schema.Literal(migrationBaseCommit),
  nonClaims: Schema.NonEmptyArray(NonEmpty),
  overlays: Schema.NonEmptyArray(
    Schema.Struct({ path: RelativePath, sha256: Sha256 })
  ),
  schemaVersion: Schema.Literal("1"),
  skills: Schema.NonEmptyArray(
    Schema.Struct({
      entryCount: Schema.Number,
      id: NonEmpty,
      treeDigest: Sha256,
    })
  ),
});
export type SourceManifest = typeof SourceManifest.Type;

export const JourneyReceipt = Schema.Struct({
  candidateCommit: Schema.Literal(candidateCommit),
  command: NonEmpty,
  durationMs: Schema.Number,
  epochId: Schema.Literal(epochId),
  exitCode: Schema.Literal(0),
  journeyId: JourneyId,
  nonClaim: NonEmpty,
  observedAt: ObservedAt,
  oracleObserved: NonEmpty,
  recovery: NonEmpty,
  schemaVersion: Schema.Literal("1"),
  sideEffects: NonEmpty,
});
export type JourneyReceipt = typeof JourneyReceipt.Type;

export const IndependentReview = Schema.Struct({
  candidateCommit: Schema.Literal(candidateCommit),
  checks: Schema.NonEmptyArray(
    Schema.Struct({
      name: IndependentReviewCheckName,
      outcome: Schema.Literal("passed"),
      postcondition: NonEmpty,
    })
  ),
  epochId: Schema.Literal(epochId),
  findings: Schema.Array(NonEmpty),
  limitations: Schema.NonEmptyArray(NonEmpty),
  nonClaims: Schema.NonEmptyArray(NonEmpty),
  observedAt: ObservedAt,
  reviewer: Schema.Struct({
    context: NonEmpty,
    identity: NonEmpty,
    workerIndependentOf: NonEmpty,
  }),
  schemaVersion: Schema.Literal("1"),
  status: Schema.Literal("accepted"),
});
export type IndependentReview = typeof IndependentReview.Type;

const Clock = Schema.Struct({
  measurement: NonEmpty,
  reason: Schema.NullOr(NonEmpty),
  valueMs: Schema.NullOr(Schema.Number),
});

export const EpochCandidate = Schema.Struct({
  authority: Schema.Struct({
    mode: Schema.Literal("local-read-and-verification"),
    stopsBefore: Schema.NonEmptyArray(NonEmpty),
  }),
  clocks: Schema.Struct({
    acceptedOutcome: Clock,
    humanAttention: Clock,
    workerFeedback: Clock,
    workerWallClock: Clock,
  }),
  epochId: Schema.Literal(epochId),
  failedAttempts: Schema.NonEmptyArray(Artifact),
  independentReview: Artifact,
  lifecycle: Schema.Literal("qualified"),
  limitations: Schema.NonEmptyArray(NonEmpty),
  nonClaims: Schema.NonEmptyArray(NonEmpty),
  receipts: Schema.NonEmptyArray(
    Schema.Struct({ journeyId: JourneyId, path: RelativePath, sha256: Sha256 })
  ),
  rollback: NonEmpty,
  scenario: Artifact,
  schemaVersion: Schema.Literal("1"),
  sourceManifest: Artifact,
  target: Schema.Struct({
    changedPathCount: Schema.Number,
    changedPathDigest: Sha256,
    commit: Schema.Literal(candidateCommit),
    migrationBaseCommit: Schema.Literal(migrationBaseCommit),
    tree: Schema.Literal(candidateTree),
  }),
});
export type EpochCandidate = typeof EpochCandidate.Type;

export const EpochValidation = Schema.Struct({
  candidate: Artifact,
  checks: Schema.NonEmptyArray(
    Schema.Struct({
      name: ValidationCheckName,
      postcondition: NonEmpty,
      status: Schema.Literal("passed"),
    })
  ),
  epochId: Schema.Literal(epochId),
  limitations: Schema.NonEmptyArray(NonEmpty),
  noChangeset: NonEmpty,
  nonClaims: Schema.NonEmptyArray(NonEmpty),
  observedAt: ObservedAt,
  schemaVersion: Schema.Literal("1"),
  status: Schema.Literal("passed"),
});
export type EpochValidation = typeof EpochValidation.Type;

export class EpochInputError extends Schema.TaggedError<EpochInputError>()(
  "EpochInputError",
  { target: NonEmpty }
) {}

export class EpochCommandError extends Schema.TaggedError<EpochCommandError>()(
  "EpochCommandError",
  { exitCode: Schema.Number, target: NonEmpty }
) {}

export class EpochInvariantError extends Schema.TaggedError<EpochInvariantError>()(
  "EpochInvariantError",
  { invariant: NonEmpty, recovery: NonEmpty, target: NonEmpty }
) {}
