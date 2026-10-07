import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { DocsDeploymentStage } from "@taxkit/infrastructure/stage";
import { Config, Console, Effect, Match, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";

import {
  DeploymentPlanProjection,
  NativeAppsPlanProjection,
  NativeAppsPlanProviderIdentity,
  NativeAppsProductionDns,
} from "./schemas.js";
import { workflowSha256 } from "./workflow-check.boundary.js";
import {
  projectAlchemyPlanText,
  projectNativeAppsPlanText,
  stringifyNativeAppsPlanProjection,
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
  TAXKIT_WORKFLOW_PLAN_GRAPH: Schema.optional(
    Schema.Literals(["retained-docs", "native-apps"])
  ),
  TAXKIT_WORKFLOW_PLAN_KIND: WorkflowPlanProjectionKind,
  TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256: Sha256,
  TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_PLAN_STAGE: DocsDeploymentStage,
  TAXKIT_WORKFLOW_PLAN_TEXT_PATH: Schema.NonEmptyString,
});

const NativeAppsIdentityConfig = Schema.Struct({
  TAXKIT_WORKFLOW_PLAN_ACCOUNT_ID:
    NativeAppsPlanProviderIdentity.fields.accountId,
  TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256:
    NativeAppsPlanProviderIdentity.fields.alchemyPatchSha256,
  TAXKIT_WORKFLOW_PLAN_ZONE_ID: Schema.optional(
    NativeAppsProductionDns.fields.zoneId
  ),
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
  const encoded = yield* config.TAXKIT_WORKFLOW_PLAN_GRAPH === "native-apps"
    ? Effect.gen(function* () {
        if (config.TAXKIT_WORKFLOW_PLAN_KIND !== "deploy") {
          return yield* new WorkflowPlanProjectionError({
            reason: "native app plan cannot be used for teardown",
          });
        }
        const identity = yield* Config.schema(NativeAppsIdentityConfig).pipe(
          Effect.mapError(
            () =>
              new WorkflowPlanProjectionError({
                reason:
                  "native app plan requires the exact account, stage, zone and patch identity",
              })
          )
        );
        const resources = yield* projectNativeAppsPlanText(
          source,
          config.TAXKIT_WORKFLOW_PLAN_STAGE
        );
        const projection = yield* Schema.decodeUnknownEffect(
          NativeAppsPlanProjection
        )(
          {
            ...resources,
            candidate: {
              deploymentInputSha256:
                config.TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256,
              exactCommit: config.TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT,
              lockfileSha256: config.TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256,
            },
            configSha256: config.TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256,
            domains:
              config.TAXKIT_WORKFLOW_PLAN_STAGE === "prod"
                ? ["taxkit.dev", "www.taxkit.dev", "api.taxkit.dev"]
                : [],
            productionDns:
              config.TAXKIT_WORKFLOW_PLAN_STAGE === "prod"
                ? {
                    removalPolicy: "retain",
                    zoneId: identity.TAXKIT_WORKFLOW_PLAN_ZONE_ID,
                    zoneName: "taxkit.dev",
                  }
                : "unmanaged",
            provider: {
              accountId: identity.TAXKIT_WORKFLOW_PLAN_ACCOUNT_ID,
              alchemyPatchSha256:
                identity.TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256,
              alchemySourceCommit: "ef7d3077a7d196edf26fa1f3bb8bc9b0ef9fef04",
              alchemyVersion: "2.0.0-beta.80",
            },
            redaction: {
              ansiRemoved: true,
              secretValuesIncluded: false,
              timestampsExcludedFromDigest: true,
            },
            schemaVersion: 3,
            stack: "TaxKitAppsCloudflare",
            stage: config.TAXKIT_WORKFLOW_PLAN_STAGE,
          },
          { onExcessProperty: "error" }
        ).pipe(
          Effect.mapError(
            () =>
              new WorkflowPlanProjectionError({
                reason:
                  "native app plan requires the exact account, stage, zone and patch identity",
              })
          )
        );
        return yield* stringifyNativeAppsPlanProjection(projection);
      })
    : Effect.gen(function* () {
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
        return yield* stringifyWorkflowPlanProjection(projection);
      });
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
