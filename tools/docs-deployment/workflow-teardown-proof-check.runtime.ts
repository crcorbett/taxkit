import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Config, Console, Effect, Match } from "effect";

import { readWorkflowReceipt } from "./workflow-check.boundary.js";
import {
  WorkflowCheckInputError,
  WorkflowCheckMismatchError,
  WorkflowTeardownProofCheckConfig,
} from "./workflow-check.schemas.js";
import { DeploymentWorkflowTeardownReadback } from "./workflow-receipts.schemas.js";

const check = "workflow-teardown-proof" as const;

export const checkWorkflowTeardownProof = Effect.gen(
  function* workflowTeardownProofCheck() {
    const config = yield* Config.schema(WorkflowTeardownProofCheckConfig).pipe(
      Effect.mapError(
        () => new WorkflowCheckInputError({ check, target: "environment" })
      )
    );
    const readback = yield* readWorkflowReceipt(
      check,
      config.TAXKIT_WORKFLOW_TEARDOWN_READBACK,
      "teardown-readback",
      DeploymentWorkflowTeardownReadback
    );

    if (
      readback.candidateCommit !== config.TAXKIT_WORKFLOW_CANDIDATE_COMMIT ||
      readback.stage !== config.TAXKIT_WORKFLOW_STAGE ||
      !readback.stateStageAbsent ||
      !readback.providerWorkerAbsent
    ) {
      return yield* Effect.fail(
        new WorkflowCheckMismatchError({
          check,
          invariant: "exact-stage-state-provider-absence",
        })
      );
    }

    yield* Console.log(
      `Docs deployment teardown proof: candidate=${config.TAXKIT_WORKFLOW_CANDIDATE_COMMIT}; stage=${config.TAXKIT_WORKFLOW_STAGE}; state/provider absence agree.`
    );
  }
);

const program = checkWorkflowTeardownProof.pipe(
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
