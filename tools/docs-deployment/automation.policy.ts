import { Array as EffectArray, HashSet } from "effect";

import type {
  DeploymentAutomation,
  DeploymentControl,
} from "./automation.schemas.js";
import { DeploymentAutomationFinding } from "./automation.schemas.js";
import { inspectDeploymentPlanReceipt } from "./policy.js";
import type {
  DeploymentWorkflowExternalEvidence,
  DeploymentWorkflowExternalReceipt,
  DeploymentWorkflowProviderReadback,
  DeploymentWorkflowInputReadback,
  DeploymentWorkflowRunReadback,
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

const hasExactIds = (actual: readonly string[], expected: readonly string[]) =>
  actual.length === expected.length &&
  HashSet.size(HashSet.fromIterable(actual)) === expected.length &&
  EffectArray.every(expected, (id) => actual.includes(id));

const hasExactStrings = (
  actual: readonly string[],
  expected: readonly string[]
) =>
  actual.length === expected.length &&
  HashSet.size(HashSet.fromIterable(actual)) === expected.length &&
  EffectArray.every(expected, (value) => actual.includes(value));

const previewMutationGroup = ["taxkit-docs-preview-", "$", "{stage}"].join("");

const inspectMutation = (
  automation: DeploymentAutomation
): readonly DeploymentAutomationFinding[] => {
  const expected = {
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
  }[automation.id];
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
  const findings = lockMismatch
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
    automation.failure.stopConditions.includes(
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
  if (candidateMismatch) {
    findings.push(
      finding(
        "candidate-trust",
        `tools/docs-deployment/automation-register.json:${automation.id}`,
        "Bind the exact principal, credential identities, resource set, denials, revision source, trigger and candidate Quality stop."
      )
    );
  }
  if (
    !automation.plan.acceptedDigestRequired ||
    !automation.plan.equalReplanRequired ||
    !automation.plan.providerReadbackRequired
  ) {
    findings.push(
      finding(
        "plan-equality",
        `tools/docs-deployment/automation-register.json:${automation.id}.plan`,
        "Require accepted canonical digest, equal replan and provider/state readback before mutation."
      )
    );
  }
  return findings;
};

// oxlint-disable-next-line eslint/complexity -- one bounded cross-register policy keeps the exact automation graph visible
export const inspectDeploymentAutomationRegisters = (
  automations: readonly DeploymentAutomation[],
  controls: readonly DeploymentControl[],
  externalReceipts: ReadonlyMap<
    DeploymentAutomation["id"],
    DeploymentWorkflowExternalReceipt
  > = new Map(),
  externalEvidence: ReadonlyMap<
    DeploymentAutomation["id"],
    DeploymentWorkflowExternalEvidence
  > = new Map()
): readonly DeploymentAutomationFinding[] => {
  const findings: DeploymentAutomationFinding[] = [];
  if (
    !hasExactIds(
      EffectArray.map(automations, (entry) => entry.id),
      expectedAutomationIds
    )
  ) {
    findings.push(
      finding(
        "automation-register",
        "tools/docs-deployment/automation-register.json",
        "Retain exactly Preview, Production and PR-close teardown automation entries."
      )
    );
  }
  if (
    !hasExactIds(
      EffectArray.map(controls, (entry) => entry.id),
      expectedControlIds
    )
  ) {
    findings.push(
      finding(
        "control-register",
        "tools/docs-deployment/controls.json",
        "Retain exactly the five deployment automation controls."
      )
    );
  }
  for (const automation of automations) {
    findings.push(...inspectMutation(automation));
    if (
      (automation.externalState.status === "not-established" &&
        automation.externalState.receipt !== null) ||
      (automation.externalState.status === "established" &&
        automation.externalState.receipt === null)
    ) {
      findings.push(
        finding(
          "external-proof",
          `tools/docs-deployment/automation-register.json:${automation.id}.externalState`,
          "Keep a non-established entry receipt-free, or establish it only with a named decoded workflow receipt."
        )
      );
    }
    if (automation.externalState.status === "established") {
      const receipt =
        automation.externalState.receipt === null
          ? undefined
          : externalReceipts.get(automation.id);
      const evidence = externalEvidence.get(automation.id);
      const plan = evidence?.plan ?? null;
      const provider = evidence?.provider ?? null;
      const hosted = evidence?.hosted ?? null;
      const workflowRun: DeploymentWorkflowRunReadback | null =
        evidence?.workflowRun ?? null;
      const workflowInput: DeploymentWorkflowInputReadback | null =
        evidence?.workflowInput ?? null;
      const workflowPath = (
        {
          "docs-preview-delivery": ".github/workflows/docs-preview.yml",
          "docs-preview-teardown":
            ".github/workflows/docs-preview-teardown.yml",
          "docs-production-delivery": ".github/workflows/docs-production.yml",
        } as const
      )[automation.id];
      const workflowName = (
        {
          "docs-preview-delivery": "Docs Preview Deployment",
          "docs-preview-teardown": "Docs Preview Teardown",
          "docs-production-delivery": "Docs Production Deployment",
        } as const
      )[automation.id];
      let operationMismatch = receipt === undefined;
      if (!operationMismatch && receipt !== undefined) {
        if (automation.id === "docs-production-delivery") {
          operationMismatch = ![
            "production-deploy",
            "production-rollback",
          ].includes(receipt.operation);
        } else {
          const expectedOperation =
            automation.id === "docs-preview-delivery"
              ? "preview-deploy"
              : "preview-destroy";
          operationMismatch = receipt.operation !== expectedOperation;
        }
      }
      const isTeardown = automation.id === "docs-preview-teardown";
      const workflowProvider: DeploymentWorkflowProviderReadback | null =
        provider !== null && "acceptedPlanSha256" in provider ? provider : null;
      const teardownProvider: DeploymentWorkflowTeardownReadback | null =
        provider !== null && "providerWorkerAbsent" in provider
          ? provider
          : null;
      const providerIdentityMismatch = isTeardown
        ? teardownProvider === null ||
          teardownProvider.candidateCommit !== receipt?.candidateCommit ||
          teardownProvider.stage !== receipt?.stage ||
          !/^pr-[1-9]\d*$/u.test(teardownProvider.stage) ||
          teardownProvider.accountId !== receipt?.accountId ||
          teardownProvider.stateStoreId.length === 0 ||
          (teardownProvider.preexistingStage
            ? teardownProvider.formerWorkerName === null ||
              teardownProvider.formerWorkerUrl === null
            : teardownProvider.formerWorkerName !== null ||
              teardownProvider.formerWorkerUrl !== null) ||
          teardownProvider.configSha256 !== receipt?.configSha256 ||
          teardownProvider.deploymentInputSha256 !==
            receipt?.deploymentInputSha256 ||
          teardownProvider.lockfileSha256 !== receipt?.lockfileSha256
        : workflowProvider === null ||
          workflowProvider.candidateCommit !== receipt?.candidateCommit ||
          workflowProvider.stage !== receipt?.stage ||
          workflowProvider.acceptedPlanSha256 !== receipt?.acceptedPlanSha256 ||
          workflowProvider.accountId !== receipt?.accountId ||
          workflowProvider.configSha256 !== receipt?.configSha256 ||
          workflowProvider.deploymentInputSha256 !==
            receipt?.deploymentInputSha256 ||
          workflowProvider.lockfileSha256 !== receipt?.lockfileSha256 ||
          workflowProvider.previousVersionId !== receipt?.previousVersionId ||
          workflowProvider.rollbackRecoveryIdentity !==
            receipt?.rollbackRecoveryIdentity ||
          (automation.id === "docs-preview-delivery"
            ? workflowProvider.previewPrNumber === null ||
              workflowProvider.stage !==
                `pr-${workflowProvider.previewPrNumber}`
            : workflowProvider.previewPrNumber !== null ||
              workflowProvider.stage !== "prod");
      let expectedPlanOperation = "production-equal-replan";
      if (receipt?.operation === "preview-deploy") {
        expectedPlanOperation = "preview-equal-replan";
      } else if (receipt?.operation === "preview-destroy") {
        expectedPlanOperation = "preview-destroy";
      }
      const teardownActionMismatch =
        receipt?.operation === "preview-destroy" &&
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
        receipt?.operation !== "preview-destroy" &&
        plan !== null &&
        EffectArray.some(
          plan.projection.logicalResources,
          ({ action }) => action === "delete"
        );
      const planContractMismatch =
        plan === null ||
        inspectDeploymentPlanReceipt(plan).length !== 0 ||
        teardownActionMismatch ||
        deployActionMismatch;
      const planMismatch =
        planContractMismatch ||
        receipt === undefined ||
        plan.operation !== expectedPlanOperation ||
        plan.receiptPath !== receipt.planPath ||
        plan.acceptedPlanSha256 !== receipt.acceptedPlanSha256 ||
        plan.projection.candidate.exactCommit !== receipt.candidateCommit ||
        plan.projection.stage !== receipt.stage ||
        plan.projection.configSha256 !== receipt.configSha256 ||
        plan.projection.candidate.deploymentInputSha256 !==
          receipt.deploymentInputSha256 ||
        plan.projection.candidate.lockfileSha256 !== receipt.lockfileSha256;
      let hostedIdentityMismatch = false;
      if (isTeardown) {
        hostedIdentityMismatch = hosted !== null;
      } else if (
        hosted === null ||
        receipt === undefined ||
        workflowProvider === null
      ) {
        hostedIdentityMismatch = true;
      } else {
        let expectedHostedEnvironment = "preview";
        if (receipt.operation === "production-rollback") {
          expectedHostedEnvironment = "rollback";
        } else if (workflowProvider.stage === "prod") {
          expectedHostedEnvironment = "production";
        }
        const screenshotKinds = new Set(
          EffectArray.map(hosted.screenshots, ({ kind }) => kind)
        );
        hostedIdentityMismatch = EffectArray.some(
          [
            hosted.accountId !== workflowProvider.accountId,
            hosted.stateStoreId !== workflowProvider.stateStoreId,
            hosted.candidateCommit !== receipt.candidateCommit,
            hosted.stage !== workflowProvider.stage,
            hosted.acceptedPlanSha256 !== workflowProvider.acceptedPlanSha256,
            hosted.configSha256 !== workflowProvider.configSha256,
            hosted.deploymentInputSha256 !==
              workflowProvider.deploymentInputSha256,
            hosted.lockfileSha256 !== workflowProvider.lockfileSha256,
            hosted.previousVersionId !== workflowProvider.previousVersionId,
            hosted.previewPrNumber !== workflowProvider.previewPrNumber,
            hosted.rollbackRecoveryIdentity !==
              workflowProvider.rollbackRecoveryIdentity,
            receipt.operation === "production-rollback" &&
              (workflowProvider.previousVersionId === null ||
                workflowProvider.versionId ===
                  workflowProvider.previousVersionId),
            hosted.deploymentId !== workflowProvider.deploymentId,
            hosted.versionId !== workflowProvider.versionId,
            hosted.workerName !== workflowProvider.workerName,
            hosted.url !== workflowProvider.url,
            hosted.diagnostics.length !== 0,
            hosted.environment !== expectedHostedEnvironment,
            hosted.screenshots.length !== 2,
            screenshotKinds.size !== 2,
            !screenshotKinds.has("desktop"),
            !screenshotKinds.has("mobile"),
          ],
          Boolean
        );
      }
      let workflowRunMismatch = workflowRun === null || receipt === undefined;
      if (
        !workflowRunMismatch &&
        workflowRun !== null &&
        receipt !== undefined
      ) {
        let allowedEvents: readonly string[] = ["workflow_dispatch"];
        if (isTeardown) {
          allowedEvents = ["pull_request", "workflow_dispatch"];
        }
        workflowRunMismatch =
          workflowRun.workflowRunId !== receipt.workflowRunId ||
          workflowRun.candidateCommit !== receipt.candidateCommit ||
          workflowRun.workflowCommit !== receipt.workflowCommit ||
          workflowRun.path !== receipt.workflowPath ||
          workflowRun.workflowName !== workflowName ||
          workflowRun.ref !== "refs/heads/main" ||
          workflowRun.status !== "completed" ||
          workflowRun.conclusion !== "success" ||
          !allowedEvents.includes(workflowRun.event) ||
          (isTeardown
            ? workflowRun.headBranch.length === 0 ||
              workflowRun.headSha.length !== 40
            : workflowRun.headBranch !== "main" ||
              workflowRun.headSha !== receipt.workflowCommit);
      }
      let workflowInputMismatch =
        workflowInput === null || receipt === undefined;
      if (
        !workflowInputMismatch &&
        workflowInput !== null &&
        receipt !== undefined
      ) {
        let expectedInputOperation: "deploy" | "destroy" | "rollback";
        if (
          receipt.operation === "preview-deploy" ||
          receipt.operation === "production-deploy"
        ) {
          expectedInputOperation = "deploy";
        } else if (receipt.operation === "production-rollback") {
          expectedInputOperation = "rollback";
        } else if (receipt.operation === "preview-destroy") {
          expectedInputOperation = "destroy";
        } else {
          expectedInputOperation = "destroy";
        }
        let expectedPrNumber: number | null = null;
        if (
          automation.id === "docs-preview-delivery" ||
          automation.id === "docs-preview-teardown"
        ) {
          expectedPrNumber = Math.trunc(Number(receipt.stage.slice(3)));
        }
        workflowInputMismatch =
          workflowInput.candidateCommit !== receipt.candidateCommit ||
          workflowInput.workflowCommit !== receipt.workflowCommit ||
          workflowInput.workflowRunId !== receipt.workflowRunId ||
          workflowInput.workflowPath !== receipt.workflowPath ||
          workflowInput.workflowName !== workflowName ||
          workflowInput.sourceRef !== "refs/heads/main" ||
          workflowInput.operation !== expectedInputOperation ||
          workflowInput.prNumber !== expectedPrNumber;
      }
      const receiptMismatch =
        receipt === undefined ||
        evidence === undefined ||
        automation.externalState.receipt !== receipt?.workflowReceiptPath ||
        receipt.automationId !== automation.id ||
        receipt.environment !== automation.environment.id ||
        receipt.principal !== automation.authority.principal ||
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
      if (receiptMismatch) {
        findings.push(
          finding(
            "external-proof",
            `tools/docs-deployment/automation-register.json:${automation.id}.externalState`,
            "Decode the named workflow receipt and verify exact workflow, environment, principal, stage lock, candidate, plan and provider/hosted postconditions before establishing external state."
          )
        );
      }
    }
  }
  const teardown = automations.find(
    (entry) => entry.id === "docs-preview-teardown"
  );
  if (
    teardown === undefined ||
    teardown.signal.revisionSource !==
      "reviewed-default-branch-workflow-commit-plus-closed-pr-number" ||
    !EffectArray.some(teardown.failure.stopConditions, (condition) =>
      condition.includes("pull-request head")
    )
  ) {
    findings.push(
      finding(
        "teardown-safety",
        "tools/docs-deployment/automation-register.json:docs-preview-teardown",
        "Use reviewed default-branch code, derive only pr-N and reject pull-request-head execution."
      )
    );
  }
  return findings.toSorted((left, right) =>
    `${left.invariant}:${left.target}`.localeCompare(
      `${right.invariant}:${right.target}`
    )
  );
};
