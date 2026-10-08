import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Config, Console, Effect, Match, Option } from "effect";

import { readWorkflowReceipt } from "./workflow-check.boundary.js";
import {
  WorkflowCheckInputError,
  WorkflowCheckMismatchError,
  WorkflowInputCheckConfig,
} from "./workflow-check.schemas.js";
import { DeploymentWorkflowInputReadback } from "./workflow-receipts.schemas.js";

const check = "workflow-input" as const;

export const checkWorkflowInput = Effect.gen(function* workflowInputCheck() {
  const config = yield* Config.schema(WorkflowInputCheckConfig).pipe(
    Effect.mapError(
      () => new WorkflowCheckInputError({ check, target: "environment" })
    )
  );
  const input = yield* readWorkflowReceipt(
    check,
    config.TAXKIT_WORKFLOW_INPUT_RECEIPT,
    "input-receipt",
    DeploymentWorkflowInputReadback
  );
  const expectedPrNumber = Option.fromNullishOr(
    config.TAXKIT_WORKFLOW_INPUT_PR_NUMBER
  ).pipe(
    Option.filter((value) => value !== ""),
    Option.getOrNull
  );
  if (
    input.candidateCommit !== config.TAXKIT_WORKFLOW_INPUT_CANDIDATE_COMMIT ||
    input.workflowCommit !== config.TAXKIT_WORKFLOW_INPUT_WORKFLOW_COMMIT ||
    input.workflowRunId !== config.TAXKIT_WORKFLOW_INPUT_RUN_ID ||
    input.workflowPath !== config.TAXKIT_WORKFLOW_INPUT_WORKFLOW_PATH ||
    input.operation !== config.TAXKIT_WORKFLOW_INPUT_OPERATION ||
    input.prNumber !== expectedPrNumber
  ) {
    return yield* new WorkflowCheckMismatchError({
      check,
      invariant: "source-run-operation-candidate",
    });
  }

  yield* Console.log(
    `Docs deployment workflow input: candidate=${config.TAXKIT_WORKFLOW_INPUT_CANDIDATE_COMMIT}; workflow=${config.TAXKIT_WORKFLOW_INPUT_WORKFLOW_COMMIT}; run=${config.TAXKIT_WORKFLOW_INPUT_RUN_ID}; operation=${config.TAXKIT_WORKFLOW_INPUT_OPERATION}; source=refs/heads/main.`
  );
});

const program = checkWorkflowInput.pipe(
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
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
