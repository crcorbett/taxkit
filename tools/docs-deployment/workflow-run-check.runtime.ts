import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Config, Console, Effect, Match } from "effect";

import { readWorkflowReceipt } from "./workflow-check.boundary.js";
import {
  WorkflowCheckInputError,
  WorkflowCheckMismatchError,
  WorkflowRunCheckConfig,
} from "./workflow-check.schemas.js";
import { DeploymentWorkflowRunReadback } from "./workflow-receipts.schemas.js";

const check = "workflow-run" as const;

export const checkWorkflowRun = Effect.gen(function* workflowRunCheck() {
  const config = yield* Config.schema(WorkflowRunCheckConfig).pipe(
    Effect.mapError(
      () => new WorkflowCheckInputError({ check, target: "environment" })
    )
  );
  const receipt = yield* readWorkflowReceipt(
    check,
    config.TAXKIT_WORKFLOW_RUN_RECEIPT,
    "run-receipt",
    DeploymentWorkflowRunReadback
  );

  if (
    receipt.candidateCommit !== config.TAXKIT_WORKFLOW_RUN_CANDIDATE_COMMIT ||
    receipt.workflowCommit !== config.TAXKIT_WORKFLOW_RUN_WORKFLOW_COMMIT ||
    receipt.workflowRunId !== config.TAXKIT_WORKFLOW_RUN_ID ||
    receipt.path !== config.TAXKIT_WORKFLOW_RUN_WORKFLOW_PATH ||
    receipt.workflowName !== config.TAXKIT_WORKFLOW_RUN_WORKFLOW_NAME ||
    receipt.event !== config.TAXKIT_WORKFLOW_RUN_EVENT ||
    receipt.headBranch !== config.TAXKIT_WORKFLOW_RUN_HEAD_BRANCH ||
    receipt.headSha !== config.TAXKIT_WORKFLOW_RUN_HEAD_SHA ||
    receipt.ref !== "refs/heads/main" ||
    receipt.status !== "completed" ||
    receipt.conclusion !== "success"
  ) {
    return yield* Effect.fail(
      new WorkflowCheckMismatchError({
        check,
        invariant: "completed-source-run",
      })
    );
  }

  const teardown = config.TAXKIT_WORKFLOW_RUN_WORKFLOW_PATH.endsWith(
    "docs-preview-teardown.yml"
  );
  const allowedEvent = teardown
    ? config.TAXKIT_WORKFLOW_RUN_EVENT === "pull_request" ||
      config.TAXKIT_WORKFLOW_RUN_EVENT === "workflow_dispatch"
    : config.TAXKIT_WORKFLOW_RUN_EVENT === "workflow_dispatch";
  if (
    !allowedEvent ||
    (!teardown &&
      (config.TAXKIT_WORKFLOW_RUN_HEAD_BRANCH !== "main" ||
        config.TAXKIT_WORKFLOW_RUN_HEAD_SHA !==
          config.TAXKIT_WORKFLOW_RUN_WORKFLOW_COMMIT))
  ) {
    return yield* Effect.fail(
      new WorkflowCheckMismatchError({
        check,
        invariant: "allowed-source-event-identity",
      })
    );
  }

  yield* Console.log(
    `Docs deployment workflow run: candidate=${config.TAXKIT_WORKFLOW_RUN_CANDIDATE_COMMIT}; workflow=${config.TAXKIT_WORKFLOW_RUN_WORKFLOW_COMMIT}; run=${config.TAXKIT_WORKFLOW_RUN_ID}; path=${config.TAXKIT_WORKFLOW_RUN_WORKFLOW_PATH}; conclusion=success.`
  );
});

const program = checkWorkflowRun.pipe(
  Effect.tapErrorTag("WorkflowCheckInputError", (error) =>
    Console.error(`FAIL [${error.check}] input=${error.target}`)
  ),
  Effect.tapErrorTag("WorkflowCheckReadError", (error) =>
    Console.error(`FAIL [${error.check}] operation=${error.operation}`)
  ),
  Effect.tapErrorTag("WorkflowCheckMismatchError", (error) =>
    Console.error(`FAIL [${error.check}] invariant=${error.invariant}`)
  ),
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(program, { disableErrorReporting: true })
  ),
  Match.orElse(() => false)
);
