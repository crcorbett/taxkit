import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Config, Console, Effect, Match, Schema } from "effect";

import {
  writeBootstrapWorkflowEvidence,
  writeInitialWorkflowEvidence,
  writeProviderWorkflowEvidence,
  writeReplanWorkflowEvidence,
} from "./workflow-evidence.js";
import {
  WorkflowEvidenceBootstrapConfig,
  WorkflowEvidenceConfigError,
  WorkflowEvidenceModeConfig,
  WorkflowEvidencePlanConfig,
  WorkflowEvidenceProviderConfig,
  WorkflowEvidenceReplanConfig,
} from "./workflow-evidence.schemas.js";

const loadConfig = <A>(
  schema: Parameters<typeof Config.schema<A>>[0],
  mode: "bootstrap" | "plan" | "provider" | "replan"
) =>
  Config.schema(schema).pipe(
    Effect.mapError(
      () =>
        new WorkflowEvidenceConfigError({
          mode,
          requirement: `${mode}-configuration`,
        })
    )
  );

export const runWorkflowEvidence = Effect.gen(function* workflowEvidence() {
  const { TAXKIT_WORKFLOW_EVIDENCE_MODE: mode } = yield* Config.schema(
    WorkflowEvidenceModeConfig
  ).pipe(
    Effect.mapError(
      () =>
        new WorkflowEvidenceConfigError({
          requirement: "closed-command-mode",
        })
    )
  );

  return yield* Match.value(mode).pipe(
    Match.when("bootstrap", () =>
      loadConfig(WorkflowEvidenceBootstrapConfig, "bootstrap").pipe(
        Effect.flatMap(writeBootstrapWorkflowEvidence)
      )
    ),
    Match.when("plan", () =>
      loadConfig(WorkflowEvidencePlanConfig, "plan").pipe(
        Effect.flatMap(writeInitialWorkflowEvidence)
      )
    ),
    Match.when("replan", () =>
      loadConfig(WorkflowEvidenceReplanConfig, "replan").pipe(
        Effect.flatMap(writeReplanWorkflowEvidence)
      )
    ),
    Match.when("provider", () =>
      loadConfig(WorkflowEvidenceProviderConfig, "provider").pipe(
        Effect.flatMap(writeProviderWorkflowEvidence)
      )
    ),
    Match.exhaustive
  );
});

const program = runWorkflowEvidence.pipe(
  Effect.tap((value) =>
    Schema.is(Schema.String)(value) ? Console.log(value) : Effect.void
  ),
  Effect.tapErrorTag("WorkflowEvidenceConfigError", (error) =>
    Console.error(
      `FAIL [workflow-evidence] config=${error.requirement}; mode=${error.mode ?? "unknown"}`
    )
  ),
  Effect.tapErrorTag("WorkflowEvidenceInputReadError", (error) =>
    Console.error(`FAIL [workflow-evidence] input=${error.role}`)
  ),
  Effect.tapErrorTag("WorkflowEvidencePlanProjectionError", (error) =>
    Console.error(
      `FAIL [workflow-evidence] plan=${error.operation} reason=${error.reason ?? "projection-or-receipt"}`
    )
  ),
  Effect.tapErrorTag("WorkflowEvidenceProviderDecodeError", (error) =>
    Console.error(`FAIL [workflow-evidence] provider=${error.role}`)
  ),
  Effect.tapErrorTag("WorkflowEvidenceReceiptWriteError", (error) =>
    Console.error(`FAIL [workflow-evidence] receipt=${error.role}`)
  ),
  Effect.scoped,
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
