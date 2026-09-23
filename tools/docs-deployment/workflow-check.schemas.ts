import { DocsDeploymentStage } from "@taxkit/infrastructure/stage";
import { Schema } from "effect";

export const WorkflowCheckName = Schema.Literals([
  "workflow-input",
  "workflow-plan",
  "workflow-proof",
  "workflow-run",
  "workflow-teardown-proof",
]);
export type WorkflowCheckName = typeof WorkflowCheckName.Type;

const CommitSha = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}$/u));
const Sha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u));
const WorkflowRunId = Schema.String.check(Schema.isPattern(/^[1-9]\d*$/u));
const PositivePrNumberFromString = Schema.NumberFromString.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThan(0))
);

export const WorkflowInputCheckConfig = Schema.Struct({
  TAXKIT_WORKFLOW_INPUT_CANDIDATE_COMMIT: CommitSha,
  TAXKIT_WORKFLOW_INPUT_OPERATION: Schema.Literals([
    "deploy",
    "destroy",
    "plan",
    "report",
    "rollback",
  ]),
  TAXKIT_WORKFLOW_INPUT_PR_NUMBER: Schema.optional(
    Schema.Union([Schema.Literal(""), PositivePrNumberFromString])
  ),
  TAXKIT_WORKFLOW_INPUT_RECEIPT: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_INPUT_RUN_ID: WorkflowRunId,
  TAXKIT_WORKFLOW_INPUT_WORKFLOW_COMMIT: CommitSha,
  TAXKIT_WORKFLOW_INPUT_WORKFLOW_PATH: Schema.NonEmptyString,
});

export const WorkflowPlanCheckConfig = Schema.Struct({
  TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT: CommitSha,
  TAXKIT_WORKFLOW_PLAN_OPERATION: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_PLAN_RECEIPT: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_PLAN_REQUIRE_REPLAN: Schema.optional(Schema.Literal("1")),
  TAXKIT_WORKFLOW_PLAN_SHA256: Sha256,
  TAXKIT_WORKFLOW_PLAN_STAGE: DocsDeploymentStage,
});

export const WorkflowProofCheckConfig = Schema.Struct({
  TAXKIT_WORKFLOW_CANDIDATE_COMMIT: CommitSha,
  TAXKIT_WORKFLOW_HOSTED_PROBE: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_PLAN_SHA256: Sha256,
  TAXKIT_WORKFLOW_PROVIDER_READBACK: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_SCREENSHOT_ROOT: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_STAGE: DocsDeploymentStage,
});

export const WorkflowRunCheckConfig = Schema.Struct({
  TAXKIT_WORKFLOW_RUN_CANDIDATE_COMMIT: CommitSha,
  TAXKIT_WORKFLOW_RUN_EVENT: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_RUN_HEAD_BRANCH: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_RUN_HEAD_SHA: CommitSha,
  TAXKIT_WORKFLOW_RUN_ID: WorkflowRunId,
  TAXKIT_WORKFLOW_RUN_RECEIPT: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_RUN_WORKFLOW_COMMIT: CommitSha,
  TAXKIT_WORKFLOW_RUN_WORKFLOW_NAME: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_RUN_WORKFLOW_PATH: Schema.NonEmptyString,
});

export const WorkflowTeardownProofCheckConfig = Schema.Struct({
  TAXKIT_WORKFLOW_CANDIDATE_COMMIT: CommitSha,
  TAXKIT_WORKFLOW_STAGE: DocsDeploymentStage,
  TAXKIT_WORKFLOW_TEARDOWN_READBACK: Schema.NonEmptyString,
});

export class WorkflowCheckInputError extends Schema.TaggedError<WorkflowCheckInputError>()(
  "WorkflowCheckInputError",
  {
    check: WorkflowCheckName,
    target: Schema.NonEmptyString,
  }
) {}

export class WorkflowCheckReadError extends Schema.TaggedError<WorkflowCheckReadError>()(
  "WorkflowCheckReadError",
  {
    check: WorkflowCheckName,
    operation: Schema.NonEmptyString,
  }
) {}

export class WorkflowCheckMismatchError extends Schema.TaggedError<WorkflowCheckMismatchError>()(
  "WorkflowCheckMismatchError",
  {
    check: WorkflowCheckName,
    invariant: Schema.NonEmptyString,
  }
) {}
