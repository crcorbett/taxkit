import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { Array as EffectArray, Effect, HashMap, Option, Schema } from "effect";

import automationJson from "./automation-register.json";
import { inspectDeploymentAutomationRegisters } from "./automation.policy.js";
import {
  DeploymentAutomationRegister,
  DeploymentControlRegister,
} from "./automation.schemas.js";
import controlsJson from "./controls.json";
import { deploymentRecordDigest } from "./policy.js";
import { DeploymentPlanReceipt } from "./schemas.js";
import {
  DeploymentWorkflowExternalReceipt,
  DeploymentWorkflowHostedProbe,
  DeploymentWorkflowProviderReadback,
} from "./workflow-receipts.schemas.js";

const decodeAutomations = (input: typeof Schema.Unknown.Type) =>
  Schema.decodeUnknownEffect(DeploymentAutomationRegister)(input);

const decodeRegisters = () =>
  Effect.all([
    Schema.decodeUnknownEffect(DeploymentAutomationRegister)(
      EffectArray.map(automationJson, (entry) => ({
        ...entry,
        externalState: { receipt: null, status: "not-established" },
      }))
    ),
    Schema.decodeUnknownEffect(DeploymentControlRegister)(controlsJson),
  ]);

describe("docs deployment automation admission", () => {
  test.effect(
    "accepts the exact three deployment automations and five controls before hosted establishment",
    () =>
      Effect.gen(function* () {
        const [automations, controls] = yield* decodeRegisters();
        expect(
          yield* inspectDeploymentAutomationRegisters(automations, controls)
        ).toEqual([]);
        expect(
          EffectArray.every(
            automations,
            (entry) => entry.externalState.status === "not-established"
          )
        ).toBe(true);
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("rejects a cancellable or weakly bound mutation", () =>
    Effect.gen(function* () {
      const [automations, controls] = yield* decodeRegisters();
      const contaminated = yield* decodeAutomations(
        EffectArray.map(automations, (entry) =>
          entry.id === "docs-preview-delivery"
            ? {
                ...entry,
                lock: {
                  ...entry.lock,
                  cancelInProgress: true,
                  group: "candidate-only",
                },
                plan: {
                  ...entry.plan,
                  equalReplanRequired: false,
                },
              }
            : entry
        )
      );
      expect(
        EffectArray.map(
          yield* inspectDeploymentAutomationRegisters(contaminated, controls),
          (item) => item.invariant
        )
      ).toEqual(["mutation-lock", "plan-equality"]);
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "rejects additive credentials, resources and weakened candidate ownership",
    () =>
      Effect.gen(function* () {
        const [automations, controls] = yield* decodeRegisters();
        const contaminated = yield* decodeAutomations(
          EffectArray.map(automations, (entry) =>
            entry.id === "docs-production-delivery"
              ? {
                  ...entry,
                  authority: {
                    ...entry.authority,
                    credentialIdentities: [
                      ...entry.authority.credentialIdentities,
                      "UNSCOPED_TOKEN",
                    ],
                    resources: [
                      ...entry.authority.resources,
                      "UnrelatedStack/prod/Other",
                    ],
                  },
                  failure: {
                    ...entry.failure,
                    stopConditions: EffectArray.filter(
                      entry.failure.stopConditions,
                      (condition) =>
                        condition !==
                        "quality result is absent or belongs to another commit"
                    ),
                  },
                  signal: {
                    ...entry.signal,
                    revisionSource: "floating branch tip",
                  },
                }
              : entry
          )
        );
        expect(
          EffectArray.map(
            yield* inspectDeploymentAutomationRegisters(contaminated, controls),
            (item) => item.invariant
          )
        ).toEqual(["candidate-trust"]);
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "requires the Production authority to admit normal rollback explicitly",
    () =>
      Effect.gen(function* () {
        const [automations, controls] = yield* decodeRegisters();
        const contaminated = yield* decodeAutomations(
          EffectArray.map(automations, (entry) =>
            entry.id === "docs-production-delivery"
              ? {
                  ...entry,
                  authority: {
                    ...entry.authority,
                    operations: ["production-deploy"],
                  },
                }
              : entry
          )
        );
        expect(
          EffectArray.map(
            yield* inspectDeploymentAutomationRegisters(contaminated, controls),
            (item) => item.invariant
          )
        ).toContain("mutation-lock");
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("rejects pull-request-head teardown code", () =>
    Effect.gen(function* () {
      const [automations, controls] = yield* decodeRegisters();
      const contaminated = yield* decodeAutomations(
        EffectArray.map(automations, (entry) =>
          entry.id === "docs-preview-teardown"
            ? {
                ...entry,
                signal: {
                  ...entry.signal,
                  revisionSource: "pull-request head",
                },
              }
            : entry
        )
      );
      expect(
        EffectArray.map(
          yield* inspectDeploymentAutomationRegisters(contaminated, controls),
          (item) => item.invariant
        )
      ).toContain("teardown-safety");
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "rejects every external-state establishment until hosted receipt admission exists",
    () =>
      Effect.gen(function* () {
        const [automations, controls] = yield* decodeRegisters();
        const contaminated = yield* decodeAutomations(
          EffectArray.map(automations, (entry) =>
            entry.id === "docs-preview-delivery"
              ? {
                  ...entry,
                  externalState: {
                    receipt: "docs/evidence/deployments/fake.json",
                    status: "established" as const,
                  },
                }
              : entry
          )
        );
        const firstControlOption = EffectArray.get(controls, 0);
        expect(Option.isSome(firstControlOption)).toBe(true);
        const firstControl = yield* Effect.fromOption(firstControlOption);
        const findings = EffectArray.map(
          yield* inspectDeploymentAutomationRegisters(contaminated, [
            ...controls,
            firstControl,
          ]),
          (item) => item.invariant
        );
        expect(findings).toEqual(["control-register", "external-proof"]);
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "rejects a hidden external receipt on a not-established entry",
    () =>
      Effect.gen(function* () {
        const [automations, controls] = yield* decodeRegisters();
        const contaminated = yield* decodeAutomations(
          EffectArray.map(automations, (entry) =>
            entry.id === "docs-preview-delivery"
              ? {
                  ...entry,
                  externalState: {
                    receipt: "docs/evidence/deployments/hidden.json",
                    status: "not-established" as const,
                  },
                }
              : entry
          )
        );
        expect(
          EffectArray.map(
            yield* inspectDeploymentAutomationRegisters(contaminated, controls),
            (item) => item.invariant
          )
        ).toContain("external-proof");
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "accepts an established entry only with the decoded matching workflow receipt",
    () =>
      Effect.gen(function* () {
        const [automations, controls] = yield* decodeRegisters();
        const previewOption = EffectArray.findFirst(
          automations,
          (entry) => entry.id === "docs-preview-delivery"
        );
        expect(Option.isSome(previewOption)).toBe(true);
        const preview = yield* Effect.fromOption(previewOption);
        const configSha256 = "c".repeat(64);
        const deploymentInputSha256 = "d".repeat(64);
        const lockfileSha256 = "e".repeat(64);
        const accountId = "f".repeat(32);
        const rollbackRecoveryIdentity = "preview-recovery";
        const candidateCommit = "b".repeat(40);
        const stage = "pr-15";
        const projection = {
          candidate: {
            deploymentInputSha256,
            exactCommit: candidateCommit,
            lockfileSha256,
          },
          configSha256,
          logicalResources: [
            {
              action: "create" as const,
              logicalId: "DocsWebsite" as const,
              resourceType: "Cloudflare.Worker" as const,
            },
          ],
          redaction: {
            ansiRemoved: true as const,
            secretValuesIncluded: false as const,
            timestampsExcludedFromDigest: true as const,
          },
          schemaVersion: 2 as const,
          stack: "TaxKitDocsCloudflare" as const,
          stage,
        };
        const acceptedPlanSha256 = yield* deploymentRecordDigest(projection);
        const receipt = yield* Schema.decodeUnknownEffect(
          DeploymentWorkflowExternalReceipt
        )({
          acceptedPlanSha256,
          accountId,
          automationId: preview.id,
          candidateCommit,
          configSha256,
          deploymentInputSha256,
          environment: preview.environment.id,
          hostedProofPath: "docs/evidence/deployments/workflow-hosted.json",
          lockGroup: preview.lock.group,
          lockfileSha256,
          nonClaims: ["This fixture is not provider proof."],
          observedAt: "2026-08-10T00:00:00Z",
          operation: "preview-deploy",
          planPath: "docs/evidence/deployments/workflow-plan.json",
          postcondition: "provider and hosted identities agree",
          previousVersionId: null,
          principal: preview.authority.principal,
          providerReadbackPath:
            "docs/evidence/deployments/workflow-provider.json",
          reportPath: null,
          rollbackRecoveryIdentity,
          schemaVersion: 1,
          stage,
          workflowCommit: "c".repeat(40),
          workflowInputPath: "docs/evidence/deployments/workflow-input.json",
          workflowPath: ".github/workflows/docs-preview.yml",
          workflowReceiptPath:
            "docs/evidence/deployments/workflow-preview.json",
          workflowRunId: "123",
          workflowRunPath: "docs/evidence/deployments/workflow-run.json",
        });
        const plan = yield* Schema.decodeUnknownEffect(DeploymentPlanReceipt)({
          acceptedBy: "Cooper",
          acceptedPlanSha256: receipt.acceptedPlanSha256,
          observedAt: "2026-08-10T00:00:00Z",
          operation: "preview-equal-replan",
          projection,
          receiptPath: Option.getOrElse(
            Option.fromNullishOr(receipt.planPath),
            () => "docs/evidence/deployments/plan.json"
          ),
          replanSha256: receipt.acceptedPlanSha256,
          schemaVersion: 2,
        });
        const provider = yield* Schema.decodeUnknownEffect(
          DeploymentWorkflowProviderReadback
        )({
          acceptedPlanSha256: receipt.acceptedPlanSha256,
          accountId,
          candidateCommit: receipt.candidateCommit,
          configSha256,
          deploymentId: "deployment-1",
          deploymentInputSha256,
          lockfileSha256,
          previewPrNumber: 15,
          previousVersionId: null,
          rollbackRecoveryIdentity,
          schemaVersion: 1,
          stage: receipt.stage,
          stateStoreId: "cloudflare-http",
          url: "https://docs-preview.workers.dev",
          versionId: "version-1",
          workerName: "taxkit-docs-preview",
        });
        const hosted = yield* Schema.decodeUnknownEffect(
          DeploymentWorkflowHostedProbe
        )({
          acceptedPlanSha256: receipt.acceptedPlanSha256,
          accountId,
          candidateCommit: receipt.candidateCommit,
          configSha256,
          deploymentId: provider.deploymentId,
          deploymentInputSha256,
          diagnostics: [],
          environment: "preview",
          lockfileSha256,
          previewPrNumber: 15,
          previousVersionId: null,
          rollbackRecoveryIdentity,
          screenshots: [
            {
              kind: "desktop",
              path: "docs/evidence/deployments/desktop.png",
              sha256: "0".repeat(64),
              viewport: { deviceScaleFactor: 1, height: 1000, width: 1440 },
            },
            {
              kind: "mobile",
              path: "docs/evidence/deployments/mobile.png",
              sha256: "0".repeat(64),
              viewport: { deviceScaleFactor: 1, height: 844, width: 390 },
            },
          ],
          stage: receipt.stage,
          stateStoreId: provider.stateStoreId,
          url: provider.url,
          versionId: provider.versionId,
          workerName: provider.workerName,
        });
        const nativeResource = yield* Effect.fromOption(
          EffectArray.get(plan.projection.logicalResources, 0)
        );
        const firstScreenshot = yield* Effect.fromOption(
          EffectArray.get(hosted.screenshots, 0)
        );
        const workflowRun = {
          candidateCommit: receipt.candidateCommit,
          conclusion: "success" as const,
          event: "workflow_dispatch",
          headBranch: "main" as const,
          headSha: receipt.workflowCommit,
          path: receipt.workflowPath,
          ref: "refs/heads/main" as const,
          status: "completed" as const,
          workflowCommit: receipt.workflowCommit,
          workflowName: "Docs Preview Deployment",
          workflowRunId: receipt.workflowRunId,
        };
        const workflowInput = {
          candidateCommit: receipt.candidateCommit,
          operation: "deploy" as const,
          prNumber: 15,
          sourceRef: "refs/heads/main" as const,
          workflowCommit: receipt.workflowCommit,
          workflowName: "Docs Preview Deployment",
          workflowPath: receipt.workflowPath,
          workflowRunId: receipt.workflowRunId,
        };
        const established = EffectArray.map(automations, (entry) =>
          entry.id === preview.id
            ? {
                ...entry,
                externalState: {
                  receipt: receipt.workflowReceiptPath,
                  status: "established" as const,
                },
              }
            : entry
        );
        expect(
          yield* inspectDeploymentAutomationRegisters(
            established,
            controls,
            HashMap.fromIterable([[preview.id, receipt]]),
            HashMap.fromIterable([
              [
                preview.id,
                {
                  hosted,
                  plan,
                  provider,
                  receipt,
                  workflowInput,
                  workflowRun,
                },
              ],
            ])
          )
        ).toEqual([]);

        expect(
          EffectArray.map(
            yield* inspectDeploymentAutomationRegisters(
              established,
              controls,
              HashMap.fromIterable([[preview.id, receipt]]),
              HashMap.fromIterable([
                [
                  preview.id,
                  {
                    hosted,
                    plan,
                    provider,
                    receipt,
                    workflowInput,
                    workflowRun: { ...workflowRun, headSha: "d".repeat(40) },
                  },
                ],
              ])
            ),
            (item) => item.invariant
          )
        ).toContain("external-proof");

        expect(
          EffectArray.map(
            yield* inspectDeploymentAutomationRegisters(
              established,
              controls,
              HashMap.fromIterable([[preview.id, receipt]]),
              HashMap.fromIterable([
                [
                  preview.id,
                  {
                    hosted,
                    plan,
                    provider,
                    receipt,
                    workflowInput: {
                      ...workflowInput,
                      candidateCommit: "d".repeat(40),
                    },
                    workflowRun,
                  },
                ],
              ])
            ),
            (item) => item.invariant
          )
        ).toContain("external-proof");

        expect(
          EffectArray.map(
            yield* inspectDeploymentAutomationRegisters(
              established,
              controls,
              HashMap.fromIterable([[preview.id, receipt]]),
              HashMap.fromIterable([
                [
                  preview.id,
                  {
                    hosted,
                    plan: {
                      ...plan,
                      projection: {
                        ...plan.projection,
                        logicalResources: [
                          {
                            ...nativeResource,
                            action: "delete" as const,
                          },
                        ],
                      },
                    },
                    provider,
                    receipt,
                    workflowInput,
                    workflowRun,
                  },
                ],
              ])
            ),
            (item) => item.invariant
          )
        ).toContain("external-proof");

        expect(
          EffectArray.map(
            yield* inspectDeploymentAutomationRegisters(
              established,
              controls,
              HashMap.fromIterable([[preview.id, receipt]]),
              HashMap.fromIterable([
                [
                  preview.id,
                  {
                    hosted,
                    plan: { ...plan, replanSha256: null },
                    provider,
                    receipt,
                    workflowInput,
                    workflowRun,
                  },
                ],
              ])
            ),
            (item) => item.invariant
          )
        ).toContain("external-proof");

        expect(
          EffectArray.map(
            yield* inspectDeploymentAutomationRegisters(
              established,
              controls,
              HashMap.fromIterable([[preview.id, receipt]]),
              HashMap.fromIterable([
                [
                  preview.id,
                  {
                    hosted,
                    plan,
                    provider,
                    receipt,
                    workflowInput,
                    workflowRun: {
                      ...workflowRun,
                      candidateCommit: "d".repeat(40),
                    },
                  },
                ],
              ])
            ),
            (item) => item.invariant
          )
        ).toContain("external-proof");

        expect(
          EffectArray.map(
            yield* inspectDeploymentAutomationRegisters(
              established,
              controls,
              HashMap.fromIterable([[preview.id, receipt]]),
              HashMap.fromIterable([
                [
                  preview.id,
                  {
                    hosted: {
                      ...hosted,
                      environment: "production",
                      screenshots: [firstScreenshot, firstScreenshot],
                    },
                    plan,
                    provider,
                    receipt,
                    workflowInput,
                    workflowRun,
                  },
                ],
              ])
            ),
            (item) => item.invariant
          )
        ).toContain("external-proof");
      }).pipe(Effect.provide(BunServices.layer))
  );
});
