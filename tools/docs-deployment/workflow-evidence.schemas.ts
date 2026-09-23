import { DocsDeploymentStage } from "@taxkit/infrastructure/stage";
import { Schema } from "effect";

const WorkflowEvidenceCommitSha = Schema.String.check(
  Schema.isPattern(/^[a-f0-9]{40}$/u)
);
const WorkflowEvidenceSha256 = Schema.String.check(
  Schema.isPattern(/^[a-f0-9]{64}$/u)
);
const WorkflowRunId = Schema.String.check(Schema.isPattern(/^[1-9]\d*$/u));
const PositivePrNumberFromString = Schema.NumberFromString.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThan(0))
);
export const WorkflowEvidenceProviderIdentity = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9._:/-]+$/u)
);

const WorkflowEvidenceMode = Schema.Literals([
  "bootstrap",
  "plan",
  "provider",
  "replan",
]);
type WorkflowEvidenceMode = typeof WorkflowEvidenceMode.Type;

export const WorkflowEvidenceModeConfig = Schema.Struct({
  TAXKIT_WORKFLOW_EVIDENCE_MODE: WorkflowEvidenceMode,
});

export const WorkflowEvidenceBootstrapConfig = Schema.Struct({
  TAXKIT_WORKFLOW_EVIDENCE_BOOTSTRAP_PATH: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT: WorkflowEvidenceCommitSha,
  TAXKIT_WORKFLOW_EVIDENCE_RUN_ID: WorkflowRunId,
  TAXKIT_WORKFLOW_EVIDENCE_STAGE: DocsDeploymentStage,
});
export type WorkflowEvidenceBootstrapConfig =
  typeof WorkflowEvidenceBootstrapConfig.Type;

const PlanConfigFields = {
  TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT: WorkflowEvidenceCommitSha,
  TAXKIT_WORKFLOW_EVIDENCE_IDENTITY_PATH: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_EVIDENCE_PLAN_PATH: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_EVIDENCE_PLAN_TEXT_PATH: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_EVIDENCE_PROJECTION_PATH: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_EVIDENCE_REPOSITORY_ROOT: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_EVIDENCE_STAGE: DocsDeploymentStage,
} as const;

export const WorkflowEvidencePlanConfig = Schema.Struct({
  ...PlanConfigFields,
  TAXKIT_WORKFLOW_EVIDENCE_ACCEPTED_BY: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_EVIDENCE_GITHUB_OUTPUT_PATH: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_EVIDENCE_OPERATION: Schema.Literals([
    "preview-plan",
    "production-plan",
  ]),
  TAXKIT_WORKFLOW_EVIDENCE_RECEIPT_PATH: Schema.String.check(
    Schema.isPattern(
      /^docs\/evidence\/deployments\/(?!.*\.\.(?:\/|$))[A-Za-z0-9._/-]+$/u
    )
  ),
});
export type WorkflowEvidencePlanConfig = typeof WorkflowEvidencePlanConfig.Type;

export const WorkflowEvidenceReplanConfig = Schema.Struct({
  ...PlanConfigFields,
  TAXKIT_WORKFLOW_EVIDENCE_OPERATION: Schema.Literals([
    "preview-equal-replan",
    "production-equal-replan",
  ]),
});
export type WorkflowEvidenceReplanConfig =
  typeof WorkflowEvidenceReplanConfig.Type;

export const WorkflowEvidenceProviderConfig = Schema.Struct({
  TAXKIT_WORKFLOW_EVIDENCE_ACCEPTED_PLAN_SHA256: Schema.optional(
    WorkflowEvidenceSha256
  ),
  TAXKIT_WORKFLOW_EVIDENCE_ACCOUNT_ID: Schema.optional(
    Schema.String.check(Schema.isPattern(/^[a-f0-9]{32}$/u))
  ),
  TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT: Schema.optional(
    WorkflowEvidenceCommitSha
  ),
  TAXKIT_WORKFLOW_EVIDENCE_CURRENT_DEPLOYMENTS_PATH: Schema.optional(
    Schema.NonEmptyString
  ),
  TAXKIT_WORKFLOW_EVIDENCE_ENVIRONMENT: Schema.optional(
    Schema.Literals(["preview", "production", "rollback"])
  ),
  TAXKIT_WORKFLOW_EVIDENCE_GITHUB_ENV_PATH: Schema.optional(
    Schema.NonEmptyString
  ),
  TAXKIT_WORKFLOW_EVIDENCE_GITHUB_OUTPUT_PATH: Schema.optional(
    Schema.NonEmptyString
  ),
  TAXKIT_WORKFLOW_EVIDENCE_IDENTITY_PATH: Schema.optional(
    Schema.NonEmptyString
  ),
  TAXKIT_WORKFLOW_EVIDENCE_INVENTORY_PATH: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_EVIDENCE_PHASE: Schema.Literals(["after", "before"]),
  TAXKIT_WORKFLOW_EVIDENCE_PREVIEW_PR_NUMBER: Schema.optional(
    Schema.Union([Schema.Literal(""), PositivePrNumberFromString])
  ),
  TAXKIT_WORKFLOW_EVIDENCE_PREVIOUS_DEPLOYMENTS_PATH: Schema.optional(
    Schema.Union([Schema.Literal(""), Schema.NonEmptyString])
  ),
  TAXKIT_WORKFLOW_EVIDENCE_PROVIDER_READBACK_PATH: Schema.optional(
    Schema.NonEmptyString
  ),
  TAXKIT_WORKFLOW_EVIDENCE_ROLLBACK_IDENTITY: Schema.optional(
    WorkflowEvidenceProviderIdentity
  ),
  TAXKIT_WORKFLOW_EVIDENCE_RUN_ID: Schema.optional(WorkflowRunId),
  TAXKIT_WORKFLOW_EVIDENCE_STAGE: DocsDeploymentStage,
});
export type WorkflowEvidenceProviderConfig =
  typeof WorkflowEvidenceProviderConfig.Type;

export const WorkflowEvidenceIdentity = Schema.Struct({
  candidateCommit: WorkflowEvidenceCommitSha,
  configSha256: WorkflowEvidenceSha256,
  deploymentInputSha256: WorkflowEvidenceSha256,
  lockfileSha256: WorkflowEvidenceSha256,
  schemaVersion: Schema.Literal(1),
});
export type WorkflowEvidenceIdentity = typeof WorkflowEvidenceIdentity.Type;

export const WorkflowBootstrapReceipt = Schema.Struct({
  alchemySourceCommit: Schema.Literal(
    "473c39591c7993a708199d0ef8f0d38416885dde"
  ),
  alchemyVersion: Schema.Literal("2.0.0-beta.79"),
  allowedEffects: Schema.Tuple([
    Schema.Literal("credential-refresh"),
    Schema.Literal("edge-preview-secret-read"),
    Schema.Literal("state-store-create-or-upgrade"),
  ]),
  candidateCommit: WorkflowEvidenceCommitSha,
  limitations: Schema.Tuple([
    Schema.Literal(
      "This receipt records the allowed beta.79 bootstrap effects, not which provider mutations occurred."
    ),
    Schema.Literal(
      "State-store facts before and after bootstrap were not independently read back in this step."
    ),
  ]),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  result: Schema.Literal("bootstrap-command-completed"),
  schemaVersion: Schema.Literal(1),
  stage: DocsDeploymentStage,
  stateStoreAfter: Schema.Literal("not-observed"),
  stateStoreBefore: Schema.Literal("not-observed"),
  workflowRunId: WorkflowRunId,
});
export type WorkflowBootstrapReceipt = typeof WorkflowBootstrapReceipt.Type;

const WranglerDeployment = Schema.Struct({
  deployment_id: Schema.optional(WorkflowEvidenceProviderIdentity),
  id: Schema.optional(WorkflowEvidenceProviderIdentity),
  versions: Schema.NonEmptyArray(
    Schema.Struct({
      version_id: WorkflowEvidenceProviderIdentity,
    })
  ),
});

export const WranglerDeployments = Schema.NonEmptyArray(WranglerDeployment);
export type WranglerDeployments = typeof WranglerDeployments.Type;

export class WorkflowEvidenceConfigError extends Schema.TaggedError<WorkflowEvidenceConfigError>()(
  "WorkflowEvidenceConfigError",
  {
    mode: Schema.optional(WorkflowEvidenceMode),
    requirement: Schema.NonEmptyString,
  }
) {}

export class WorkflowEvidenceInputReadError extends Schema.TaggedError<WorkflowEvidenceInputReadError>()(
  "WorkflowEvidenceInputReadError",
  {
    role: Schema.NonEmptyString,
  }
) {}

export class WorkflowEvidencePlanProjectionError extends Schema.TaggedError<WorkflowEvidencePlanProjectionError>()(
  "WorkflowEvidencePlanProjectionError",
  {
    operation: Schema.NonEmptyString,
  }
) {}

export class WorkflowEvidenceProviderDecodeError extends Schema.TaggedError<WorkflowEvidenceProviderDecodeError>()(
  "WorkflowEvidenceProviderDecodeError",
  {
    role: Schema.NonEmptyString,
  }
) {}

export class WorkflowEvidenceReceiptWriteError extends Schema.TaggedError<WorkflowEvidenceReceiptWriteError>()(
  "WorkflowEvidenceReceiptWriteError",
  {
    role: Schema.NonEmptyString,
  }
) {}
