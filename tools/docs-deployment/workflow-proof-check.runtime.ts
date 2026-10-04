import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array as EffectArray,
  Config,
  Console,
  Effect,
  HashSet,
  Match,
} from "effect";
import * as Path from "effect/Path";

import {
  readWorkflowReceipt,
  readWorkflowSha256,
} from "./workflow-check.boundary.js";
import {
  WorkflowCheckInputError,
  WorkflowCheckMismatchError,
  WorkflowProofCheckConfig,
} from "./workflow-check.schemas.js";
import {
  DeploymentWorkflowHostedProbe,
  DeploymentWorkflowProviderReadback,
} from "./workflow-receipts.schemas.js";

const check = "workflow-proof" as const;

export const checkWorkflowProof = Effect.gen(function* workflowProofCheck() {
  const config = yield* Config.schema(WorkflowProofCheckConfig).pipe(
    Effect.mapError(
      () => new WorkflowCheckInputError({ check, target: "environment" })
    )
  );
  const path = yield* Path.Path;
  const provider = yield* readWorkflowReceipt(
    check,
    config.TAXKIT_WORKFLOW_PROVIDER_READBACK,
    "provider-readback",
    DeploymentWorkflowProviderReadback
  );
  const hosted = yield* readWorkflowReceipt(
    check,
    config.TAXKIT_WORKFLOW_HOSTED_PROBE,
    "hosted-probe",
    DeploymentWorkflowHostedProbe
  );
  const screenshotDigests = yield* Effect.forEach(
    hosted.screenshots,
    (screenshot) =>
      readWorkflowSha256(
        check,
        path.join(config.TAXKIT_WORKFLOW_SCREENSHOT_ROOT, screenshot.path),
        `screenshot-${screenshot.kind}`
      ),
    { concurrency: 2 }
  );
  const screenshotKinds = HashSet.fromIterable(
    EffectArray.map(hosted.screenshots, ({ kind }) => kind)
  );
  const expectedEnvironment = Match.value(config.TAXKIT_WORKFLOW_STAGE).pipe(
    Match.when("prod", () =>
      hosted.environment === "rollback" ? "rollback" : "production"
    ),
    Match.orElse(() => "preview" as const)
  );
  const expectedPreviewPrNumber =
    config.TAXKIT_WORKFLOW_STAGE === "prod"
      ? null
      : Math.trunc(Number(config.TAXKIT_WORKFLOW_STAGE.slice("pr-".length)));
  const mismatch = EffectArray.some(
    [
      provider.accountId !== hosted.accountId,
      provider.stateStoreId !== hosted.stateStoreId,
      provider.candidateCommit !== config.TAXKIT_WORKFLOW_CANDIDATE_COMMIT,
      hosted.candidateCommit !== config.TAXKIT_WORKFLOW_CANDIDATE_COMMIT,
      provider.configSha256 !== hosted.configSha256,
      provider.deploymentInputSha256 !== hosted.deploymentInputSha256,
      provider.lockfileSha256 !== hosted.lockfileSha256,
      provider.stage !== config.TAXKIT_WORKFLOW_STAGE,
      hosted.stage !== config.TAXKIT_WORKFLOW_STAGE,
      provider.previewPrNumber !== hosted.previewPrNumber,
      provider.previewPrNumber !== expectedPreviewPrNumber,
      hosted.previewPrNumber !== expectedPreviewPrNumber,
      hosted.environment !== expectedEnvironment,
      provider.previousVersionId !== hosted.previousVersionId,
      provider.rollbackRecoveryIdentity !== hosted.rollbackRecoveryIdentity,
      hosted.environment === "rollback" &&
        (provider.previousVersionId === null ||
          provider.versionId === provider.previousVersionId ||
          hosted.versionId === hosted.previousVersionId),
      provider.acceptedPlanSha256 !== config.TAXKIT_WORKFLOW_PLAN_SHA256,
      hosted.acceptedPlanSha256 !== config.TAXKIT_WORKFLOW_PLAN_SHA256,
      provider.url !== hosted.url,
      provider.deploymentId !== hosted.deploymentId,
      provider.versionId !== hosted.versionId,
      provider.workerName !== hosted.workerName,
      hosted.diagnostics.length !== 0,
      hosted.screenshots.length !== 2,
      HashSet.size(screenshotKinds) !== 2 ||
        !HashSet.has(screenshotKinds, "desktop") ||
        !HashSet.has(screenshotKinds, "mobile"),
      EffectArray.some(
        hosted.screenshots,
        (screenshot, index) => screenshot.sha256 !== screenshotDigests[index]
      ),
    ],
    Boolean
  );

  if (mismatch) {
    return yield* new WorkflowCheckMismatchError({
      check,
      invariant: "provider-hosted-identity-diagnostics-screenshots",
    });
  }

  yield* Console.log(
    `Docs deployment workflow proof: candidate=${config.TAXKIT_WORKFLOW_CANDIDATE_COMMIT}; stage=${config.TAXKIT_WORKFLOW_STAGE}; provider/hosted identity agree; screenshots=desktop,mobile; diagnostics=0.`
  );
});

const program = checkWorkflowProof.pipe(
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
