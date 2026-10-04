import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { DocsDeploymentStage } from "@taxkit/infrastructure/stage";
import { Config, Console, Effect, Match, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";

import { DeploymentPlanProjection } from "./schemas.js";
import { workflowSha256 } from "./workflow-check.boundary.js";
import {
  projectAlchemyPlanText,
  stringifyWorkflowPlanProjection,
  WorkflowPlanProjectionError,
  WorkflowPlanProjectionKind,
} from "./workflow-plan-projection.js";

const CommitSha = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}$/u));
const Sha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u));

const WorkflowPlanProjectionConfig = Schema.Struct({
  TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT: CommitSha,
  TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256: Sha256,
  TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256: Sha256,
  TAXKIT_WORKFLOW_PLAN_KIND: WorkflowPlanProjectionKind,
  TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256: Sha256,
  TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_PLAN_STAGE: DocsDeploymentStage,
  TAXKIT_WORKFLOW_PLAN_TEXT_PATH: Schema.NonEmptyString,
});

const check = "workflow-plan" as const;

export const projectWorkflowPlan = Effect.gen(function* () {
  const config = yield* Config.schema(WorkflowPlanProjectionConfig).pipe(
    Effect.mapError(
      () =>
        new WorkflowPlanProjectionError({
          reason:
            "workflow plan projection requires the candidate, digest, stage and plan paths",
        })
    )
  );
  const fileSystem = yield* FileSystem.FileSystem;
  const source = yield* fileSystem
    .readFileString(config.TAXKIT_WORKFLOW_PLAN_TEXT_PATH)
    .pipe(
      Effect.mapError(
        () =>
          new WorkflowPlanProjectionError({
            reason: "could not read the beta.80 Alchemy plan output",
          })
      )
    );
  const logicalResources = yield* projectAlchemyPlanText(
    source,
    config.TAXKIT_WORKFLOW_PLAN_KIND
  );
  const projection = yield* Schema.decodeUnknownEffect(
    DeploymentPlanProjection
  )({
    candidate: {
      deploymentInputSha256:
        config.TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256,
      exactCommit: config.TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT,
      lockfileSha256: config.TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256,
    },
    configSha256: config.TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256,
    logicalResources,
    redaction: {
      ansiRemoved: true,
      secretValuesIncluded: false,
      timestampsExcludedFromDigest: true,
    },
    schemaVersion: 2,
    stack: "TaxKitDocsCloudflare",
    stage: config.TAXKIT_WORKFLOW_PLAN_STAGE,
  }).pipe(
    Effect.mapError(
      () =>
        new WorkflowPlanProjectionError({
          reason: "could not decode the workflow plan projection",
        })
    )
  );
  const encoded = yield* stringifyWorkflowPlanProjection(projection);
  yield* fileSystem
    .writeFileString(config.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH, encoded)
    .pipe(
      Effect.mapError(
        () =>
          new WorkflowPlanProjectionError({
            reason: "could not write the workflow plan projection",
          })
      )
    );
  return yield* workflowSha256(check, encoded);
});

const program = projectWorkflowPlan.pipe(
  Effect.tapErrorTag("WorkflowPlanProjectionError", (error) =>
    Console.error(`FAIL [${check}] ${error.reason}`)
  ),
  Effect.tapErrorTag("WorkflowCheckReadError", (error) =>
    Console.error(`FAIL [${check}] ${error.operation}`)
  ),
  Effect.flatMap((digest) => Console.log(digest)),
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(program, { disableErrorReporting: true })
  ),
  Match.orElse(() => false)
);
