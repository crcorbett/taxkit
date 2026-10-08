import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Config, Console, Effect, Match } from "effect";

import { DeploymentPlanReceipt } from "./schemas.js";
import {
  readWorkflowReceipt,
  workflowSha256,
} from "./workflow-check.boundary.js";
import {
  WorkflowCheckInputError,
  WorkflowCheckMismatchError,
  WorkflowPlanCheckConfig,
} from "./workflow-check.schemas.js";
import { stringifyWorkflowPlanProjection } from "./workflow-plan-projection.js";

const check = "workflow-plan" as const;

export const checkWorkflowPlan = Effect.gen(function* workflowPlanCheck() {
  const config = yield* Config.schema(WorkflowPlanCheckConfig).pipe(
    Effect.mapError(
      () => new WorkflowCheckInputError({ check, target: "environment" })
    )
  );
  const plan = yield* readWorkflowReceipt(
    check,
    config.TAXKIT_WORKFLOW_PLAN_RECEIPT,
    "plan-receipt",
    DeploymentPlanReceipt
  );
  const { projection } = plan;
  const encoded = yield* stringifyWorkflowPlanProjection(projection).pipe(
    Effect.mapError(
      () => new WorkflowCheckInputError({ check, target: "plan-projection" })
    )
  );
  const projectionDigest = yield* workflowSha256(check, encoded);
  const requireReplan = config.TAXKIT_WORKFLOW_PLAN_REQUIRE_REPLAN === "1";

  if (
    plan.acceptedPlanSha256 !== config.TAXKIT_WORKFLOW_PLAN_SHA256 ||
    plan.operation !== config.TAXKIT_WORKFLOW_PLAN_OPERATION ||
    projectionDigest !== config.TAXKIT_WORKFLOW_PLAN_SHA256 ||
    plan.projection.candidate.exactCommit !==
      config.TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT ||
    plan.projection.stage !== config.TAXKIT_WORKFLOW_PLAN_STAGE ||
    (requireReplan && plan.replanSha256 !== config.TAXKIT_WORKFLOW_PLAN_SHA256)
  ) {
    return yield* new WorkflowCheckMismatchError({
      check,
      invariant: "identity-projection-equal-replan",
    });
  }

  yield* Console.log(
    `Docs deployment workflow plan: operation=${config.TAXKIT_WORKFLOW_PLAN_OPERATION}; candidate=${config.TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT}; stage=${config.TAXKIT_WORKFLOW_PLAN_STAGE}; digest=${config.TAXKIT_WORKFLOW_PLAN_SHA256}; schema=${plan.schemaVersion}; equalReplan=${plan.replanSha256 !== null}.`
  );
});

const program = checkWorkflowPlan.pipe(
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
