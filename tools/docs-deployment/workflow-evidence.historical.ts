// Retained receipt algorithm for owned local fixtures; no current provider entry.
import { Config, Effect, Match } from "effect";

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

export const runHistoricalWorkflowEvidence = Effect.gen(
  function* workflowEvidence() {
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
  }
);
