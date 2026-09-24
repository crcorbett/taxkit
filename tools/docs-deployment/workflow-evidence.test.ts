import { describe, expect, test } from "bun:test";

import * as BunServices from "@effect/platform-bun/BunServices";
import { ConfigProvider, Effect, Match, Result, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import type * as Scope from "effect/Scope";

import { DeploymentPlanReceipt } from "./schemas.js";
import { runWorkflowEvidence } from "./workflow-evidence.runtime.js";
import { WorkflowBootstrapReceipt } from "./workflow-evidence.schemas.js";
import { DeploymentWorkflowProviderReadback } from "./workflow-receipts.schemas.js";

const candidateCommit = "a".repeat(40);
const accountId = "b".repeat(32);
const digest = "c".repeat(64);
type TestConfig = Readonly<Record<string, string | undefined>>;

const runWithConfig = (config: TestConfig) =>
  runWorkflowEvidence.pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown(config)
    ),
    Effect.result
  );

const readJson = <A>(path: string, schema: Schema.ConstraintDecoder<A>) =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fileSystem) => fileSystem.readFileString(path)),
    Effect.flatMap(
      Schema.decodeUnknownEffect(Schema.fromJsonString(schema), {
        onExcessProperty: "error",
      })
    )
  );

const makePlanConfig = (
  repositoryRoot: string,
  directory: string,
  overrides: TestConfig = {}
) => ({
  TAXKIT_WORKFLOW_EVIDENCE_ACCEPTED_BY: "taxkit-test",
  TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT: candidateCommit,
  TAXKIT_WORKFLOW_EVIDENCE_GITHUB_OUTPUT_PATH: `${directory}/github-output.txt`,
  TAXKIT_WORKFLOW_EVIDENCE_IDENTITY_PATH: `${directory}/identity.json`,
  TAXKIT_WORKFLOW_EVIDENCE_MODE: "plan",
  TAXKIT_WORKFLOW_EVIDENCE_OPERATION: "preview-plan",
  TAXKIT_WORKFLOW_EVIDENCE_PLAN_PATH: `${directory}/plan.json`,
  TAXKIT_WORKFLOW_EVIDENCE_PLAN_TEXT_PATH: `${directory}/alchemy-plan.txt`,
  TAXKIT_WORKFLOW_EVIDENCE_PROJECTION_PATH: `${directory}/projection.json`,
  TAXKIT_WORKFLOW_EVIDENCE_RECEIPT_PATH:
    "docs/evidence/deployments/workflow-42/plan.json",
  TAXKIT_WORKFLOW_EVIDENCE_REPOSITORY_ROOT: repositoryRoot,
  TAXKIT_WORKFLOW_EVIDENCE_STAGE: "pr-24",
  ...overrides,
});

const inventory = {
  agreement: "state-provider-agree",
  nonClaims: ["Provider inventory does not prove hosted behaviour."],
  providerWorkers: [
    {
      logicalId: "DocsWebsite",
      stage: "pr-24",
      workerName: "taxkit-docs-pr-24",
    },
  ],
  stack: "TaxKitDocsCloudflare",
  stages: [
    {
      resources: [
        {
          instanceId: "instance-pr-24",
          logicalId: "DocsWebsite",
          resourceType: "Cloudflare.Worker",
          status: "created",
          workerName: "taxkit-docs-pr-24",
          workerUrl: "https://taxkit-docs-pr-24.workers.dev",
        },
      ],
      stage: "pr-24",
    },
  ],
  stateStore: { id: "alchemy-state-store", version: 1 },
};

const withFixture = <A, E>(
  runFixture: (
    directory: string,
    repositoryRoot: string
  ) => Effect.Effect<A, E, BunServices.BunServices | Scope.Scope>
) =>
  Effect.gen(function* workflowEvidenceFixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-workflow-evidence-",
    });
    const repositoryRoot = yield* path.fromFileUrl(
      new URL("../..", import.meta.url)
    );
    yield* fileSystem.writeFileString(
      `${directory}/alchemy-plan.txt`,
      "Plan: 1 to create\n[DocsWebsite] create\n"
    );
    return yield* runFixture(directory, repositoryRoot);
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer), Effect.runPromise);

describe("workflow evidence command", () => {
  test("runs bootstrap and plan modes through Config and writes Schema-owned receipts", () =>
    withFixture((directory, repositoryRoot) =>
      Effect.gen(function* planModeFixture() {
        const bootstrapResult = yield* runWithConfig({
          TAXKIT_WORKFLOW_EVIDENCE_BOOTSTRAP_PATH: `${directory}/bootstrap.json`,
          TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT: candidateCommit,
          TAXKIT_WORKFLOW_EVIDENCE_MODE: "bootstrap",
          TAXKIT_WORKFLOW_EVIDENCE_RUN_ID: "42",
          TAXKIT_WORKFLOW_EVIDENCE_STAGE: "pr-24",
        });
        const result = yield* runWithConfig(
          makePlanConfig(repositoryRoot, directory)
        );
        expect(Result.isSuccess(bootstrapResult)).toBe(true);
        expect(Result.isSuccess(result)).toBe(true);
        const plan = yield* readJson(
          `${directory}/plan.json`,
          DeploymentPlanReceipt
        );
        const bootstrap = yield* readJson(
          `${directory}/bootstrap.json`,
          WorkflowBootstrapReceipt
        );
        expect(plan.operation).toBe("preview-plan");
        expect(plan.projection.logicalResources).toEqual([
          {
            action: "create",
            logicalId: "DocsWebsite",
            resourceType: "Cloudflare.Worker",
          },
        ]);
        expect(bootstrap.allowedEffects).toEqual([
          "credential-refresh",
          "edge-preview-secret-read",
          "state-store-create-or-upgrade",
        ]);
        expect(bootstrap.stateStoreAfter).toBe("not-observed");
      })
    ));

  test("runs replan mode and preserves the accepted plan digest", () =>
    withFixture((directory, repositoryRoot) =>
      Effect.gen(function* replanModeFixture() {
        const initial = yield* runWithConfig(
          makePlanConfig(repositoryRoot, directory)
        );
        expect(Result.isSuccess(initial)).toBe(true);
        const replan = yield* runWithConfig({
          ...makePlanConfig(repositoryRoot, directory),
          TAXKIT_WORKFLOW_EVIDENCE_MODE: "replan",
          TAXKIT_WORKFLOW_EVIDENCE_OPERATION: "preview-equal-replan",
        });
        expect(Result.isSuccess(replan)).toBe(true);
        const receipt = yield* readJson(
          `${directory}/plan.json`,
          DeploymentPlanReceipt
        );
        expect(receipt.operation).toBe("preview-equal-replan");
        expect(receipt.replanSha256).toBe(receipt.acceptedPlanSha256);
      })
    ));

  test("runs provider before mode and returns only the selected worker", () =>
    withFixture((directory) =>
      Effect.gen(function* providerBeforeFixture() {
        const fileSystem = yield* FileSystem.FileSystem;
        yield* fileSystem.writeFileString(
          `${directory}/inventory.json`,
          JSON.stringify(inventory)
        );
        const result = yield* runWithConfig({
          TAXKIT_WORKFLOW_EVIDENCE_GITHUB_OUTPUT_PATH: `${directory}/github-output.txt`,
          TAXKIT_WORKFLOW_EVIDENCE_INVENTORY_PATH: `${directory}/inventory.json`,
          TAXKIT_WORKFLOW_EVIDENCE_MODE: "provider",
          TAXKIT_WORKFLOW_EVIDENCE_PHASE: "before",
          TAXKIT_WORKFLOW_EVIDENCE_STAGE: "pr-24",
        });
        expect(Result.isSuccess(result)).toBe(true);
        expect(
          yield* fileSystem.readFileString(`${directory}/github-output.txt`)
        ).toBe(
          "stage_present=true\nprevious_worker_name=taxkit-docs-pr-24\nprevious_version_id=\n"
        );
      })
    ));

  test("runs provider after mode with deterministic receipt and GitHub output encoding", () =>
    withFixture((directory) =>
      Effect.gen(function* providerAfterFixture() {
        const fileSystem = yield* FileSystem.FileSystem;
        const identity = {
          candidateCommit,
          configSha256: digest,
          deploymentInputSha256: "d".repeat(64),
          lockfileSha256: "e".repeat(64),
          schemaVersion: 1,
        };
        const deployments = [
          {
            id: "deployment-current",
            ignoredProviderField: "not-trusted",
            versions: [{ version_id: "version-current" }],
          },
        ];
        yield* Effect.all(
          [
            fileSystem.writeFileString(
              `${directory}/inventory.json`,
              JSON.stringify(inventory)
            ),
            fileSystem.writeFileString(
              `${directory}/identity.json`,
              JSON.stringify(identity)
            ),
            fileSystem.writeFileString(
              `${directory}/deployments.json`,
              JSON.stringify(deployments)
            ),
          ],
          { concurrency: 3, discard: true }
        );
        const config = {
          TAXKIT_WORKFLOW_EVIDENCE_ACCEPTED_PLAN_SHA256: digest,
          TAXKIT_WORKFLOW_EVIDENCE_ACCOUNT_ID: accountId,
          TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT: candidateCommit,
          TAXKIT_WORKFLOW_EVIDENCE_CURRENT_DEPLOYMENTS_PATH: `${directory}/deployments.json`,
          TAXKIT_WORKFLOW_EVIDENCE_ENVIRONMENT: "preview",
          TAXKIT_WORKFLOW_EVIDENCE_GITHUB_ENV_PATH: `${directory}/github-env-1.txt`,
          TAXKIT_WORKFLOW_EVIDENCE_IDENTITY_PATH: `${directory}/identity.json`,
          TAXKIT_WORKFLOW_EVIDENCE_INVENTORY_PATH: `${directory}/inventory.json`,
          TAXKIT_WORKFLOW_EVIDENCE_MODE: "provider",
          TAXKIT_WORKFLOW_EVIDENCE_PHASE: "after",
          TAXKIT_WORKFLOW_EVIDENCE_PREVIEW_PR_NUMBER: "24",
          TAXKIT_WORKFLOW_EVIDENCE_PROVIDER_READBACK_PATH: `${directory}/provider-1.json`,
          TAXKIT_WORKFLOW_EVIDENCE_ROLLBACK_IDENTITY: "preview-42",
          TAXKIT_WORKFLOW_EVIDENCE_RUN_ID: "42",
          TAXKIT_WORKFLOW_EVIDENCE_STAGE: "pr-24",
        };
        const first = yield* runWithConfig(config);
        const second = yield* runWithConfig({
          ...config,
          TAXKIT_WORKFLOW_EVIDENCE_GITHUB_ENV_PATH: `${directory}/github-env-2.txt`,
          TAXKIT_WORKFLOW_EVIDENCE_PROVIDER_READBACK_PATH: `${directory}/provider-2.json`,
        });
        expect(Result.isSuccess(first)).toBe(true);
        expect(Result.isSuccess(second)).toBe(true);
        const firstReceipt = yield* fileSystem.readFileString(
          `${directory}/provider-1.json`
        );
        const secondReceipt = yield* fileSystem.readFileString(
          `${directory}/provider-2.json`
        );
        expect(firstReceipt).toBe(secondReceipt);
        expect(
          yield* fileSystem.readFileString(`${directory}/github-env-1.txt`)
        ).toBe(
          yield* fileSystem.readFileString(`${directory}/github-env-2.txt`)
        );
        const receipt = yield* readJson(
          `${directory}/provider-1.json`,
          DeploymentWorkflowProviderReadback
        );
        expect(receipt.deploymentId).toBe("deployment-current");
        expect(firstReceipt).not.toContain("ignoredProviderField");
      })
    ));

  test("fails closed for unknown modes without exposing ambient secrets", async () => {
    const result = await runWithConfig({
      CLOUDFLARE_API_TOKEN: "forbidden-secret-value",
      TAXKIT_WORKFLOW_EVIDENCE_MODE: "shell",
    }).pipe(
      Effect.scoped,
      Effect.provide(BunServices.layer),
      Effect.runPromise
    );
    Result.match(result, {
      onFailure: (error) => {
        expect(error._tag).toBe("WorkflowEvidenceConfigError");
        expect(JSON.stringify(error)).not.toContain("forbidden-secret-value");
      },
      onSuccess: () => expect.unreachable(),
    });
  });

  test("uses separate safe tags for read, plan, provider and write failures", () =>
    withFixture((directory, repositoryRoot) =>
      Effect.gen(function* taggedFailuresFixture() {
        const fileSystem = yield* FileSystem.FileSystem;
        const missingInput = yield* runWithConfig({
          ...makePlanConfig(repositoryRoot, directory),
          TAXKIT_WORKFLOW_EVIDENCE_PLAN_TEXT_PATH: `${directory}/missing.txt`,
        });
        Result.match(missingInput, {
          onFailure: (error) =>
            expect(error._tag).toBe("WorkflowEvidenceInputReadError"),
          onSuccess: () => expect.unreachable(),
        });

        yield* fileSystem.writeFileString(
          `${directory}/alchemy-plan.txt`,
          "[Unexpected] create\n"
        );
        const invalidPlan = yield* runWithConfig(
          makePlanConfig(repositoryRoot, directory)
        );
        Result.match(invalidPlan, {
          onFailure: (error) => {
            expect(error._tag).toBe("WorkflowEvidencePlanProjectionError");
            if (error._tag === "WorkflowEvidencePlanProjectionError") {
              expect(error.reason).toBe(
                "beta.79 Alchemy plan output must contain exactly one plan summary"
              );
            }
          },
          onSuccess: () => expect.unreachable(),
        });

        yield* fileSystem.writeFileString(
          `${directory}/inventory.json`,
          "not-json"
        );
        const invalidProvider = yield* runWithConfig({
          TAXKIT_WORKFLOW_EVIDENCE_GITHUB_OUTPUT_PATH: `${directory}/github-output.txt`,
          TAXKIT_WORKFLOW_EVIDENCE_INVENTORY_PATH: `${directory}/inventory.json`,
          TAXKIT_WORKFLOW_EVIDENCE_MODE: "provider",
          TAXKIT_WORKFLOW_EVIDENCE_PHASE: "before",
          TAXKIT_WORKFLOW_EVIDENCE_STAGE: "pr-24",
        });
        Result.match(invalidProvider, {
          onFailure: (error) =>
            expect(error._tag).toBe("WorkflowEvidenceProviderDecodeError"),
          onSuccess: () => expect.unreachable(),
        });

        yield* fileSystem.writeFileString(
          `${directory}/alchemy-plan.txt`,
          "Plan: 1 to create\n[DocsWebsite] create\n"
        );
        const writeFailure = yield* runWithConfig({
          ...makePlanConfig(repositoryRoot, directory),
          TAXKIT_WORKFLOW_EVIDENCE_PLAN_PATH: directory,
        });
        Result.match(writeFailure, {
          onFailure: (error) =>
            Match.value(error).pipe(
              Match.tag("WorkflowEvidenceReceiptWriteError", (failure) =>
                expect(failure.role).toBe("plan-receipt")
              ),
              Match.orElse(() => expect.unreachable())
            ),
          onSuccess: () => expect.unreachable(),
        });
      })
    ));
});
