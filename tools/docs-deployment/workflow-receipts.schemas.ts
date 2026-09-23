import { DocsDeploymentStage } from "@taxkit/infrastructure/stage";
import { Schema } from "effect";

import type { DeploymentPlanReceipt } from "./schemas.js";

const CommitSha = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}$/u));
const Sha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u));
const ProviderIdentity = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9._:/-]+$/u)
);
const CloudflareAccountId = Schema.String.check(
  Schema.isPattern(/^[a-f0-9]{32}$/u)
);
const PositivePrNumber = Schema.Int.check(Schema.isGreaterThan(0));
const WorkersDevUrl = Schema.String.check(
  Schema.isPattern(/^https:\/\/[^/]+\.workers\.dev\/?$/u)
);
const ReceiptPath = Schema.String.check(
  Schema.isPattern(
    /^docs\/evidence\/deployments\/(?!.*\.\.(?:\/|$))[A-Za-z0-9._/-]+$/u
  )
);
const WorkflowRunId = Schema.String.check(Schema.isPattern(/^[1-9]\d*$/u));

export const DeploymentWorkflowInputReadback = Schema.Struct({
  candidateCommit: CommitSha,
  operation: Schema.Literals([
    "deploy",
    "destroy",
    "plan",
    "report",
    "rollback",
  ]),
  prNumber: Schema.NullOr(PositivePrNumber),
  sourceRef: Schema.Literal("refs/heads/main"),
  workflowCommit: CommitSha,
  workflowName: Schema.NonEmptyString,
  workflowPath: Schema.NonEmptyString,
  workflowRunId: WorkflowRunId,
});
export type DeploymentWorkflowInputReadback =
  typeof DeploymentWorkflowInputReadback.Type;

export const DeploymentWorkflowRunReadback = Schema.Struct({
  candidateCommit: CommitSha,
  conclusion: Schema.Literal("success"),
  event: Schema.NonEmptyString,
  headBranch: Schema.NonEmptyString,
  headSha: CommitSha,
  path: Schema.NonEmptyString,
  ref: Schema.Literal("refs/heads/main"),
  status: Schema.Literal("completed"),
  workflowCommit: CommitSha,
  workflowName: Schema.NonEmptyString,
  workflowRunId: WorkflowRunId,
});
export type DeploymentWorkflowRunReadback =
  typeof DeploymentWorkflowRunReadback.Type;

export const DeploymentWorkflowProviderReadback = Schema.Struct({
  acceptedPlanSha256: Sha256,
  accountId: CloudflareAccountId,
  candidateCommit: CommitSha,
  configSha256: Sha256,
  deploymentId: ProviderIdentity,
  deploymentInputSha256: Sha256,
  lockfileSha256: Sha256,
  previewPrNumber: Schema.NullOr(PositivePrNumber),
  previousVersionId: Schema.NullOr(ProviderIdentity),
  rollbackRecoveryIdentity: Schema.NullOr(Schema.NonEmptyString),
  schemaVersion: Schema.Literal(1),
  stage: DocsDeploymentStage,
  stateStoreId: Schema.NonEmptyString,
  url: WorkersDevUrl,
  versionId: ProviderIdentity,
  workerName: ProviderIdentity,
});
export type DeploymentWorkflowProviderReadback =
  typeof DeploymentWorkflowProviderReadback.Type;

const WorkflowScreenshot = Schema.Struct({
  kind: Schema.Literals(["desktop", "mobile"]),
  path: Schema.String.check(
    Schema.isPattern(
      /^docs\/evidence\/deployments\/(?!.*\.\.(?:\/|$))[A-Za-z0-9._/-]+$/u
    )
  ),
  sha256: Sha256,
  viewport: Schema.Struct({
    deviceScaleFactor: Schema.Number,
    height: Schema.Int,
    width: Schema.Int,
  }),
});

export const DeploymentWorkflowHostedProbe = Schema.Struct({
  acceptedPlanSha256: Sha256,
  accountId: CloudflareAccountId,
  candidateCommit: CommitSha,
  configSha256: Sha256,
  deploymentId: ProviderIdentity,
  deploymentInputSha256: Sha256,
  diagnostics: Schema.Array(Schema.String),
  environment: Schema.Literals(["preview", "production", "rollback"]),
  lockfileSha256: Sha256,
  previewPrNumber: Schema.NullOr(PositivePrNumber),
  previousVersionId: Schema.NullOr(ProviderIdentity),
  rollbackRecoveryIdentity: Schema.NonEmptyString,
  screenshots: Schema.Tuple([WorkflowScreenshot, WorkflowScreenshot]),
  stage: DocsDeploymentStage,
  stateStoreId: Schema.NonEmptyString,
  url: WorkersDevUrl,
  versionId: ProviderIdentity,
  workerName: ProviderIdentity,
});
export type DeploymentWorkflowHostedProbe =
  typeof DeploymentWorkflowHostedProbe.Type;

export const DeploymentWorkflowTeardownReadback = Schema.Struct({
  accountId: CloudflareAccountId,
  candidateCommit: CommitSha,
  configSha256: Sha256,
  deploymentInputSha256: Sha256,
  formerWorkerName: Schema.NullOr(ProviderIdentity),
  formerWorkerUrl: Schema.NullOr(WorkersDevUrl),
  lockfileSha256: Sha256,
  preexistingStage: Schema.Boolean,
  providerWorkerAbsent: Schema.Literal(true),
  schemaVersion: Schema.Literal(1),
  stage: Schema.String.check(Schema.isPattern(/^pr-[1-9]\d*$/u)),
  stateStageAbsent: Schema.Literal(true),
  stateStoreId: Schema.NonEmptyString,
});
export type DeploymentWorkflowTeardownReadback =
  typeof DeploymentWorkflowTeardownReadback.Type;

export const DeploymentWorkflowExternalReceipt = Schema.Struct({
  acceptedPlanSha256: Schema.NullOr(Sha256),
  accountId: Schema.NullOr(CloudflareAccountId),
  automationId: Schema.Literals([
    "docs-preview-delivery",
    "docs-production-delivery",
    "docs-preview-teardown",
    "docs-orphan-inventory",
  ]),
  candidateCommit: CommitSha,
  configSha256: Schema.NullOr(Sha256),
  deploymentInputSha256: Schema.NullOr(Sha256),
  environment: Schema.Literals([
    "taxkit-docs-preview",
    "taxkit-docs-production",
    "taxkit-docs-preview-teardown",
    "github-actions-report-only",
  ]),
  hostedProofPath: Schema.NullOr(ReceiptPath),
  lockGroup: Schema.NonEmptyString,
  lockfileSha256: Schema.NullOr(Sha256),
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operation: Schema.Literals([
    "preview-deploy",
    "production-deploy",
    "production-rollback",
    "preview-destroy",
    "orphan-inventory-read",
  ]),
  planPath: Schema.NullOr(ReceiptPath),
  postcondition: Schema.NonEmptyString,
  previousVersionId: Schema.NullOr(ProviderIdentity),
  principal: Schema.NonEmptyString,
  providerReadbackPath: Schema.NullOr(ReceiptPath),
  reportPath: Schema.NullOr(ReceiptPath),
  rollbackRecoveryIdentity: Schema.NullOr(Schema.NonEmptyString),
  schemaVersion: Schema.Literal(1),
  stage: DocsDeploymentStage,
  workflowCommit: CommitSha,
  workflowInputPath: ReceiptPath,
  workflowPath: Schema.NonEmptyString,
  workflowReceiptPath: ReceiptPath,
  workflowRunId: WorkflowRunId,
  workflowRunPath: ReceiptPath,
});
export type DeploymentWorkflowExternalReceipt =
  typeof DeploymentWorkflowExternalReceipt.Type;

export interface DeploymentWorkflowExternalEvidence {
  readonly hosted: DeploymentWorkflowHostedProbe | null;
  readonly plan: DeploymentPlanReceipt | null;
  readonly provider:
    | DeploymentWorkflowProviderReadback
    | DeploymentWorkflowTeardownReadback
    | null;
  readonly receipt: DeploymentWorkflowExternalReceipt;
  readonly workflowInput: DeploymentWorkflowInputReadback | null;
  readonly workflowRun: DeploymentWorkflowRunReadback | null;
}
