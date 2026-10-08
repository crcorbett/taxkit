import {
  Array as EffectArray,
  Effect,
  HashMap,
  HashSet,
  Match,
  Option,
  Order,
  Record,
  Schema,
} from "effect";
import { sort as sortArray } from "effect/Array";

import type {
  DeploymentAutomation,
  DeploymentControl,
} from "./automation.schemas.js";
import { DeploymentAutomationFinding } from "./automation.schemas.js";
import { inspectDeploymentPlanReceipt } from "./policy.js";
import type {
  DeploymentWorkflowExternalEvidence,
  DeploymentWorkflowExternalReceipt,
} from "./workflow-receipts.schemas.js";
import {
  DeploymentWorkflowProviderReadback,
  DeploymentWorkflowTeardownReadback,
} from "./workflow-receipts.schemas.js";

const expectedAutomationIds = [
  "docs-preview-delivery",
  "docs-production-delivery",
  "docs-preview-teardown",
] as const;

const expectedControlIds = [
  "docs-workflow-candidate-trust",
  "docs-workflow-mutation-lock",
  "docs-preview-teardown-safety",
  "docs-workflow-receipt-reconciliation",
  "docs-workflow-cache-boundary",
] as const;

const finding = (
  invariant: (typeof DeploymentAutomationFinding.Type)["invariant"],
  target: string,
  recovery: string
) => new DeploymentAutomationFinding({ invariant, recovery, target });

const hasExactStrings = (
  actual: readonly string[],
  expected: readonly string[]
) =>
  actual.length === expected.length &&
  HashSet.size(HashSet.fromIterable(actual)) === expected.length &&
  EffectArray.every(expected, (value) => EffectArray.contains(actual, value));

const previewMutationGroup = ["taxkit-docs-preview-", "$", "{stage}"].join("");

const inspectMutation = (
  automation: DeploymentAutomation
): readonly DeploymentAutomationFinding[] => {
  const expectedOption = Record.get(
    {
      "docs-preview-delivery": {
        cancellation:
          "Planning and mutation queue behind the same exact Preview stage lock; no in-flight operation is cancelled.",
        credentials: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
        denied: [
          "automatic-orphan-deletion",
          "credential-write",
          "custom-domain-or-dns",
          "release-or-publication",
          "unrelated-provider-resource",
        ],
        environment: "taxkit-docs-preview",
        group: previewMutationGroup,
        operation: "preview-deploy",
        principal: "taxkit-docs-preview-workflow",
        resources: ["TaxKitDocsCloudflare/pr-N/DocsWebsite"],
        revisionSource: "exact same-repository pull-request head SHA",
        signal: "trusted-pull-request-dispatch",
        trigger:
          "separately dispatched trusted same-repository pull-request candidate",
      },
      "docs-preview-teardown": {
        cancellation:
          "The exact-stage destroy queues and cannot cancel an in-flight deploy or destroy.",
        credentials: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
        denied: [
          "automatic-orphan-deletion",
          "credential-write",
          "custom-domain-or-dns",
          "release-or-publication",
          "unrelated-provider-resource",
        ],
        environment: "taxkit-docs-preview",
        group: previewMutationGroup,
        operation: "preview-destroy",
        principal: "taxkit-docs-preview-teardown-workflow",
        resources: ["TaxKitDocsCloudflare/pr-N/DocsWebsite"],
        revisionSource:
          "reviewed-default-branch-workflow-commit-plus-closed-pr-number",
        signal: "pull-request-closed",
        trigger: "same-repository pull request closed",
      },
      "docs-production-delivery": {
        cancellation:
          "Planning, deploy and rollback queue behind the same fixed Production stage lock; no in-flight operation is cancelled.",
        credentials: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
        denied: [
          "automatic-orphan-deletion",
          "credential-write",
          "custom-domain-or-dns",
          "release-or-publication",
          "unrelated-provider-resource",
        ],
        environment: "taxkit-docs-production",
        group: "taxkit-docs-production-prod",
        operation: "production-deploy",
        principal: "taxkit-docs-production-workflow",
        resources: ["TaxKitDocsCloudflare/prod/DocsWebsite"],
        revisionSource: "exact accepted candidate SHA",
        signal: "production-dispatch",
        trigger:
          "separately dispatched exact candidate after accepted Preview evidence",
      },
    },
    automation.id
  );
  return Option.match(expectedOption, {
    onNone: () => [
      finding(
        "automation-register",
        `tools/docs-deployment/automation-register.json:${automation.id}`,
        "Retain exactly the three named deployment automations."
      ),
    ],
    onSome: (expected) => {
      const lockMismatch = !EffectArray.every(
        [
          automation.environment.id === expected.environment,
          automation.authority.environment === expected.environment,
          automation.signal.kind === expected.signal,
          automation.lock.group === expected.group,
          automation.lock.scope === "stage",
          automation.lock.cancelInProgress === false,
          automation.cancellation === expected.cancellation,
          hasExactStrings(
            automation.authority.operations,
            automation.id === "docs-production-delivery"
              ? ["production-deploy", "production-rollback"]
              : [expected.operation]
          ),
        ],
        Boolean
      );
      const lockFindings = lockMismatch
        ? [
            finding(
              "mutation-lock",
              `tools/docs-deployment/automation-register.json:${automation.id}`,
              "Bind the exact environment-scoped credential, operation and non-cancellable stage lock."
            ),
          ]
        : [];
      const hasCandidateQualityStop =
        automation.id === "docs-preview-teardown" ||
        EffectArray.contains(
          automation.failure.stopConditions,
          "quality result is absent or belongs to another commit"
        );
      const candidateMismatch = !EffectArray.every(
        [
          automation.authority.principal === expected.principal,
          automation.environment.trigger === expected.trigger,
          automation.signal.revisionSource === expected.revisionSource,
          hasExactStrings(
            automation.authority.credentialIdentities,
            expected.credentials
          ),
          hasExactStrings(automation.authority.resources, expected.resources),
          hasExactStrings(automation.authority.denied, expected.denied),
          hasCandidateQualityStop,
        ],
        Boolean
      );
      const candidateFindings = candidateMismatch
        ? [
            finding(
              "candidate-trust",
              `tools/docs-deployment/automation-register.json:${automation.id}`,
              "Bind the exact principal, credential identities, resource set, denials, revision source, trigger and candidate Quality stop."
            ),
          ]
        : [];
      const planFindings =
        !automation.plan.acceptedDigestRequired ||
        !automation.plan.equalReplanRequired ||
        !automation.plan.providerReadbackRequired
          ? [
              finding(
                "plan-equality",
                `tools/docs-deployment/automation-register.json:${automation.id}.plan`,
                "Require accepted canonical digest, equal replan and provider/state readback before mutation."
              ),
            ]
          : [];
      return [...lockFindings, ...candidateFindings, ...planFindings];
    },
  });
};

export const inspectDeploymentAutomationRegisters = (
  automations: readonly DeploymentAutomation[],
  controls: readonly DeploymentControl[],
  externalReceipts: HashMap.HashMap<
    DeploymentAutomation["id"],
    DeploymentWorkflowExternalReceipt
  > = HashMap.empty(),
  externalEvidence: HashMap.HashMap<
    DeploymentAutomation["id"],
    DeploymentWorkflowExternalEvidence
  > = HashMap.empty()
) =>
  Effect.gen(function* () {
    const registerFindings = [
      ...(hasExactStrings(
        EffectArray.map(automations, (entry) => entry.id),
        expectedAutomationIds
      )
        ? []
        : [
            finding(
              "automation-register",
              "tools/docs-deployment/automation-register.json",
              "Retain exactly Preview, Production and PR-close teardown automation entries."
            ),
          ]),
      ...(hasExactStrings(
        EffectArray.map(controls, (entry) => entry.id),
        expectedControlIds
      )
        ? []
        : [
            finding(
              "control-register",
              "tools/docs-deployment/controls.json",
              "Retain exactly the five deployment automation controls."
            ),
          ]),
    ];
    const automationFindings = yield* Effect.forEach(
      automations,
      (automation) =>
        Effect.gen(function* () {
          const stateFindings =
            (automation.externalState.status === "not-established" &&
              automation.externalState.receipt !== null) ||
            (automation.externalState.status === "established" &&
              automation.externalState.receipt === null)
              ? [
                  finding(
                    "external-proof",
                    `tools/docs-deployment/automation-register.json:${automation.id}.externalState`,
                    "Keep a non-established entry receipt-free, or establish it only with a named decoded workflow receipt."
                  ),
                ]
              : [];
          const establishedFindings =
            automation.externalState.status === "established"
              ? yield* Option.match(
                  Option.all([
                    Option.fromNullishOr(automation.externalState.receipt),
                    HashMap.get(externalReceipts, automation.id),
                    HashMap.get(externalEvidence, automation.id),
                  ]),
                  {
                    onNone: () =>
                      Effect.succeed([
                        finding(
                          "external-proof",
                          `tools/docs-deployment/automation-register.json:${automation.id}.externalState`,
                          "Decode the named workflow receipt and verify exact workflow, environment, principal, stage lock, candidate, plan and provider/hosted postconditions before establishing external state."
                        ),
                      ]),
                    onSome: ([_receiptPath, receipt, evidence]) =>
                      // oxlint-disable-next-line eslint/complexity -- this bounded cross-register comparison keeps every retained receipt invariant together.
                      Effect.gen(function* () {
                        const {
                          plan,
                          provider,
                          hosted,
                          workflowRun,
                          workflowInput,
                        } = evidence;
                        const workflowPathOption = Record.get(
                          {
                            "docs-preview-delivery":
                              ".github/workflows/docs-preview.yml",
                            "docs-preview-teardown":
                              ".github/workflows/docs-preview-teardown.yml",
                            "docs-production-delivery":
                              ".github/workflows/docs-production.yml",
                          } as const,
                          automation.id
                        );
                        const workflowPath = Option.getOrElse(
                          workflowPathOption,
                          () => ""
                        );
                        const workflowNameOption = Record.get(
                          {
                            "docs-preview-delivery": "Docs Preview Deployment",
                            "docs-preview-teardown": "Docs Preview Teardown",
                            "docs-production-delivery":
                              "Docs Production Deployment",
                          } as const,
                          automation.id
                        );
                        const workflowName = Option.getOrElse(
                          workflowNameOption,
                          () => ""
                        );
                        const operationMismatch =
                          automation.id === "docs-production-delivery"
                            ? !EffectArray.contains(
                                ["production-deploy", "production-rollback"],
                                receipt.operation
                              )
                            : receipt.operation !==
                              (automation.id === "docs-preview-delivery"
                                ? "preview-deploy"
                                : "preview-destroy");
                        const isTeardown =
                          automation.id === "docs-preview-teardown";
                        const workflowProvider: DeploymentWorkflowProviderReadback | null =
                          Schema.is(DeploymentWorkflowProviderReadback)(
                            provider
                          )
                            ? provider
                            : null;
                        const teardownProvider: DeploymentWorkflowTeardownReadback | null =
                          Schema.is(DeploymentWorkflowTeardownReadback)(
                            provider
                          )
                            ? provider
                            : null;
                        const providerIdentityMismatch = isTeardown
                          ? teardownProvider === null ||
                            teardownProvider.candidateCommit !==
                              receipt.candidateCommit ||
                            teardownProvider.stage !== receipt.stage ||
                            !/^pr-[1-9]\d*$/u.test(teardownProvider.stage) ||
                            teardownProvider.accountId !== receipt.accountId ||
                            teardownProvider.stateStoreId.length === 0 ||
                            (teardownProvider.preexistingStage
                              ? teardownProvider.formerWorkerName === null ||
                                teardownProvider.formerWorkerUrl === null
                              : teardownProvider.formerWorkerName !== null ||
                                teardownProvider.formerWorkerUrl !== null) ||
                            teardownProvider.configSha256 !==
                              receipt.configSha256 ||
                            teardownProvider.deploymentInputSha256 !==
                              receipt.deploymentInputSha256 ||
                            teardownProvider.lockfileSha256 !==
                              receipt.lockfileSha256
                          : workflowProvider === null ||
                            workflowProvider.candidateCommit !==
                              receipt.candidateCommit ||
                            workflowProvider.stage !== receipt.stage ||
                            workflowProvider.acceptedPlanSha256 !==
                              receipt.acceptedPlanSha256 ||
                            workflowProvider.accountId !== receipt.accountId ||
                            workflowProvider.configSha256 !==
                              receipt.configSha256 ||
                            workflowProvider.deploymentInputSha256 !==
                              receipt.deploymentInputSha256 ||
                            workflowProvider.lockfileSha256 !==
                              receipt.lockfileSha256 ||
                            workflowProvider.previousVersionId !==
                              receipt.previousVersionId ||
                            workflowProvider.rollbackRecoveryIdentity !==
                              receipt.rollbackRecoveryIdentity ||
                            (automation.id === "docs-preview-delivery"
                              ? workflowProvider.previewPrNumber === null ||
                                workflowProvider.stage !==
                                  `pr-${workflowProvider.previewPrNumber}`
                              : workflowProvider.previewPrNumber !== null ||
                                workflowProvider.stage !== "prod");
                        const expectedPlanOperation = Match.value(
                          receipt.operation
                        ).pipe(
                          Match.when(
                            "preview-deploy",
                            () => "preview-equal-replan"
                          ),
                          Match.when(
                            "preview-destroy",
                            () => "preview-destroy"
                          ),
                          Match.orElse(() => "production-equal-replan")
                        );
                        const teardownActionMismatch =
                          receipt.operation === "preview-destroy" &&
                          plan !== null &&
                          !(
                            EffectArray.every(
                              plan.projection.logicalResources,
                              ({ action }) => action === "delete"
                            ) ||
                            EffectArray.every(
                              plan.projection.logicalResources,
                              ({ action }) => action === "noop"
                            )
                          );
                        const deployActionMismatch =
                          receipt.operation !== "preview-destroy" &&
                          plan !== null &&
                          EffectArray.some(
                            plan.projection.logicalResources,
                            ({ action }) => action === "delete"
                          );
                        const planContractMismatch =
                          plan === null ||
                          (yield* inspectDeploymentPlanReceipt(plan)).length !==
                            0 ||
                          teardownActionMismatch ||
                          deployActionMismatch;
                        const planMismatch =
                          planContractMismatch ||
                          plan.operation !== expectedPlanOperation ||
                          plan.receiptPath !== receipt.planPath ||
                          plan.acceptedPlanSha256 !==
                            receipt.acceptedPlanSha256 ||
                          plan.projection.candidate.exactCommit !==
                            receipt.candidateCommit ||
                          plan.projection.stage !== receipt.stage ||
                          plan.projection.configSha256 !==
                            receipt.configSha256 ||
                          plan.projection.candidate.deploymentInputSha256 !==
                            receipt.deploymentInputSha256 ||
                          plan.projection.candidate.lockfileSha256 !==
                            receipt.lockfileSha256;
                        const hostedIdentityMismatch = Match.value(
                          isTeardown
                        ).pipe(
                          Match.when(true, () => hosted !== null),
                          Match.orElse(() => {
                            if (hosted === null || workflowProvider === null) {
                              return true;
                            }
                            const expectedHostedEnvironment = Match.value(
                              receipt.operation
                            ).pipe(
                              Match.when(
                                "production-rollback",
                                () => "rollback"
                              ),
                              Match.orElse(() =>
                                workflowProvider.stage === "prod"
                                  ? "production"
                                  : "preview"
                              )
                            );
                            const screenshotKinds = HashSet.fromIterable(
                              EffectArray.map(
                                hosted.screenshots,
                                ({ kind }) => kind
                              )
                            );
                            return EffectArray.some(
                              [
                                hosted.accountId !== workflowProvider.accountId,
                                hosted.stateStoreId !==
                                  workflowProvider.stateStoreId,
                                hosted.candidateCommit !==
                                  receipt.candidateCommit,
                                hosted.stage !== workflowProvider.stage,
                                hosted.acceptedPlanSha256 !==
                                  workflowProvider.acceptedPlanSha256,
                                hosted.configSha256 !==
                                  workflowProvider.configSha256,
                                hosted.deploymentInputSha256 !==
                                  workflowProvider.deploymentInputSha256,
                                hosted.lockfileSha256 !==
                                  workflowProvider.lockfileSha256,
                                hosted.previousVersionId !==
                                  workflowProvider.previousVersionId,
                                hosted.previewPrNumber !==
                                  workflowProvider.previewPrNumber,
                                hosted.rollbackRecoveryIdentity !==
                                  workflowProvider.rollbackRecoveryIdentity,
                                receipt.operation === "production-rollback" &&
                                  (workflowProvider.previousVersionId ===
                                    null ||
                                    workflowProvider.versionId ===
                                      workflowProvider.previousVersionId),
                                hosted.deploymentId !==
                                  workflowProvider.deploymentId,
                                hosted.versionId !== workflowProvider.versionId,
                                hosted.workerName !==
                                  workflowProvider.workerName,
                                hosted.url !== workflowProvider.url,
                                hosted.diagnostics.length !== 0,
                                hosted.environment !==
                                  expectedHostedEnvironment,
                                hosted.screenshots.length !== 2,
                                HashSet.size(screenshotKinds) !== 2,
                                !HashSet.has(screenshotKinds, "desktop"),
                                !HashSet.has(screenshotKinds, "mobile"),
                              ],
                              Boolean
                            );
                          })
                        );
                        const allowedEvents = isTeardown
                          ? ["pull_request", "workflow_dispatch"]
                          : ["workflow_dispatch"];
                        const workflowRunMismatch =
                          workflowRun === null ||
                          workflowRun.workflowRunId !== receipt.workflowRunId ||
                          workflowRun.candidateCommit !==
                            receipt.candidateCommit ||
                          workflowRun.workflowCommit !==
                            receipt.workflowCommit ||
                          workflowRun.path !== receipt.workflowPath ||
                          workflowRun.workflowName !== workflowName ||
                          workflowRun.ref !== "refs/heads/main" ||
                          workflowRun.status !== "completed" ||
                          workflowRun.conclusion !== "success" ||
                          !EffectArray.contains(
                            allowedEvents,
                            workflowRun.event
                          ) ||
                          (isTeardown
                            ? workflowRun.headBranch.length === 0 ||
                              workflowRun.headSha.length !== 40
                            : workflowRun.headBranch !== "main" ||
                              workflowRun.headSha !== receipt.workflowCommit);
                        const expectedInputOperation = Match.value(
                          receipt.operation
                        ).pipe(
                          Match.whenOr(
                            "preview-deploy",
                            "production-deploy",
                            () => "deploy"
                          ),
                          Match.when("production-rollback", () => "rollback"),
                          Match.orElse(() => "destroy")
                        );
                        const expectedPrNumber =
                          automation.id === "docs-preview-delivery" ||
                          automation.id === "docs-preview-teardown"
                            ? Math.trunc(Number(receipt.stage.slice(3)))
                            : null;
                        const workflowInputMismatch =
                          workflowInput === null ||
                          workflowInput.candidateCommit !==
                            receipt.candidateCommit ||
                          workflowInput.workflowCommit !==
                            receipt.workflowCommit ||
                          workflowInput.workflowRunId !==
                            receipt.workflowRunId ||
                          workflowInput.workflowPath !== receipt.workflowPath ||
                          workflowInput.workflowName !== workflowName ||
                          workflowInput.sourceRef !== "refs/heads/main" ||
                          workflowInput.operation !== expectedInputOperation ||
                          workflowInput.prNumber !== expectedPrNumber;
                        const receiptMismatch =
                          automation.externalState.receipt !==
                            receipt.workflowReceiptPath ||
                          receipt.automationId !== automation.id ||
                          receipt.environment !== automation.environment.id ||
                          receipt.principal !==
                            automation.authority.principal ||
                          receipt.lockGroup !== automation.lock.group ||
                          operationMismatch ||
                          receipt.workflowPath !== workflowPath ||
                          receipt.acceptedPlanSha256 === null ||
                          receipt.planPath === null ||
                          receipt.providerReadbackPath === null ||
                          receipt.reportPath !== null ||
                          (isTeardown
                            ? receipt.hostedProofPath !== null
                            : receipt.hostedProofPath === null) ||
                          receipt.workflowRunPath.length === 0 ||
                          workflowRunMismatch ||
                          receipt.workflowInputPath.length === 0 ||
                          workflowInputMismatch ||
                          providerIdentityMismatch ||
                          planMismatch ||
                          hostedIdentityMismatch;
                        return receiptMismatch
                          ? [
                              finding(
                                "external-proof",
                                `tools/docs-deployment/automation-register.json:${automation.id}.externalState`,
                                "Decode the named workflow receipt and verify exact workflow, environment, principal, stage lock, candidate, plan and provider/hosted postconditions before establishing external state."
                              ),
                            ]
                          : [];
                      }),
                  }
                )
              : [];
          return [
            ...inspectMutation(automation),
            ...stateFindings,
            ...establishedFindings,
          ];
        })
    );
    const teardown = EffectArray.findFirst(
      automations,
      (entry) => entry.id === "docs-preview-teardown"
    );
    const teardownFindings = Option.exists(
      teardown,
      (entry) =>
        entry.signal.revisionSource ===
          "reviewed-default-branch-workflow-commit-plus-closed-pr-number" &&
        EffectArray.some(entry.failure.stopConditions, (condition) =>
          condition.includes("pull-request head")
        )
    )
      ? []
      : [
          finding(
            "teardown-safety",
            "tools/docs-deployment/automation-register.json:docs-preview-teardown",
            "Use reviewed default-branch code, derive only pr-N and reject pull-request-head execution."
          ),
        ];
    return sortArray(
      Order.make<DeploymentAutomationFinding>((left, right) => {
        const comparison = `${left.invariant}:${left.target}`.localeCompare(
          `${right.invariant}:${right.target}`
        );
        if (comparison < 0) {
          return -1;
        }
        if (comparison > 0) {
          return 1;
        }
        return 0;
      })
    )([
      ...registerFindings,
      ...EffectArray.flatten(automationFindings),
      ...teardownFindings,
    ]);
  });
