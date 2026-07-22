import { Array, Schema } from "effect";

export const releaseExcerptLimit = 1024;

const CommitSha = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}$/u));
const RelativeEvidencePath = Schema.String.check(
  Schema.isPattern(/^(?!\/)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$)).+/u)
);
const Sha256 = Schema.String.check(Schema.isPattern(/^sha256:[a-f0-9]{64}$/u));
const BoundedEvidenceText = Schema.NonEmptyString.check(
  Schema.isMaxLength(4096)
);
export const ReleaseAttemptId = Schema.String.check(
  Schema.isPattern(/^release-[0-9]+$/u)
).pipe(Schema.brand("taxkit/ReleaseAttemptId"));
export type ReleaseAttemptId = typeof ReleaseAttemptId.Type;

const ReleaseNamedDigest = Schema.Struct({
  provenance: Schema.NonEmptyString,
  sha256: Sha256,
  target: RelativeEvidencePath,
});

export const ReleaseEvidenceArtifact = Schema.Struct({
  path: RelativeEvidencePath,
  sha256: Sha256,
});
export type ReleaseEvidenceArtifact = typeof ReleaseEvidenceArtifact.Type;

export const ReleaseCandidateIdentity = Schema.Struct({
  baseCommit: CommitSha,
  contentManifest: RelativeEvidencePath,
  contentSha256: Sha256,
});
export type ReleaseCandidateIdentity = typeof ReleaseCandidateIdentity.Type;

export const ReleaseCheckId = Schema.Literals([
  "verification",
  "test",
  "build",
  "docs-validation",
  "packed-artifact",
  "downstream-consumer",
  "api-smoke",
  "docs-browser",
  "changeset-status",
]);
export type ReleaseCheckId = typeof ReleaseCheckId.Type;

export const ReleaseTerminalState = Schema.Literals([
  "success",
  "non-zero-exit",
  "start-failure",
  "interrupted",
  "early-pipe-close",
  "missing-detail",
  "corrupt-detail",
  "false-success",
]);
export type ReleaseTerminalState = typeof ReleaseTerminalState.Type;

export class ReleaseCheck extends Schema.TaggedClass<ReleaseCheck>()(
  "ReleaseCheck",
  {
    args: Schema.Array(Schema.String),
    command: Schema.NonEmptyString,
    cwd: Schema.NonEmptyString,
    id: ReleaseCheckId,
    label: Schema.NonEmptyString,
  }
) {}

export class ReleaseDetailArtifact extends Schema.TaggedClass<ReleaseDetailArtifact>()(
  "ReleaseDetailArtifact",
  {
    path: RelativeEvidencePath,
    sha256: Sha256,
  }
) {}

export class ReleaseCommandOutcome extends Schema.TaggedClass<ReleaseCommandOutcome>()(
  "ReleaseCommandOutcome",
  {
    check: ReleaseCheck,
    exitCode: Schema.NullOr(Schema.Int),
    stderrDetail: Schema.NullOr(ReleaseDetailArtifact),
    stderrExcerpt: Schema.String,
    stdoutDetail: Schema.NullOr(ReleaseDetailArtifact),
    stdoutExcerpt: Schema.String,
    terminalState: ReleaseTerminalState,
  }
) {}

export class ReleaseReadinessReport extends Schema.TaggedClass<ReleaseReadinessReport>()(
  "ReleaseReadinessReport",
  {
    attemptId: ReleaseAttemptId,
    outcomes: Schema.Array(ReleaseCommandOutcome),
  }
) {}

export class CiReleaseReadinessReport extends Schema.TaggedClass<CiReleaseReadinessReport>()(
  "CiReleaseReadinessReport",
  {
    mode: Schema.Literal("ci"),
    outcomes: Schema.Array(ReleaseCommandOutcome),
  }
) {}

export const ReleaseReadinessCli = Schema.Struct({
  mode: Schema.Literals(["candidate", "ci"]),
});
export type ReleaseReadinessCli = typeof ReleaseReadinessCli.Type;

export const ReleaseAttemptReceipt = Schema.Struct({
  attemptId: ReleaseAttemptId,
  candidate: ReleaseCandidateIdentity,
  detailArtifacts: Schema.Array(ReleaseEvidenceArtifact),
  failedCheck: Schema.NullOr(ReleaseCheckId),
  lastSuccessfulCheck: Schema.NullOr(ReleaseCheckId),
  limitation: BoundedEvidenceText,
  nonClaim: BoundedEvidenceText,
  observedExitCode: Schema.NullOr(Schema.Int),
  postcondition: BoundedEvidenceText,
  provenance: BoundedEvidenceText,
  recovery: BoundedEvidenceText,
  resumeTrigger: BoundedEvidenceText,
  rollback: BoundedEvidenceText,
  schemaVersion: Schema.Literal(1),
  target: BoundedEvidenceText,
  terminalState: ReleaseTerminalState,
});
export type ReleaseAttemptReceipt = typeof ReleaseAttemptReceipt.Type;

export const ReleasePresentationConfig = Schema.Struct({
  RELEASE_ATTEMPT_PATH: RelativeEvidencePath,
  RELEASE_ATTEMPT_SHA256: Sha256,
});

const AcceptedOutcomeFields = {
  exitCode: Schema.Literal(0),
  stderr: ReleaseEvidenceArtifact,
  stdout: ReleaseEvidenceArtifact,
};

export const ReleaseAcceptedAttemptSummary = Schema.Struct({
  attemptId: ReleaseAttemptId,
  candidate: Schema.Struct({
    baseCommit: CommitSha,
    contentManifest: RelativeEvidencePath,
    contentSha256BeforeAttempt: Sha256,
  }),
  journeyEvidence: Schema.Struct({
    "taxkit-calculator-direct": Schema.Tuple([
      Schema.Literal("verification"),
      Schema.Literal("test"),
    ]),
    "taxkit-docs-runtime": Schema.Tuple([
      Schema.Literal("docs-validation"),
      Schema.Literal("docs-browser"),
    ]),
    "taxkit-http-api": Schema.Tuple([Schema.Literal("api-smoke")]),
    "taxkit-release-closure": Schema.Tuple([
      Schema.Literal("verification"),
      Schema.Literal("test"),
      Schema.Literal("build"),
      Schema.Literal("docs-validation"),
      Schema.Literal("packed-artifact"),
      Schema.Literal("downstream-consumer"),
      Schema.Literal("api-smoke"),
      Schema.Literal("docs-browser"),
      Schema.Literal("changeset-status"),
    ]),
    "taxkit-sdk-packed": Schema.Tuple([
      Schema.Literal("build"),
      Schema.Literal("packed-artifact"),
      Schema.Literal("downstream-consumer"),
    ]),
  }),
  lastSuccessfulCheck: Schema.Literal("changeset-status"),
  limitation: BoundedEvidenceText,
  nonClaim: BoundedEvidenceText,
  observedExitCode: Schema.Literal(0),
  outcomes: Schema.Tuple([
    Schema.Struct({
      ...AcceptedOutcomeFields,
      check: Schema.Literal("verification"),
    }),
    Schema.Struct({ ...AcceptedOutcomeFields, check: Schema.Literal("test") }),
    Schema.Struct({ ...AcceptedOutcomeFields, check: Schema.Literal("build") }),
    Schema.Struct({
      ...AcceptedOutcomeFields,
      check: Schema.Literal("docs-validation"),
    }),
    Schema.Struct({
      ...AcceptedOutcomeFields,
      check: Schema.Literal("packed-artifact"),
    }),
    Schema.Struct({
      ...AcceptedOutcomeFields,
      check: Schema.Literal("downstream-consumer"),
    }),
    Schema.Struct({
      ...AcceptedOutcomeFields,
      check: Schema.Literal("api-smoke"),
    }),
    Schema.Struct({
      ...AcceptedOutcomeFields,
      check: Schema.Literal("docs-browser"),
    }),
    Schema.Struct({
      ...AcceptedOutcomeFields,
      check: Schema.Literal("changeset-status"),
    }),
  ]),
  postcondition: BoundedEvidenceText,
  receiptPath: RelativeEvidencePath,
  receiptSha256: Sha256,
  rollback: BoundedEvidenceText,
  schemaVersion: Schema.Literal(1),
  taskId: Schema.Literal("HGI-203"),
  terminalState: Schema.Literal("success"),
});
export type ReleaseAcceptedAttemptSummary =
  typeof ReleaseAcceptedAttemptSummary.Type;

export const ReleasePresentationReceipt = Schema.Struct({
  attemptId: ReleaseAttemptId,
  nonClaim: BoundedEvidenceText,
  postcondition: BoundedEvidenceText,
  schemaVersion: Schema.Literal(1),
  sourceReceipt: Schema.Struct({
    path: RelativeEvidencePath,
    sha256: Sha256,
  }),
  terminalState: ReleaseTerminalState,
});
export type ReleasePresentationReceipt = typeof ReleasePresentationReceipt.Type;

const CriticalJourneyFields = {
  actorOrConsumer: Schema.NonEmptyString,
  authority: Schema.Literals(["none", "read_only", "mutation"]),
  boundary: Schema.NonEmptyString,
  environment: Schema.NonEmptyString,
  evidence: Schema.Array(Schema.NonEmptyString),
  expectedBehavior: Schema.Array(Schema.NonEmptyString),
  expectedSideEffects: Schema.Array(Schema.NonEmptyString),
  inputs: Schema.Array(Schema.NonEmptyString),
  nonClaims: Schema.Array(Schema.NonEmptyString),
  oracle: Schema.NonEmptyString,
  preservedInvariants: Schema.Array(Schema.NonEmptyString),
  startingState: Schema.NonEmptyString,
  stepsOrProcedureOwner: Schema.NonEmptyString,
};

export const ReleaseJourneyInventory = Schema.Struct({
  journeys: Schema.Tuple([
    Schema.Struct({
      ...CriticalJourneyFields,
      id: Schema.Literal("taxkit-calculator-direct"),
    }),
    Schema.Struct({
      ...CriticalJourneyFields,
      id: Schema.Literal("taxkit-sdk-packed"),
    }),
    Schema.Struct({
      ...CriticalJourneyFields,
      id: Schema.Literal("taxkit-http-api"),
    }),
    Schema.Struct({
      ...CriticalJourneyFields,
      id: Schema.Literal("taxkit-docs-runtime"),
    }),
    Schema.Struct({
      ...CriticalJourneyFields,
      id: Schema.Literal("taxkit-release-closure"),
    }),
  ]),
  owner: Schema.NonEmptyString,
  reviewTrigger: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
});
export type ReleaseJourneyInventory = typeof ReleaseJourneyInventory.Type;

const JourneyResultFields = {
  evidencePath: RelativeEvidencePath,
  status: Schema.Literals(["passed", "failed", "inconclusive"]),
};

const ReleaseJourneyResults = Schema.Tuple([
  Schema.Struct({
    ...JourneyResultFields,
    id: Schema.Literal("taxkit-calculator-direct"),
  }),
  Schema.Struct({
    ...JourneyResultFields,
    id: Schema.Literal("taxkit-sdk-packed"),
  }),
  Schema.Struct({
    ...JourneyResultFields,
    id: Schema.Literal("taxkit-http-api"),
  }),
  Schema.Struct({
    ...JourneyResultFields,
    id: Schema.Literal("taxkit-docs-runtime"),
  }),
  Schema.Struct({
    ...JourneyResultFields,
    id: Schema.Literal("taxkit-release-closure"),
  }),
]);

export const ReleaseProofPacket = Schema.Struct({
  actor: Schema.NonEmptyString,
  apiEvidence: RelativeEvidencePath,
  attempt: Schema.Struct({
    attemptId: ReleaseAttemptId,
    detailArtifacts: Schema.Array(ReleaseEvidenceArtifact),
    failedCheck: Schema.NullOr(ReleaseCheckId),
    lastSuccessfulCheck: Schema.NullOr(ReleaseCheckId),
    limitation: Schema.NonEmptyString,
    nonClaim: Schema.NonEmptyString,
    observedExitCode: Schema.NullOr(Schema.Int),
    postcondition: Schema.NonEmptyString,
    provenance: Schema.NonEmptyString,
    recovery: Schema.NonEmptyString,
    resumeTrigger: Schema.NonEmptyString,
    rollback: Schema.NonEmptyString,
    terminalState: ReleaseTerminalState,
  }),
  authority: Schema.NonEmptyString,
  buildDigests: Schema.NonEmptyArray(ReleaseNamedDigest),
  candidate: Schema.Struct({
    baseCommit: CommitSha,
    contentManifest: RelativeEvidencePath,
    contentSha256: Sha256,
    digestRecipe: Schema.NonEmptyString,
    exclusions: Schema.NonEmptyArray(RelativeEvidencePath),
  }),
  docsEvidence: RelativeEvidencePath,
  environment: Schema.NonEmptyString,
  exportDigests: Schema.NonEmptyArray(ReleaseNamedDigest),
  journeyInventory: RelativeEvidencePath,
  journeyInventorySha256: Sha256,
  journeyResults: ReleaseJourneyResults,
  lifecycle: Schema.Literals([
    "candidate",
    "inconclusive",
    "failed",
    "accepted",
  ]),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  packageDigests: Schema.NonEmptyArray(ReleaseNamedDigest),
  packedConsumerEvidence: RelativeEvidencePath,
  provenance: Schema.NonEmptyString,
  retainedEvidence: Schema.NonEmptyArray(RelativeEvidencePath),
  rollback: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  taskId: Schema.Literal("HGI-203"),
});
export type ReleaseProofPacket = typeof ReleaseProofPacket.Type;

export const makeReleaseReadinessPlan = (
  workspaceRoot: string
): readonly ReleaseCheck[] => [
  new ReleaseCheck({
    args: ["run", "verification"],
    command: "bun",
    cwd: workspaceRoot,
    id: "verification",
    label: "Canonical repository verification",
  }),
  new ReleaseCheck({
    args: ["run", "test"],
    command: "bun",
    cwd: workspaceRoot,
    id: "test",
    label: "Workspace tests including the direct calculator journey",
  }),
  new ReleaseCheck({
    args: ["run", "build"],
    command: "bun",
    cwd: workspaceRoot,
    id: "build",
    label: "Workspace production builds",
  }),
  new ReleaseCheck({
    args: ["run", "docs:validate"],
    command: "bun",
    cwd: workspaceRoot,
    id: "docs-validation",
    label: "Documentation content validation",
  }),
  new ReleaseCheck({
    args: ["run", "--filter=@taxkit/sdk", "check-packed-artifact"],
    command: "bun",
    cwd: workspaceRoot,
    id: "packed-artifact",
    label: "Focused SDK packed artifact proof",
  }),
  new ReleaseCheck({
    args: ["run", "--filter=@taxkit/sdk", "validate:downstream"],
    command: "bun",
    cwd: workspaceRoot,
    id: "downstream-consumer",
    label: "Strict downstream package proof",
  }),
  new ReleaseCheck({
    args: ["run", "--filter=api", "smoke"],
    command: "bun",
    cwd: workspaceRoot,
    id: "api-smoke",
    label: "Public API smoke evidence",
  }),
  new ReleaseCheck({
    args: ["run", "--filter=docs", "test:browser"],
    command: "bun",
    cwd: workspaceRoot,
    id: "docs-browser",
    label: "Documentation browser evidence",
  }),
  new ReleaseCheck({
    args: ["run", "changeset", "status", "--verbose"],
    command: "bun",
    cwd: workspaceRoot,
    id: "changeset-status",
    label: "Pending release train status",
  }),
];

export const renderReleaseReadinessReport = (
  report: ReleaseReadinessReport
): string =>
  Array.prepend(
    Array.map(
      report.outcomes,
      (outcome) =>
        `PASS [${outcome.check.id}] target=${outcome.check.label}; stdout=${outcome.stdoutDetail?.path ?? "none"} (${outcome.stdoutDetail?.sha256 ?? "unavailable"}); stderr=${outcome.stderrDetail?.path ?? "none"} (${outcome.stderrDetail?.sha256 ?? "unavailable"})`
    ),
    `Release readiness passed ${report.outcomes.length} ordered checks once; postcondition=local candidate checks passed; nonclaim=no publication, tag, release, deployment or provider mutation.`
  ).join("\n");
