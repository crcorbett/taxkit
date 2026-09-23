import { Array, Clock, Crypto, Effect, Encoding, Schema, Stream } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as ChildProcess from "effect/unstable/process/ChildProcess";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";

import type { DocsDeploymentInventoryReport } from "./inventory.schemas.js";
import { DocsDeploymentInventoryReport as DocsDeploymentInventoryReportSchema } from "./inventory.schemas.js";
import { DeploymentPlanProjection, DeploymentPlanReceipt } from "./schemas.js";
import { workflowSha256 } from "./workflow-check.boundary.js";
import {
  WorkflowBootstrapReceipt,
  WorkflowEvidenceConfigError,
  WorkflowEvidenceIdentity,
  WorkflowEvidenceInputReadError,
  WorkflowEvidencePlanProjectionError,
  WorkflowEvidenceProviderIdentity,
  WorkflowEvidenceProviderDecodeError,
  WorkflowEvidenceReceiptWriteError,
  WranglerDeployments,
} from "./workflow-evidence.schemas.js";
import type {
  WorkflowEvidenceBootstrapConfig,
  WorkflowEvidencePlanConfig,
  WorkflowEvidenceProviderConfig,
  WorkflowEvidenceReplanConfig,
  WranglerDeployments as WranglerDeploymentsType,
} from "./workflow-evidence.schemas.js";
import {
  projectAlchemyPlanText,
  stringifyWorkflowPlanProjection,
} from "./workflow-plan-projection.js";
import { DeploymentWorkflowProviderReadback } from "./workflow-receipts.schemas.js";

const configurationFiles = [
  "alchemy.run.ts",
  "apps/docs/package.json",
  "apps/docs/vite.config.ts",
  "packages/infrastructure/src/cloudflare/website.ts",
  "packages/infrastructure/src/stage.ts",
  "packages/infrastructure/src/stack.ts",
  "apps/docs/public/_headers",
] as const;

const deploymentInputRoots = [
  "alchemy.run.ts",
  "apps/docs",
  "packages/infrastructure",
  "packages/docs-content",
  "packages/docs-fumadocs",
] as const;

const sha256Bytes = (bytes: Uint8Array, role: string) =>
  Crypto.Crypto.pipe(
    Effect.flatMap((crypto) => crypto.digest("SHA-256", bytes)),
    Effect.map(Encoding.encodeHex),
    Effect.map((digest) => digest.toLowerCase()),
    Effect.mapError(() => new WorkflowEvidenceInputReadError({ role }))
  );

const readBytes = (path: string, role: string) =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fileSystem) => fileSystem.readFile(path)),
    Effect.mapError(() => new WorkflowEvidenceInputReadError({ role }))
  );

const digestFile = (path: string, role: string) =>
  readBytes(path, role).pipe(
    Effect.flatMap((bytes) => sha256Bytes(bytes, role))
  );

const digestManifest = (repositoryRoot: string, files: readonly string[]) =>
  Effect.gen(function* digestWorkflowManifest() {
    const path = yield* Path.Path;
    const entries = yield* Effect.forEach(
      files,
      (file) =>
        digestFile(path.join(repositoryRoot, file), "identity-file").pipe(
          Effect.map((digest) => `${digest}  ${file}\n`)
        ),
      { concurrency: 8 }
    );
    return yield* sha256Bytes(
      new TextEncoder().encode(entries.join("")),
      "identity-manifest"
    );
  });

const readTrackedDeploymentInputs = (repositoryRoot: string) =>
  Effect.gen(function* readTrackedInputs() {
    const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* childProcesses.spawn(
      ChildProcess.make(
        "git",
        ["ls-files", "-z", "--", ...deploymentInputRoots],
        {
          cwd: repositoryRoot,
          extendEnv: true,
          forceKillAfter: "2 seconds",
          stderr: "pipe",
          stdin: "ignore",
          stdout: "pipe",
        }
      )
    );
    const [stdout, [exitCode]] = yield* Effect.all(
      [
        Stream.runCollect(handle.stdout),
        Effect.zip(handle.exitCode, Stream.runDrain(handle.stderr), {
          concurrent: true,
        }),
      ],
      { concurrency: 2 }
    );
    if (Number(exitCode) !== 0) {
      return yield* new WorkflowEvidenceInputReadError({
        role: "tracked-deployment-inputs",
      });
    }
    const source = yield* Effect.try({
      catch: () =>
        new WorkflowEvidenceInputReadError({
          role: "tracked-deployment-inputs",
        }),
      try: () =>
        new TextDecoder("utf-8", { fatal: true }).decode(
          Uint8Array.from(Array.flatMap(stdout, Array.fromIterable))
        ),
    });
    const files = source
      .split("\0")
      .filter((entry) => entry.length > 0)
      .toSorted();
    if (files.length === 0) {
      return yield* new WorkflowEvidenceInputReadError({
        role: "tracked-deployment-inputs",
      });
    }
    return files;
  }).pipe(
    Effect.catchTag(
      "PlatformError",
      () =>
        new WorkflowEvidenceInputReadError({
          role: "tracked-deployment-inputs",
        })
    )
  );

const calculateWorkflowEvidenceIdentity = (
  repositoryRoot: string,
  candidateCommit: string
) =>
  Effect.gen(function* calculateIdentity() {
    const path = yield* Path.Path;
    const deploymentInputFiles =
      yield* readTrackedDeploymentInputs(repositoryRoot);
    return yield* Schema.decodeUnknownEffect(WorkflowEvidenceIdentity)({
      candidateCommit,
      configSha256: yield* digestManifest(repositoryRoot, configurationFiles),
      deploymentInputSha256: yield* digestManifest(
        repositoryRoot,
        deploymentInputFiles
      ),
      lockfileSha256: yield* digestFile(
        path.join(repositoryRoot, "bun.lock"),
        "lockfile"
      ),
      schemaVersion: 1,
    }).pipe(
      Effect.mapError(
        () => new WorkflowEvidenceInputReadError({ role: "identity" })
      )
    );
  });

const readText = (path: string, role: string) =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fileSystem) => fileSystem.readFileString(path)),
    Effect.mapError(() => new WorkflowEvidenceInputReadError({ role }))
  );

const readOwnedJson = <A>(
  path: string,
  role: string,
  schema: Schema.ConstraintDecoder<A>
) =>
  readText(path, role).pipe(
    Effect.flatMap(
      Schema.decodeUnknownEffect(Schema.fromJsonString(schema), {
        onExcessProperty: "error",
      })
    ),
    Effect.mapError(() => new WorkflowEvidenceInputReadError({ role }))
  );

const readProviderJson = <A>(
  path: string,
  role: string,
  schema: Schema.ConstraintDecoder<A>
) =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fileSystem) => fileSystem.readFileString(path)),
    Effect.mapError(() => new WorkflowEvidenceProviderDecodeError({ role })),
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(schema))),
    Effect.mapError(() => new WorkflowEvidenceProviderDecodeError({ role }))
  );

const encodeAndWrite = <A>(
  path: string,
  role: string,
  schema: Schema.ConstraintEncoder<A>,
  value: A
) =>
  Effect.gen(function* encodeAndWriteReceipt() {
    const fileSystem = yield* FileSystem.FileSystem;
    const encoded = yield* Schema.encodeUnknownEffect(
      Schema.fromJsonString(schema)
    )(value).pipe(
      Effect.mapError(() => new WorkflowEvidenceReceiptWriteError({ role }))
    );
    yield* fileSystem
      .writeFileString(path, `${encoded}\n`)
      .pipe(
        Effect.mapError(() => new WorkflowEvidenceReceiptWriteError({ role }))
      );
  });

const appendWorkflowFile = (path: string, role: string, output: string) =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fileSystem) =>
      fileSystem.writeFileString(path, output, { flag: "a" })
    ),
    Effect.mapError(() => new WorkflowEvidenceReceiptWriteError({ role }))
  );

const observedAt = Clock.currentTimeMillis.pipe(
  Effect.map((millis) =>
    new Date(millis).toISOString().replace(/\.\d{3}Z$/u, "Z")
  )
);

const makeProjection = (
  config: WorkflowEvidencePlanConfig | WorkflowEvidenceReplanConfig,
  identity: WorkflowEvidenceIdentity
) =>
  Effect.gen(function* projectPlan() {
    const source = yield* readText(
      config.TAXKIT_WORKFLOW_EVIDENCE_PLAN_TEXT_PATH,
      "alchemy-plan"
    );
    const logicalResources = yield* projectAlchemyPlanText(
      source,
      "deploy"
    ).pipe(
      Effect.mapError(
        () =>
          new WorkflowEvidencePlanProjectionError({
            operation: config.TAXKIT_WORKFLOW_EVIDENCE_OPERATION,
          })
      )
    );
    const projection = yield* Schema.decodeUnknownEffect(
      DeploymentPlanProjection
    )({
      candidate: {
        deploymentInputSha256: identity.deploymentInputSha256,
        exactCommit: identity.candidateCommit,
        lockfileSha256: identity.lockfileSha256,
      },
      configSha256: identity.configSha256,
      logicalResources,
      redaction: {
        ansiRemoved: true,
        secretValuesIncluded: false,
        timestampsExcludedFromDigest: true,
      },
      schemaVersion: 2,
      stack: "TaxKitDocsCloudflare",
      stage: config.TAXKIT_WORKFLOW_EVIDENCE_STAGE,
    }).pipe(
      Effect.mapError(
        () =>
          new WorkflowEvidencePlanProjectionError({
            operation: config.TAXKIT_WORKFLOW_EVIDENCE_OPERATION,
          })
      )
    );
    const digest = yield* workflowSha256(
      "workflow-plan",
      stringifyWorkflowPlanProjection(projection)
    ).pipe(
      Effect.mapError(
        () =>
          new WorkflowEvidencePlanProjectionError({
            operation: config.TAXKIT_WORKFLOW_EVIDENCE_OPERATION,
          })
      )
    );
    return { digest, projection };
  });

export const writeBootstrapWorkflowEvidence = (
  config: WorkflowEvidenceBootstrapConfig
) =>
  Effect.gen(function* writeBootstrapEvidence() {
    const bootstrap = yield* Schema.decodeUnknownEffect(
      WorkflowBootstrapReceipt
    )({
      alchemySourceCommit: "31edd3c4b2f0f3310fad07f5423aee20cf72be8d",
      alchemyVersion: "2.0.0-beta.64",
      allowedEffects: [
        "credential-refresh",
        "edge-preview-secret-read",
        "state-store-create-or-upgrade",
      ],
      candidateCommit: config.TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT,
      limitations: [
        "This receipt records the allowed beta.64 bootstrap effects, not which provider mutations occurred.",
        "State-store facts before and after bootstrap were not independently read back in this step.",
      ],
      observedAt: yield* observedAt,
      result: "bootstrap-command-completed",
      schemaVersion: 1,
      stage: config.TAXKIT_WORKFLOW_EVIDENCE_STAGE,
      stateStoreAfter: "not-observed",
      stateStoreBefore: "not-observed",
      workflowRunId: config.TAXKIT_WORKFLOW_EVIDENCE_RUN_ID,
    }).pipe(
      Effect.mapError(
        () =>
          new WorkflowEvidenceReceiptWriteError({
            role: "bootstrap-receipt",
          })
      )
    );
    yield* encodeAndWrite(
      config.TAXKIT_WORKFLOW_EVIDENCE_BOOTSTRAP_PATH,
      "bootstrap-receipt",
      WorkflowBootstrapReceipt,
      bootstrap
    );
  });

export const writeInitialWorkflowEvidence = (
  config: WorkflowEvidencePlanConfig
) =>
  Effect.gen(function* writeInitialEvidence() {
    const identity = yield* calculateWorkflowEvidenceIdentity(
      config.TAXKIT_WORKFLOW_EVIDENCE_REPOSITORY_ROOT,
      config.TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT
    );
    const { digest, projection } = yield* makeProjection(config, identity);
    const timestamp = yield* observedAt;
    const receipt = yield* Schema.decodeUnknownEffect(DeploymentPlanReceipt)({
      acceptedBy: config.TAXKIT_WORKFLOW_EVIDENCE_ACCEPTED_BY,
      acceptedPlanSha256: digest,
      observedAt: timestamp,
      operation: config.TAXKIT_WORKFLOW_EVIDENCE_OPERATION,
      projection,
      receiptPath: config.TAXKIT_WORKFLOW_EVIDENCE_RECEIPT_PATH,
      replanSha256: null,
      schemaVersion: 2,
    }).pipe(
      Effect.mapError(
        () =>
          new WorkflowEvidencePlanProjectionError({
            operation: config.TAXKIT_WORKFLOW_EVIDENCE_OPERATION,
          })
      )
    );
    yield* Effect.all(
      [
        encodeAndWrite(
          config.TAXKIT_WORKFLOW_EVIDENCE_IDENTITY_PATH,
          "identity-receipt",
          WorkflowEvidenceIdentity,
          identity
        ),
        encodeAndWrite(
          config.TAXKIT_WORKFLOW_EVIDENCE_PROJECTION_PATH,
          "plan-projection",
          DeploymentPlanProjection,
          projection
        ),
        encodeAndWrite(
          config.TAXKIT_WORKFLOW_EVIDENCE_PLAN_PATH,
          "plan-receipt",
          DeploymentPlanReceipt,
          receipt
        ),
      ],
      { concurrency: 3, discard: true }
    );
    yield* appendWorkflowFile(
      config.TAXKIT_WORKFLOW_EVIDENCE_GITHUB_OUTPUT_PATH,
      "github-output",
      `plan_sha256=${digest}\n`
    );
    return digest;
  });

export const writeReplanWorkflowEvidence = (
  config: WorkflowEvidenceReplanConfig
) =>
  Effect.gen(function* writeReplanEvidence() {
    const identity = yield* calculateWorkflowEvidenceIdentity(
      config.TAXKIT_WORKFLOW_EVIDENCE_REPOSITORY_ROOT,
      config.TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT
    );
    const { digest, projection } = yield* makeProjection(config, identity);
    const original = yield* readOwnedJson(
      config.TAXKIT_WORKFLOW_EVIDENCE_PLAN_PATH,
      "plan-receipt",
      DeploymentPlanReceipt
    );
    const receipt = yield* Schema.decodeUnknownEffect(DeploymentPlanReceipt)({
      ...original,
      operation: config.TAXKIT_WORKFLOW_EVIDENCE_OPERATION,
      projection,
      replanSha256: digest,
    }).pipe(
      Effect.mapError(
        () =>
          new WorkflowEvidencePlanProjectionError({
            operation: config.TAXKIT_WORKFLOW_EVIDENCE_OPERATION,
          })
      )
    );
    yield* Effect.all(
      [
        encodeAndWrite(
          config.TAXKIT_WORKFLOW_EVIDENCE_IDENTITY_PATH,
          "identity-receipt",
          WorkflowEvidenceIdentity,
          identity
        ),
        encodeAndWrite(
          config.TAXKIT_WORKFLOW_EVIDENCE_PROJECTION_PATH,
          "plan-projection",
          DeploymentPlanProjection,
          projection
        ),
        encodeAndWrite(
          config.TAXKIT_WORKFLOW_EVIDENCE_PLAN_PATH,
          "plan-receipt",
          DeploymentPlanReceipt,
          receipt
        ),
      ],
      { concurrency: 3, discard: true }
    );
    return digest;
  });

const findStage = (
  inventory: DocsDeploymentInventoryReport,
  stage: WorkflowEvidenceProviderConfig["TAXKIT_WORKFLOW_EVIDENCE_STAGE"]
) => inventory.stages.filter((entry) => entry.stage === stage);

const SelectedWorkflowWorker = Schema.Struct({
  url: Schema.URL,
  workerName: WorkflowEvidenceProviderIdentity,
});

const selectWorker = (
  inventory: DocsDeploymentInventoryReport,
  stage: WorkflowEvidenceProviderConfig["TAXKIT_WORKFLOW_EVIDENCE_STAGE"],
  allowAbsent: boolean
) =>
  Effect.gen(function* selectInventoryWorker() {
    const stages = findStage(inventory, stage);
    if (allowAbsent && stages.length === 0) {
      return null;
    }
    if (stages.length !== 1) {
      return yield* new WorkflowEvidenceProviderDecodeError({
        role: "stage-inventory",
      });
    }
    const [stageInventory] = stages;
    if (
      stageInventory === undefined ||
      stageInventory.resources.length !== 1 ||
      stageInventory.resources[0]?.logicalId !== "DocsWebsite" ||
      stageInventory.resources[0].workerName === undefined ||
      stageInventory.resources[0].workerUrl === undefined
    ) {
      return yield* new WorkflowEvidenceProviderDecodeError({
        role: "stage-inventory",
      });
    }
    const [resource] = stageInventory.resources;
    const { workerName, workerUrl } = resource;
    const providerWorkers = inventory.providerWorkers.filter(
      (worker) =>
        worker.stage === stage &&
        worker.logicalId === "DocsWebsite" &&
        worker.workerName === workerName
    );
    if (providerWorkers.length !== 1) {
      return yield* new WorkflowEvidenceProviderDecodeError({
        role: "provider-inventory",
      });
    }
    return yield* Schema.decodeUnknownEffect(SelectedWorkflowWorker)({
      url: workerUrl,
      workerName,
    }).pipe(
      Effect.mapError(
        () =>
          new WorkflowEvidenceProviderDecodeError({
            role: "stage-inventory",
          })
      )
    );
  });

const latestDeployment = (deployments: WranglerDeploymentsType, role: string) =>
  Effect.gen(function* selectLatestDeployment() {
    const latest = deployments.at(-1);
    const deploymentId = latest?.id ?? latest?.deployment_id;
    const versionId = latest?.versions[0]?.version_id;
    if (deploymentId === undefined || versionId === undefined) {
      return yield* new WorkflowEvidenceProviderDecodeError({ role });
    }
    return { deploymentId, versionId };
  });

const requiredAfter = <A>(
  value: A | undefined,
  requirement: string
): Effect.Effect<A, WorkflowEvidenceConfigError> =>
  value === undefined
    ? Effect.fail(
        new WorkflowEvidenceConfigError({ mode: "provider", requirement })
      )
    : Effect.succeed(value);

export const writeProviderWorkflowEvidence = (
  config: WorkflowEvidenceProviderConfig
) =>
  Effect.gen(function* writeProviderEvidence() {
    const inventory = yield* readProviderJson(
      config.TAXKIT_WORKFLOW_EVIDENCE_INVENTORY_PATH,
      "provider-inventory",
      DocsDeploymentInventoryReportSchema
    );
    if (config.TAXKIT_WORKFLOW_EVIDENCE_PHASE === "before") {
      const worker = yield* selectWorker(
        inventory,
        config.TAXKIT_WORKFLOW_EVIDENCE_STAGE,
        true
      );
      const outputPath = yield* requiredAfter(
        config.TAXKIT_WORKFLOW_EVIDENCE_GITHUB_OUTPUT_PATH,
        "provider-before-github-output"
      );
      const previousPath =
        config.TAXKIT_WORKFLOW_EVIDENCE_PREVIOUS_DEPLOYMENTS_PATH;
      const previousVersionId =
        previousPath === undefined || previousPath === ""
          ? ""
          : yield* readProviderJson(
              previousPath,
              "previous-deployments",
              WranglerDeployments
            ).pipe(
              Effect.flatMap((deployments) =>
                latestDeployment(deployments, "previous-deployments")
              ),
              Effect.map((deployment) => deployment.versionId)
            );
      yield* appendWorkflowFile(
        outputPath,
        "github-output",
        worker === null
          ? "stage_present=false\nprevious_worker_name=\nprevious_version_id=\n"
          : `stage_present=true\nprevious_worker_name=${worker.workerName}\nprevious_version_id=${previousVersionId}\n`
      );
      return;
    }

    const worker = yield* selectWorker(
      inventory,
      config.TAXKIT_WORKFLOW_EVIDENCE_STAGE,
      false
    );
    if (worker === null) {
      return yield* new WorkflowEvidenceProviderDecodeError({
        role: "stage-inventory",
      });
    }
    const currentDeploymentsPath = yield* requiredAfter(
      config.TAXKIT_WORKFLOW_EVIDENCE_CURRENT_DEPLOYMENTS_PATH,
      "current-deployments-path"
    );
    const currentDeployments = yield* readProviderJson(
      currentDeploymentsPath,
      "current-deployments",
      WranglerDeployments
    );
    const current = yield* latestDeployment(
      currentDeployments,
      "current-deployments"
    );
    const previousPath =
      config.TAXKIT_WORKFLOW_EVIDENCE_PREVIOUS_DEPLOYMENTS_PATH;
    const previousVersionId =
      previousPath === undefined || previousPath === ""
        ? null
        : yield* readProviderJson(
            previousPath,
            "previous-deployments",
            WranglerDeployments
          ).pipe(
            Effect.flatMap((deployments) =>
              latestDeployment(deployments, "previous-deployments")
            ),
            Effect.map((deployment) => deployment.versionId)
          );
    const identityPath = yield* requiredAfter(
      config.TAXKIT_WORKFLOW_EVIDENCE_IDENTITY_PATH,
      "identity-path"
    );
    const identity = yield* readOwnedJson(
      identityPath,
      "identity-receipt",
      WorkflowEvidenceIdentity
    );
    const accountId = yield* requiredAfter(
      config.TAXKIT_WORKFLOW_EVIDENCE_ACCOUNT_ID,
      "account-id"
    );
    const acceptedPlanSha256 = yield* requiredAfter(
      config.TAXKIT_WORKFLOW_EVIDENCE_ACCEPTED_PLAN_SHA256,
      "accepted-plan-sha256"
    );
    const candidateCommit = yield* requiredAfter(
      config.TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT,
      "candidate-commit"
    );
    const environment = yield* requiredAfter(
      config.TAXKIT_WORKFLOW_EVIDENCE_ENVIRONMENT,
      "environment"
    );
    const githubEnvPath = yield* requiredAfter(
      config.TAXKIT_WORKFLOW_EVIDENCE_GITHUB_ENV_PATH,
      "github-env-path"
    );
    const providerReadbackPath = yield* requiredAfter(
      config.TAXKIT_WORKFLOW_EVIDENCE_PROVIDER_READBACK_PATH,
      "provider-readback-path"
    );
    const rollbackIdentity = yield* requiredAfter(
      config.TAXKIT_WORKFLOW_EVIDENCE_ROLLBACK_IDENTITY,
      "rollback-identity"
    );
    const workflowRunId = yield* requiredAfter(
      config.TAXKIT_WORKFLOW_EVIDENCE_RUN_ID,
      "workflow-run-id"
    );
    const previewPrNumberValue =
      config.TAXKIT_WORKFLOW_EVIDENCE_PREVIEW_PR_NUMBER;
    const previewPrNumber =
      previewPrNumberValue === undefined || previewPrNumberValue === ""
        ? null
        : previewPrNumberValue;
    if (
      identity.candidateCommit !== candidateCommit ||
      (config.TAXKIT_WORKFLOW_EVIDENCE_STAGE === "prod" &&
        previewPrNumber !== null) ||
      (config.TAXKIT_WORKFLOW_EVIDENCE_STAGE !== "prod" &&
        previewPrNumber === null)
    ) {
      return yield* new WorkflowEvidenceConfigError({
        mode: "provider",
        requirement: "stage-candidate-preview-identity",
      });
    }
    const stateStoreId = yield* Schema.decodeUnknownEffect(
      WorkflowEvidenceProviderIdentity
    )(inventory.stateStore.id).pipe(
      Effect.mapError(
        () =>
          new WorkflowEvidenceProviderDecodeError({
            role: "state-store-identity",
          })
      )
    );
    const url = worker.url.toString().replace(/\/+$/u, "");
    const receipt = yield* Schema.decodeUnknownEffect(
      DeploymentWorkflowProviderReadback
    )({
      acceptedPlanSha256,
      accountId,
      candidateCommit,
      configSha256: identity.configSha256,
      deploymentId: current.deploymentId,
      deploymentInputSha256: identity.deploymentInputSha256,
      lockfileSha256: identity.lockfileSha256,
      previewPrNumber,
      previousVersionId,
      rollbackRecoveryIdentity: rollbackIdentity,
      schemaVersion: 1,
      stage: config.TAXKIT_WORKFLOW_EVIDENCE_STAGE,
      stateStoreId,
      url,
      versionId: current.versionId,
      workerName: worker.workerName,
    }).pipe(
      Effect.mapError(
        () =>
          new WorkflowEvidenceProviderDecodeError({
            role: "provider-readback",
          })
      )
    );
    yield* encodeAndWrite(
      providerReadbackPath,
      "provider-readback",
      DeploymentWorkflowProviderReadback,
      receipt
    );
    yield* appendWorkflowFile(
      githubEnvPath,
      "github-environment",
      [
        `TAXKIT_DOCS_HOSTED_URL=${url}`,
        `TAXKIT_DOCS_DEPLOYMENT_ID=${current.deploymentId}`,
        `TAXKIT_DOCS_VERSION_ID=${current.versionId}`,
        `TAXKIT_DOCS_WORKER_NAME=${worker.workerName}`,
        `TAXKIT_DOCS_CANDIDATE_COMMIT=${candidateCommit}`,
        `TAXKIT_DOCS_ACCOUNT_ID=${accountId}`,
        `TAXKIT_DOCS_STATE_STORE_ID=${stateStoreId}`,
        `TAXKIT_DOCS_PREVIOUS_VERSION_ID=${previousVersionId ?? ""}`,
        `TAXKIT_DOCS_PREVIEW_PR_NUMBER=${previewPrNumber ?? ""}`,
        `TAXKIT_DOCS_STAGE=${config.TAXKIT_WORKFLOW_EVIDENCE_STAGE}`,
        `TAXKIT_DOCS_PLAN_SHA256=${acceptedPlanSha256}`,
        `TAXKIT_DOCS_CONFIG_SHA256=${identity.configSha256}`,
        `TAXKIT_DOCS_DEPLOYMENT_INPUT_SHA256=${identity.deploymentInputSha256}`,
        `TAXKIT_DOCS_LOCKFILE_SHA256=${identity.lockfileSha256}`,
        `TAXKIT_DOCS_ROLLBACK_RECOVERY_IDENTITY=${rollbackIdentity}`,
        `TAXKIT_DOCS_ENVIRONMENT=${environment}`,
        `TAXKIT_DOCS_EVIDENCE_DIRECTORY=docs/evidence/deployments/workflow-${workflowRunId}`,
        "",
      ].join("\n")
    );
  });
