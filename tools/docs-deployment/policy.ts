import { Array as EffectArray, Array, HashSet, Record, Schema } from "effect";

import type {
  DeploymentAuthorityPreflightReceipt,
  DeploymentAuthorityCapabilityReceipt,
  DeploymentCredentialCapabilityReceipt,
  DeploymentGitAuthorityReceipt,
  DeploymentGitReadbackReceipt,
  DeploymentHostedProofReceipt,
  DeploymentJourneyInventory,
  HistoricalDeploymentPlanReceipt,
  DeploymentPlanReceipt,
  DeploymentProductionMutationPreflightReceipt,
  DeploymentProductionPreflightReceipt,
  DeploymentProductionRollbackReceipt,
  DeploymentProviderPreflightReceipt,
  DeploymentProviderReadback,
  DeploymentPreviewCredentialReadbackReceipt,
  DeploymentPreviewMutationPreflightReceipt,
  DeploymentPreviewTeardownReceipt,
  DeploymentPreviewWorkflowTeardownReceipt,
  DeploymentResumePreflightReceipt,
  DeploymentScreenshotManifest,
} from "./schemas.js";

const hasExactStrings = (
  actual: readonly string[],
  expected: readonly string[]
): boolean =>
  actual.length === expected.length &&
  new Set(actual).size === expected.length &&
  EffectArray.every(expected, (value) => actual.includes(value));

export const inspectAuthorityCapabilityReceipt = (
  receipt: DeploymentAuthorityCapabilityReceipt
): readonly string[] => {
  const expectedEnvironmentIds = new Set([
    "taxkit-docs-preview",
    "taxkit-docs-production",
    "taxkit-docs-preview-teardown",
    "github-actions-report-only",
  ]);
  const findings: string[] = [];
  if (
    receipt.candidate.pullRequestState !== "OPEN_DRAFT" ||
    receipt.candidate.pullRequestNumber !== 1
  ) {
    findings.push(
      "authority-capability-candidate: the capability epoch must bind the open draft PR candidate"
    );
  }
  if (
    receipt.github.environments.length !== expectedEnvironmentIds.size ||
    EffectArray.some(
      receipt.github.environments,
      (environment) =>
        !expectedEnvironmentIds.has(environment.id) ||
        environment.status !== "absent"
    )
  ) {
    findings.push(
      "authority-capability-environments: the receipt must retain the four exact desired environment identities and their observed absence"
    );
  }
  if (
    receipt.github.repositoryActionsSecrets.length !== 0 ||
    receipt.github.repositoryVariables.length !== 0 ||
    receipt.ciCredentialStatus !== "unavailable" ||
    receipt.localProvider.wranglerStatus !== "unauthenticated"
  ) {
    findings.push(
      "authority-capability-secrets: no CI secret value or authenticated Wrangler credential may be claimed in this capability stop"
    );
  }
  if (
    receipt.stop.reason !== "narrow-ci-credential-values-unavailable" ||
    receipt.postcondition !== "github-environments-and-secrets-not-mutated"
  ) {
    findings.push(
      "authority-capability-stop: retain the exact narrow-credential capability stop and no-mutation postcondition"
    );
  }
  return findings;
};

// oxlint-disable-next-line eslint/complexity -- one bounded credential capability policy keeps the exact provider and GitHub graph together
export const inspectCredentialCapabilityReceipt = (
  receipt: DeploymentCredentialCapabilityReceipt
): readonly string[] => {
  const expectedEnvironmentIds = [
    "taxkit-docs-preview",
    "taxkit-docs-production",
    "taxkit-docs-preview-teardown",
    "github-actions-report-only",
  ] as const;
  const expectedMutationGroups = [
    "Workers Scripts Write",
    "Workers Observability Write",
    "Secrets Store Write",
  ] as const;
  const expectedReadGroups = [
    "Workers Scripts Read",
    "Workers Observability Read",
    "Secrets Store Read",
  ] as const;
  const findings: string[] = [];
  const environmentIds = EffectArray.map(
    receipt.github.environments,
    (environment) => environment.id
  );
  if (
    environmentIds.length !== expectedEnvironmentIds.length ||
    EffectArray.some(
      expectedEnvironmentIds,
      (id) => !environmentIds.includes(id)
    ) ||
    EffectArray.some(
      receipt.github.environments,
      (environment) =>
        environment.status !== "protected" ||
        environment.reviewerLogin !== "crcorbett" ||
        environment.reviewerUserId !== 45_161_689 ||
        environment.deploymentBranchPolicy !== "none"
    )
  ) {
    findings.push(
      "credential-capability-environments: the four exact environments must be reviewer-protected with no branch-policy claim"
    );
  }
  const previewSecretNames = receipt.github.environments.find(
    (environment) => environment.id === "taxkit-docs-preview"
  )?.secretNames;
  const productionSecretNames = receipt.github.environments.find(
    (environment) => environment.id === "taxkit-docs-production"
  )?.secretNames;
  const teardownSecretNames = receipt.github.environments.find(
    (environment) => environment.id === "taxkit-docs-preview-teardown"
  )?.secretNames;
  const reportSecretNames = receipt.github.environments.find(
    (environment) => environment.id === "github-actions-report-only"
  )?.secretNames;
  const hasMutationSecrets = (names: readonly string[] | undefined) =>
    names !== undefined &&
    hasExactStrings(names, ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"]);
  if (
    !hasMutationSecrets(previewSecretNames) ||
    !hasMutationSecrets(productionSecretNames) ||
    !hasMutationSecrets(teardownSecretNames) ||
    !hasExactStrings(reportSecretNames ?? [], [
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_READ_API_TOKEN",
    ]) ||
    receipt.github.secretValuesIncluded
  ) {
    findings.push(
      "credential-capability-secrets: protected environment inventories must contain only the named, direction-specific secret names and no values"
    );
  }
  const mutationGroups = EffectArray.map(
    receipt.cloudflare.mutation.permissionGroups,
    (group) => group.name
  );
  const readGroups = EffectArray.map(
    receipt.cloudflare.readOnly.permissionGroups,
    (group) => group.name
  );
  const expectedResourceScope = `com.cloudflare.api.account.${receipt.cloudflare.accountId}:*`;
  if (
    !hasExactStrings(mutationGroups, expectedMutationGroups) ||
    !hasExactStrings(readGroups, expectedReadGroups) ||
    receipt.cloudflare.mutation.resourceScope !== expectedResourceScope ||
    receipt.cloudflare.readOnly.resourceScope !== expectedResourceScope ||
    receipt.cloudflare.mutation.tokenValuesIncluded ||
    receipt.cloudflare.readOnly.tokenValuesIncluded ||
    receipt.cloudflare.mutation.status !== "active" ||
    receipt.cloudflare.readOnly.status !== "active" ||
    receipt.cloudflare.mutation.expiresAt !==
      receipt.cloudflare.readOnly.expiresAt
  ) {
    findings.push(
      "credential-capability-provider: mutation/read-only tokens must be active, equally time-bounded, account-scoped and limited to the exact Worker/observability/Secrets Store group sets"
    );
  }
  if (
    receipt.candidate.pullRequestNumber !== 1 ||
    receipt.candidate.pullRequestState !== "OPEN_DRAFT" ||
    receipt.ciCredentialStatus !== "established" ||
    receipt.github.connectorEnvironmentSecretAdmin !== "not-supported" ||
    receipt.postcondition !==
      "protected-environments-and-narrow-credentials-attached"
  ) {
    findings.push(
      "credential-capability-identity: capability must retain the draft candidate, successful status and the actual GitHub administration path"
    );
  }
  return findings;
};

const expectedJourneyIds = [
  "taxkit-docs-workerd",
  "taxkit-docs-preview",
  "taxkit-docs-production",
  "taxkit-docs-deployment-rollback",
] as const;
const expectedHostedOracleIds = [
  "initial-ssr",
  "static-assets",
  "hydration",
  "client-navigation-no-document",
  "server-function-transport",
  "native-404",
  "accessibility",
  "console-page-cleanliness",
  "cache-headers",
] as const;

const JsonObject = Schema.Record(Schema.String, Schema.Json);
const JsonArray = Schema.Array(Schema.Json);

const canonicalJson = (value: Schema.Json): string => {
  if (Schema.is(JsonArray)(value)) {
    return `[${EffectArray.map(value, canonicalJson).join(",")}]`;
  }
  if (Schema.is(JsonObject)(value)) {
    return `{${EffectArray.map(
      Record.toEntries<string, Schema.Json>(value).toSorted(([left], [right]) =>
        left.localeCompare(right)
      ),
      ([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
};

export const deploymentRecordDigest = (value: Schema.Json): string =>
  new Bun.CryptoHasher("sha256").update(canonicalJson(value)).digest("hex");

const inspectPlanReceipt = (receipt: {
  readonly acceptedPlanSha256: string;
  readonly operation: string;
  readonly projection: Schema.Json;
  readonly replanSha256: string | null;
}): readonly string[] => {
  const findings: string[] = [];
  if (
    deploymentRecordDigest(receipt.projection) !== receipt.acceptedPlanSha256
  ) {
    findings.push(
      "plan-digest: acceptedPlanSha256 must bind the canonical sanitized projection"
    );
  }
  const isReplan =
    receipt.operation === "preview-equal-replan" ||
    receipt.operation === "production-equal-replan" ||
    receipt.operation === "preview-destroy";
  if (
    (isReplan && receipt.replanSha256 !== receipt.acceptedPlanSha256) ||
    (!isReplan && receipt.replanSha256 !== null)
  ) {
    findings.push(
      "equal-replan: mutation requires an equal digest while a plan-only receipt must not claim replan"
    );
  }
  return findings;
};

export const inspectDeploymentPlanReceipt = (
  receipt: DeploymentPlanReceipt
): readonly string[] => inspectPlanReceipt(receipt);

export const inspectHistoricalDeploymentPlanReceipt = (
  receipt: HistoricalDeploymentPlanReceipt
): readonly string[] => inspectPlanReceipt(receipt);

export const inspectHistoricalDeploymentPlanActions = (
  receipt: HistoricalDeploymentPlanReceipt,
  expectedAction: "create" | "update" | "delete"
): readonly string[] => {
  const resources = receipt.projection.logicalResources;
  const website = resources.find(
    (resource) => resource.logicalId === "DocsWebsite"
  );
  const retiredBuild = resources.find(
    (resource) => resource.logicalId === "DocsBuild"
  );
  const valid =
    website?.action === expectedAction &&
    (retiredBuild === undefined ||
      (receipt.projection.schemaVersion === 1
        ? retiredBuild.action === expectedAction
        : retiredBuild.action === "delete"));
  return valid
    ? []
    : [
        `historical-plan-actions: the website must use ${expectedAction}; the recorded historical migration may additionally contain its retired build action`,
      ];
};

export const inspectHostedDeploymentProof = (
  receipt: DeploymentHostedProofReceipt
): readonly string[] => {
  const ids = Array.map(receipt.oracles, (oracle) => oracle.id);
  const findings: string[] = [];
  if (
    HashSet.size(HashSet.fromIterable(ids)) !==
      expectedHostedOracleIds.length ||
    Array.some(expectedHostedOracleIds, (id) => !ids.includes(id))
  ) {
    findings.push(
      "hosted-oracles: retain exactly one passing observation for every required hosted oracle"
    );
  }
  if (
    receipt.candidateCommit !== receipt.provider.candidateCommit ||
    receipt.url !== receipt.provider.url ||
    receipt.provider.assets.manifestSha256 !==
      receipt.provider.state.assetsManifestSha256 ||
    receipt.provider.logicalResourceId !==
      receipt.provider.state.output.logicalResourceId ||
    receipt.provider.physicalWorkerName !==
      receipt.provider.state.output.workerName ||
    receipt.provider.url !== receipt.provider.state.output.workerUrl ||
    receipt.provider.stage !== receipt.provider.state.output.stage
  ) {
    findings.push(
      "hosted-provider-binding: hosted proof must use the provider-read-back candidate and URL"
    );
  }
  return findings;
};

export const inspectScreenshotProviderBinding = (
  manifest: DeploymentScreenshotManifest,
  provider: DeploymentProviderReadback
): readonly string[] =>
  manifest.candidateCommit === provider.candidateCommit &&
  manifest.acceptedPlanSha256 === provider.acceptedPlanSha256 &&
  manifest.sourceConfigSha256 === provider.configSha256 &&
  manifest.deploymentInputSha256 === provider.deploymentInputSha256 &&
  manifest.lockfileSha256 === provider.lockfileSha256 &&
  manifest.deploymentId === provider.deploymentId &&
  manifest.versionId === provider.versionId &&
  manifest.workerName === provider.physicalWorkerName &&
  manifest.stage === provider.stage &&
  manifest.url === provider.url
    ? []
    : [
        "screenshot-provider-binding: screenshot identity must equal the provider readback",
      ];

export const inspectScreenshotImageDigest = (
  manifest: DeploymentScreenshotManifest,
  observedSha256: string
): readonly string[] =>
  manifest.imageSha256 === observedSha256
    ? []
    : [
        "screenshot-image-digest: screenshot manifest must bind the retained PNG bytes",
      ];

export const inspectPreviewEvidenceChain = (
  gitReadback: DeploymentGitReadbackReceipt,
  plan: HistoricalDeploymentPlanReceipt,
  provider: DeploymentProviderReadback,
  hosted: DeploymentHostedProofReceipt,
  screenshots: readonly DeploymentScreenshotManifest[]
): readonly string[] => {
  const findings = [
    ...inspectHistoricalDeploymentPlanReceipt(plan),
    ...inspectHistoricalDeploymentPlanActions(plan, "create"),
    ...inspectHostedDeploymentProof(hosted),
    ...Array.flatMap(screenshots, (manifest) =>
      inspectScreenshotProviderBinding(manifest, provider)
    ),
  ];
  if (
    gitReadback.pullRequest.headSha !== plan.projection.candidate.exactCommit ||
    plan.projection.candidate.exactCommit !== provider.candidateCommit ||
    plan.acceptedPlanSha256 !== provider.acceptedPlanSha256 ||
    plan.projection.configSha256 !== provider.configSha256 ||
    plan.projection.candidate.deploymentInputSha256 !==
      provider.deploymentInputSha256 ||
    plan.projection.candidate.lockfileSha256 !== provider.lockfileSha256 ||
    gitReadback.stage !== plan.projection.stage ||
    plan.projection.stage !== provider.stage ||
    hosted.candidateCommit !== provider.candidateCommit ||
    hosted.url !== provider.url ||
    deploymentRecordDigest(hosted.provider) !==
      deploymentRecordDigest(provider) ||
    hosted.environment !== "preview" ||
    gitReadback.pullRequest.baseName !== "main" ||
    !gitReadback.pullRequest.isDraft ||
    gitReadback.pullRequest.state !== "OPEN" ||
    screenshots.length !== 2 ||
    HashSet.size(
      HashSet.fromIterable(
        EffectArray.map(screenshots, (manifest) => manifest.viewport.kind)
      )
    ) !== 2 ||
    Array.some(screenshots, (manifest) => manifest.environment !== "preview")
  ) {
    findings.push(
      "preview-evidence-chain: Git, plan, provider, hosted and screenshot receipts must bind one Preview candidate and stage"
    );
  }
  return findings;
};

export const inspectPreviewHostedEvidenceChain = (
  plan: HistoricalDeploymentPlanReceipt,
  provider: DeploymentProviderReadback,
  hosted: DeploymentHostedProofReceipt,
  screenshots: readonly DeploymentScreenshotManifest[]
): readonly string[] => {
  const findings = [
    ...inspectHistoricalDeploymentPlanReceipt(plan),
    ...inspectHistoricalDeploymentPlanActions(plan, "create"),
    ...inspectHostedDeploymentProof(hosted),
    ...Array.flatMap(screenshots, (manifest) =>
      inspectScreenshotProviderBinding(manifest, provider)
    ),
  ];
  if (
    plan.projection.candidate.exactCommit !== provider.candidateCommit ||
    plan.acceptedPlanSha256 !== provider.acceptedPlanSha256 ||
    plan.projection.configSha256 !== provider.configSha256 ||
    plan.projection.candidate.deploymentInputSha256 !==
      provider.deploymentInputSha256 ||
    plan.projection.candidate.lockfileSha256 !== provider.lockfileSha256 ||
    plan.projection.stage !== provider.stage ||
    hosted.candidateCommit !== provider.candidateCommit ||
    hosted.url !== provider.url ||
    deploymentRecordDigest(hosted.provider) !==
      deploymentRecordDigest(provider) ||
    hosted.environment !== "preview" ||
    screenshots.length !== 2 ||
    HashSet.size(
      HashSet.fromIterable(
        EffectArray.map(screenshots, (manifest) => manifest.viewport.kind)
      )
    ) !== 2 ||
    Array.some(screenshots, (manifest) => manifest.environment !== "preview")
  ) {
    findings.push(
      "preview-hosted-evidence-chain: plan, provider, hosted and two-viewport screenshot receipts must bind one exact Preview candidate and stage"
    );
  }
  return findings;
};

export const inspectProductionEvidenceChain = (
  plan: HistoricalDeploymentPlanReceipt,
  provider: DeploymentProviderReadback,
  hosted: DeploymentHostedProofReceipt,
  screenshots: readonly DeploymentScreenshotManifest[],
  environment: "production" | "rollback",
  expectedAction: "create" | "update"
): readonly string[] => {
  const findings = [
    ...inspectHistoricalDeploymentPlanReceipt(plan),
    ...inspectHistoricalDeploymentPlanActions(plan, expectedAction),
    ...inspectHostedDeploymentProof(hosted),
    ...Array.flatMap(screenshots, (manifest) =>
      inspectScreenshotProviderBinding(manifest, provider)
    ),
  ];
  if (
    plan.operation !== "production-equal-replan" ||
    plan.projection.stage !== "prod" ||
    plan.projection.candidate.exactCommit !== provider.candidateCommit ||
    plan.acceptedPlanSha256 !== provider.acceptedPlanSha256 ||
    plan.projection.configSha256 !== provider.configSha256 ||
    plan.projection.candidate.deploymentInputSha256 !==
      provider.deploymentInputSha256 ||
    plan.projection.candidate.lockfileSha256 !== provider.lockfileSha256 ||
    provider.stage !== "prod" ||
    hosted.environment !== environment ||
    hosted.candidateCommit !== provider.candidateCommit ||
    hosted.url !== provider.url ||
    deploymentRecordDigest(hosted.provider) !==
      deploymentRecordDigest(provider) ||
    screenshots.length !== 2 ||
    HashSet.size(
      HashSet.fromIterable(
        EffectArray.map(screenshots, (manifest) => manifest.viewport.kind)
      )
    ) !== 2 ||
    Array.some(screenshots, (manifest) => {
      const validEnvironments =
        environment === "rollback"
          ? ["rollback", "production"]
          : ["production"];
      return (
        !validEnvironments.includes(manifest.environment) ||
        manifest.stage !== "prod"
      );
    })
  ) {
    findings.push(
      "production-evidence-chain: plan, provider, hosted and two-viewport screenshot receipts must bind one fixed Production candidate"
    );
  }
  return findings;
};

export const inspectInitialProductionPreflight = (
  receipt: DeploymentProductionPreflightReceipt,
  plan: HistoricalDeploymentPlanReceipt,
  acceptedPreviewProvider: DeploymentProviderReadback,
  acceptedPreviewHosted: DeploymentHostedProofReceipt,
  acceptedPreviewTeardown: DeploymentPreviewTeardownReceipt,
  credentialReadback: DeploymentPreviewCredentialReadbackReceipt,
  resultingProvider: DeploymentProviderReadback
): readonly string[] => {
  const mismatch = EffectArray.some(
    [
      inspectHistoricalDeploymentPlanActions(plan, "create").length > 0,
      receipt.acceptedPlanSha256 !== plan.acceptedPlanSha256,
      receipt.candidate.exactCommit !== plan.projection.candidate.exactCommit,
      receipt.candidate.deploymentInputSha256 !==
        plan.projection.candidate.deploymentInputSha256,
      receipt.candidate.lockfileSha256 !==
        plan.projection.candidate.lockfileSha256,
      receipt.candidate.sourceConfigSha256 !== plan.projection.configSha256,
      receipt.acceptedPreview.candidateCommit !==
        acceptedPreviewProvider.candidateCommit,
      receipt.acceptedPreview.candidateCommit !==
        acceptedPreviewHosted.candidateCommit,
      receipt.acceptedPreview.candidateCommit !==
        acceptedPreviewTeardown.candidateCommit,
      receipt.acceptedPreview.deploymentInputSha256 !==
        acceptedPreviewProvider.deploymentInputSha256,
      receipt.acceptedPreview.lockfileSha256 !==
        acceptedPreviewProvider.lockfileSha256,
      receipt.acceptedPreview.sourceConfigSha256 !==
        acceptedPreviewProvider.configSha256,
      receipt.lastKnownGood.candidateCommit !==
        acceptedPreviewProvider.candidateCommit,
      receipt.candidate.exactCommit !== acceptedPreviewProvider.candidateCommit,
      receipt.candidate.exactCommit !== resultingProvider.candidateCommit,
      receipt.account.accountId !== acceptedPreviewProvider.accountId,
      receipt.account.accountId !== resultingProvider.accountId,
      receipt.credentials.accountId !== credentialReadback.accountId,
      receipt.credentials.accountId !== resultingProvider.accountId,
      receipt.credentials.scopeSetSha256 !== credentialReadback.scopeSetSha256,
      receipt.credentials.expiresAt !== credentialReadback.expiresAt,
      receipt.credentials.profile !== credentialReadback.profile,
      receipt.candidate.exactCommit !== credentialReadback.candidateCommit,
      credentialReadback.observedAt > receipt.observedAt,
      receipt.observedAt >= receipt.credentials.expiresAt,
      !resultingProvider.physicalWorkerName.startsWith(
        receipt.provider.workerPrefix
      ),
      !resultingProvider.url.endsWith(
        `.${receipt.account.workersSubdomain}.workers.dev`
      ),
      receipt.stage !== "prod",
      plan.projection.stage !== "prod",
      resultingProvider.stage !== "prod",
      receipt.provider.matchingWorkerCount !== 0,
      receipt.state.stagePresent,
      receipt.state.resources.length !== 0,
    ],
    Boolean
  );
  return mismatch
    ? [
        "production-initial-preflight: accepted Preview, equal Production plan, credential, empty fixed stage and candidate inputs must agree before first deploy",
      ]
    : [];
};

export const inspectProductionMutationPreflight = (
  receipt: DeploymentProductionMutationPreflightReceipt,
  plan: HistoricalDeploymentPlanReceipt,
  currentProvider: DeploymentProviderReadback,
  resultingProvider: DeploymentProviderReadback,
  credentialReadback: DeploymentPreviewCredentialReadbackReceipt
): readonly string[] => {
  const expectedRollbackTarget =
    receipt.operation === "production-deploy-preflight"
      ? currentProvider.candidateCommit
      : resultingProvider.candidateCommit;
  const mismatch = EffectArray.some(
    [
      inspectHistoricalDeploymentPlanActions(plan, "update").length > 0,
      receipt.acceptedPlanSha256 !== plan.acceptedPlanSha256,
      receipt.candidate.exactCommit !== plan.projection.candidate.exactCommit,
      receipt.candidate.deploymentInputSha256 !==
        plan.projection.candidate.deploymentInputSha256,
      receipt.candidate.lockfileSha256 !==
        plan.projection.candidate.lockfileSha256,
      receipt.candidate.sourceConfigSha256 !== plan.projection.configSha256,
      receipt.credentials.accountId !== currentProvider.accountId,
      receipt.credentials.accountId !== resultingProvider.accountId,
      receipt.credentials.accountId !== credentialReadback.accountId,
      receipt.credentials.scopeSetSha256 !== credentialReadback.scopeSetSha256,
      receipt.credentials.expiresAt !== credentialReadback.expiresAt,
      receipt.credentials.profile !== credentialReadback.profile,
      receipt.candidate.exactCommit !== credentialReadback.candidateCommit,
      credentialReadback.observedAt > receipt.observedAt,
      receipt.observedAt >= receipt.credentials.expiresAt,
      receipt.currentProduction.candidateCommit !==
        currentProvider.candidateCommit,
      receipt.currentProduction.provider.deploymentId !==
        currentProvider.deploymentId,
      receipt.currentProduction.provider.versionId !==
        currentProvider.versionId,
      receipt.currentProduction.provider.physicalWorkerName !==
        currentProvider.physicalWorkerName,
      receipt.currentProduction.provider.url !== currentProvider.url,
      receipt.rollbackTarget.candidateCommit !== expectedRollbackTarget,
      receipt.authority.operation !==
        (receipt.operation === "production-deploy-preflight"
          ? "production-deploy"
          : "production-rollback-redeploy"),
      receipt.candidate.exactCommit !== resultingProvider.candidateCommit,
      currentProvider.physicalWorkerName !==
        resultingProvider.physicalWorkerName,
      currentProvider.url !== resultingProvider.url,
      currentProvider.state.instanceId !== resultingProvider.state.instanceId,
      receipt.stage !== "prod",
      plan.projection.stage !== "prod",
      resultingProvider.stage !== "prod",
      !receipt.state.workerIdentityAgreement,
    ],
    Boolean
  );
  return mismatch
    ? [
        "production-mutation-preflight: current provider/state identity, rollback target, equal plan and resulting fixed Worker must agree",
      ]
    : [];
};

export const inspectProductionRollbackReceipt = (
  receipt: DeploymentProductionRollbackReceipt,
  initialProvider: DeploymentProviderReadback,
  successorPreviewProvider: DeploymentProviderReadback,
  successorPreviewTeardown: DeploymentPreviewTeardownReceipt,
  successorProvider: DeploymentProviderReadback,
  restoredProvider: DeploymentProviderReadback,
  initialScreenshots: readonly DeploymentScreenshotManifest[],
  restoredScreenshots: readonly DeploymentScreenshotManifest[],
  expectedPaths: {
    readonly initialProviderReadbackPath: string;
    readonly restoredHostedProofPath: string;
    readonly restoredPlanPath: string;
    readonly restoredPreflightPath: string;
    readonly restoredProviderReadbackPath: string;
    readonly restoredScreenshotManifestPaths: readonly [string, string];
    readonly successorHostedProofPath: string;
    readonly successorPreviewHostedProofPath: string;
    readonly successorPreviewProviderReadbackPath: string;
    readonly successorPreviewTeardownPath: string;
    readonly successorProviderReadbackPath: string;
    readonly successorScreenshotManifestPaths: readonly [string, string];
  }
): readonly string[] => {
  const screenshotEpochsValid =
    initialScreenshots.length === 2 &&
    restoredScreenshots.length === 2 &&
    Array.every(initialScreenshots, (initial) => {
      const restored = restoredScreenshots.find(
        (candidate) => candidate.viewport.kind === initial.viewport.kind
      );
      return (
        restored !== undefined &&
        (initial.imagePath !== restored.imagePath ||
          (initial.imageSha256 === restored.imageSha256 &&
            initial.imagePath.includes(initial.imageSha256.slice(0, 12)) &&
            EffectArray.some(initial.limitations, (limitation) =>
              limitation.includes("content-addressed")
            ) &&
            EffectArray.some(restored.limitations, (limitation) =>
              limitation.includes("content-addressed")
            )))
      );
    });
  const mismatch = EffectArray.some(
    [
      initialProvider.physicalWorkerName !==
        successorProvider.physicalWorkerName,
      successorProvider.physicalWorkerName !==
        restoredProvider.physicalWorkerName,
      initialProvider.url !== successorProvider.url,
      successorProvider.url !== restoredProvider.url,
      initialProvider.state.instanceId !== successorProvider.state.instanceId,
      successorProvider.state.instanceId !== restoredProvider.state.instanceId,
      initialProvider.deploymentId === successorProvider.deploymentId,
      successorProvider.deploymentId === restoredProvider.deploymentId,
      initialProvider.versionId === successorProvider.versionId,
      successorProvider.versionId === restoredProvider.versionId,
      receipt.acceptedPlanSha256 !== restoredProvider.acceptedPlanSha256,
      receipt.initialProduction.candidateCommit !==
        initialProvider.candidateCommit,
      receipt.initialProduction.deploymentId !== initialProvider.deploymentId,
      receipt.initialProduction.versionId !== initialProvider.versionId,
      receipt.initialProduction.stateBundleSha256 !==
        initialProvider.state.bundleSha256,
      receipt.successor.candidateCommit !== successorProvider.candidateCommit,
      receipt.successor.candidateCommit !==
        successorPreviewProvider.candidateCommit,
      receipt.successor.deploymentId !== successorProvider.deploymentId,
      receipt.successor.versionId !== successorProvider.versionId,
      receipt.successor.stateBundleSha256 !==
        successorProvider.state.bundleSha256,
      receipt.restoredProduction.candidateCommit !==
        restoredProvider.candidateCommit,
      receipt.restoredProduction.deploymentId !== restoredProvider.deploymentId,
      receipt.restoredProduction.versionId !== restoredProvider.versionId,
      receipt.restoredProduction.stateBundleSha256 !==
        restoredProvider.state.bundleSha256,
      receipt.stableIdentity.physicalWorkerName !==
        restoredProvider.physicalWorkerName,
      receipt.stableIdentity.url !== restoredProvider.url,
      receipt.stableIdentity.stateInstanceId !==
        restoredProvider.state.instanceId,
      initialProvider.state.bundleSha256 !==
        restoredProvider.state.bundleSha256,
      initialProvider.candidateCommit !== restoredProvider.candidateCommit,
      successorPreviewTeardown.candidateCommit !==
        successorPreviewProvider.candidateCommit,
      successorPreviewTeardown.physicalWorkerName !==
        successorPreviewProvider.physicalWorkerName,
      successorPreviewTeardown.state.stagePresent,
      successorPreviewTeardown.provider.matchingWorkerCount !== 0,
      receipt.initialProduction.providerReadbackPath !==
        expectedPaths.initialProviderReadbackPath,
      receipt.successor.providerReadbackPath !==
        expectedPaths.successorProviderReadbackPath,
      receipt.successor.hostedProofPath !==
        expectedPaths.successorHostedProofPath,
      receipt.successor.previewProviderReadbackPath !==
        expectedPaths.successorPreviewProviderReadbackPath,
      receipt.successor.previewHostedProofPath !==
        expectedPaths.successorPreviewHostedProofPath,
      receipt.successor.previewTeardownPath !==
        expectedPaths.successorPreviewTeardownPath,
      !Array.every(
        receipt.successor.screenshotManifestPaths,
        (path, index) =>
          path === expectedPaths.successorScreenshotManifestPaths[index]
      ),
      receipt.restoredProduction.providerReadbackPath !==
        expectedPaths.restoredProviderReadbackPath,
      receipt.restoredProduction.hostedProofPath !==
        expectedPaths.restoredHostedProofPath,
      receipt.restoredProduction.planPath !== expectedPaths.restoredPlanPath,
      receipt.restoredProduction.preflightPath !==
        expectedPaths.restoredPreflightPath,
      !Array.every(
        receipt.restoredProduction.screenshotManifestPaths,
        (path, index) =>
          path === expectedPaths.restoredScreenshotManifestPaths[index]
      ),
      !screenshotEpochsValid,
    ],
    Boolean
  );
  return mismatch
    ? [
        "production-rollback-binding: qualified successor Preview, fixed Production identity, distinct transitions, restored source bundle and Preview absence must agree",
      ]
    : [];
};

export const inspectPreviewMutationPreflight = (
  receipt: DeploymentPreviewMutationPreflightReceipt,
  gitReadback: DeploymentGitReadbackReceipt,
  plan: HistoricalDeploymentPlanReceipt,
  authority: DeploymentAuthorityPreflightReceipt,
  credentialReadback: DeploymentPreviewCredentialReadbackReceipt,
  providerAfterApply?: DeploymentProviderReadback
): readonly string[] => {
  const findings = [
    ...inspectHistoricalDeploymentPlanActions(
      plan,
      receipt.operation === "preview-deploy-preflight" ? "create" : "delete"
    ),
  ];
  const commonMismatch = EffectArray.some(
    [
      receipt.candidate.exactCommit !== gitReadback.pullRequest.headSha,
      receipt.candidate.exactCommit !== plan.projection.candidate.exactCommit,
      receipt.candidate.lockfileSha256 !==
        plan.projection.candidate.lockfileSha256,
      receipt.candidate.deploymentInputSha256 !==
        plan.projection.candidate.deploymentInputSha256,
      receipt.candidate.sourceConfigSha256 !== plan.projection.configSha256,
      receipt.acceptedPlanSha256 !== plan.acceptedPlanSha256,
      receipt.stage !== gitReadback.stage,
      receipt.stage !== plan.projection.stage,
      receipt.credentials.accountId !== authority.provider.accountId,
      receipt.credentials.accountId !== credentialReadback.accountId,
      receipt.credentials.scopeSetSha256 !== credentialReadback.scopeSetSha256,
      receipt.credentials.expiresAt !== credentialReadback.expiresAt,
      receipt.credentials.profile !== credentialReadback.profile,
      receipt.candidate.exactCommit !== credentialReadback.candidateCommit,
      receipt.stage !== credentialReadback.stage,
      credentialReadback.observedAt > receipt.observedAt,
      receipt.observedAt >= receipt.credentials.expiresAt,
      providerAfterApply !== undefined &&
        receipt.credentials.accountId !== providerAfterApply.accountId,
      !EffectArray.some(receipt.limitations, (limitation) =>
        limitation.includes("broad existing OAuth scope set")
      ),
    ],
    Boolean
  );
  const deployMismatch =
    receipt.operation === "preview-deploy-preflight" &&
    EffectArray.some(
      [
        receipt.postcondition !== "exact-stage-absent-and-safe-to-create",
        receipt.provider.matchingWorkerCount !== 0,
        receipt.provider.identity !== null,
        receipt.state.stagePresent,
        receipt.state.resources.length !== 0,
        receipt.state.workerIdentityAgreement,
      ],
      Boolean
    );
  const destroyIdentity = receipt.provider.identity;
  const destroyMismatch =
    receipt.operation === "preview-destroy-preflight" &&
    EffectArray.some(
      [
        receipt.postcondition !== "exact-stage-present-and-safe-to-destroy",
        receipt.provider.matchingWorkerCount !== 1,
        destroyIdentity === null,
        !receipt.state.stagePresent,
        receipt.state.resources.length !== 2,
        !receipt.state.workerIdentityAgreement,
        providerAfterApply === undefined,
        destroyIdentity?.physicalWorkerName !==
          providerAfterApply?.physicalWorkerName,
        destroyIdentity?.deploymentId !== providerAfterApply?.deploymentId,
        destroyIdentity?.versionId !== providerAfterApply?.versionId,
        destroyIdentity?.url !== providerAfterApply?.url,
      ],
      Boolean
    );
  if (commonMismatch || deployMismatch || destroyMismatch) {
    findings.push(
      "preview-mutation-preflight: candidate, credential scope, plan, provider and state identities must prove the exact deploy or destroy target before mutation"
    );
  }
  return findings;
};

export const inspectPreviewTeardownReceipt = (
  receipt: DeploymentPreviewTeardownReceipt,
  plan: HistoricalDeploymentPlanReceipt,
  provider: DeploymentProviderReadback
): readonly string[] => {
  const findings = [
    ...inspectHistoricalDeploymentPlanReceipt(plan),
    ...inspectHistoricalDeploymentPlanActions(plan, "delete"),
  ];
  if (
    plan.operation !== "preview-destroy" ||
    receipt.destroyPlanSha256 !== plan.acceptedPlanSha256 ||
    receipt.candidateCommit !== plan.projection.candidate.exactCommit ||
    receipt.candidateCommit !== provider.candidateCommit ||
    receipt.physicalWorkerName !== provider.physicalWorkerName ||
    receipt.url !== provider.url ||
    receipt.provider.matchingWorkerCount !== 0 ||
    receipt.state.stagePresent ||
    receipt.state.previewResourceCount !== 0
  ) {
    findings.push(
      "preview-teardown-binding: destroy plan, deployed identity, provider absence and state absence must bind one exact Preview"
    );
  }
  return findings;
};

export const inspectPreviewWorkflowTeardownReceipt = (
  receipt: DeploymentPreviewWorkflowTeardownReceipt,
  plan: HistoricalDeploymentPlanReceipt,
  provider: DeploymentProviderReadback
): readonly string[] => {
  const findings = [
    ...inspectHistoricalDeploymentPlanReceipt(plan),
    ...inspectHistoricalDeploymentPlanActions(plan, "delete"),
  ];
  if (
    plan.operation !== "preview-destroy" ||
    receipt.destroyPlanSha256 !== plan.acceptedPlanSha256 ||
    receipt.reviewedWorkflowCommit !== plan.projection.candidate.exactCommit ||
    receipt.stage !== plan.projection.stage ||
    receipt.candidateCommit !== provider.candidateCommit ||
    receipt.stage !== provider.stage ||
    receipt.physicalWorkerName !== provider.physicalWorkerName ||
    receipt.url !== provider.url ||
    receipt.provider.matchingWorkerCount !== 0 ||
    receipt.state.stagePresent ||
    receipt.state.previewResourceCount !== 0
  ) {
    findings.push(
      "preview-workflow-teardown-binding: reviewed teardown source, deployed candidate, destroy plan, provider absence and state absence must remain separate and claim-matched"
    );
  }
  return findings;
};

export const inspectDeploymentOwners = (
  inventory: DeploymentJourneyInventory,
  receipt: DeploymentAuthorityPreflightReceipt
): readonly string[] => {
  const findings: string[] = [];
  const ids = Array.map(inventory.journeys, (journey) => journey.id);
  if (
    HashSet.size(HashSet.fromIterable(ids)) !== expectedJourneyIds.length ||
    Array.some(expectedJourneyIds, (id) => !ids.includes(id))
  ) {
    findings.push(
      "journey-inventory: retain exactly the four stable deployment journey IDs"
    );
  }
  if (
    Array.some(
      inventory.journeys,
      (journey) =>
        journey.oracleClasses.length === 0 ||
        journey.falseGreenOracles.length === 0 ||
        !journey.receiptRoute.startsWith("docs/evidence/deployments/")
    )
  ) {
    findings.push(
      "journey-oracles: every journey needs dated evidence routing, proportional oracles and explicit false-green protection"
    );
  }
  if (
    receipt.candidate.status !== "not-trusted-pr-head" ||
    receipt.candidate.pullRequestNumber !== null ||
    receipt.state.mutationCount !== 0 ||
    receipt.postcondition !== "stopped-before-state-or-provider-mutation"
  ) {
    findings.push(
      "preflight-stop: an untrusted local-only candidate must stop before state initialization, plan or provider mutation"
    );
  }
  if (
    receipt.approval.approvedOperations.includes("preview-plan") &&
    receipt.stop.operation !== "preview-plan"
  ) {
    findings.push(
      "authority-stop: approval does not waive trusted-candidate identity"
    );
  }
  const { evidenceDigest, ...evidenceProjection } = receipt;
  const observedDigest = deploymentRecordDigest(evidenceProjection);
  if (observedDigest !== evidenceDigest) {
    findings.push(
      "receipt-digest: evidenceDigest must bind the canonical receipt projection excluding itself"
    );
  }
  return findings;
};

export const inspectGitAuthorityReceipt = (
  receipt: DeploymentGitAuthorityReceipt
): readonly string[] => {
  const findings: string[] = [];
  if (
    receipt.approval.candidateCommit !== receipt.precondition.headCommit ||
    receipt.approval.branch !== "codex/docs-cloudflare-alchemy-deployment" ||
    receipt.approval.baseBranch !== "main" ||
    receipt.approval.remote !== "origin"
  ) {
    findings.push(
      "git-authority-target: candidate, branch, base and remote must match the exact approved Git target"
    );
  }
  if (
    !receipt.approval.exclusions.includes("force-push") ||
    !receipt.approval.exclusions.includes("merge") ||
    !receipt.approval.exclusions.includes("branch-deletion")
  ) {
    findings.push(
      "git-authority-exclusions: merge, force-push and branch deletion must remain excluded"
    );
  }
  return findings;
};

export const inspectGitReadbackReceipt = (
  receipt: DeploymentGitReadbackReceipt
): readonly string[] => {
  const findings: string[] = [];
  if (
    receipt.remote.candidateCommit !== receipt.pullRequest.headSha ||
    receipt.pullRequest.headName !== receipt.remote.branch ||
    receipt.pullRequest.number !== 1 ||
    receipt.stage !== "pr-1"
  ) {
    findings.push(
      "git-readback-binding: remote branch, draft PR head, number and deterministic stage must identify one exact candidate"
    );
  }
  if (
    receipt.pullRequest.baseName !== "main" ||
    !receipt.pullRequest.isDraft ||
    receipt.pullRequest.state !== "OPEN"
  ) {
    findings.push(
      "git-readback-state: the accepted candidate must be an open draft pull request against main"
    );
  }
  return findings;
};

export const inspectProviderPreflightReceipt = (
  receipt: DeploymentProviderPreflightReceipt,
  gitReadback: DeploymentGitReadbackReceipt
): readonly string[] => {
  const findings: string[] = [];
  if (
    receipt.candidate.exactCommit !== gitReadback.pullRequest.headSha ||
    receipt.candidate.pullRequestNumber !== gitReadback.pullRequest.number ||
    receipt.stage !== gitReadback.stage
  ) {
    findings.push(
      "provider-preflight-candidate: provider inventory must bind the current trusted PR head and derived stage"
    );
  }
  const partialStateIsExact =
    receipt.state.taxkitStackPresent &&
    receipt.postcondition ===
      "partial-taxkit-state-and-provider-absence-confirmed" &&
    receipt.provider.taxkitWorkerCount === 0 &&
    receipt.state.resources.length === 2 &&
    EffectArray.some(
      receipt.state.resources,
      (resource) =>
        resource.logicalId === "DocsBuild" && resource.status === "created"
    ) &&
    EffectArray.some(
      receipt.state.resources,
      (resource) =>
        resource.logicalId === "DocsWebsite" && resource.status === "creating"
    );
  const emptyStateIsExact =
    !receipt.state.taxkitStackPresent &&
    receipt.state.resources.length === 0 &&
    receipt.postcondition ===
      "account-subdomain-and-empty-taxkit-state-confirmed";
  if (!partialStateIsExact && !emptyStateIsExact) {
    findings.push(
      "provider-preflight-state: inventory must prove either an empty first-Preview state or the exact resumable build-created/worker-creating state with provider absence"
    );
  }
  if (
    receipt.provider.billingSubscriptionReadback === "forbidden-403" &&
    !EffectArray.some(receipt.limitations, (limitation) =>
      limitation.includes("not the billing subscription")
    )
  ) {
    findings.push(
      "provider-preflight-plan: denied billing readback must remain an explicit non-claim"
    );
  }
  return findings;
};

export const inspectResumePreflightReceipt = (
  receipt: DeploymentResumePreflightReceipt,
  gitReadback: DeploymentGitReadbackReceipt,
  plan: HistoricalDeploymentPlanReceipt
): readonly string[] => {
  const findings: string[] = [];
  if (
    receipt.candidate.exactCommit !== gitReadback.pullRequest.headSha ||
    receipt.candidate.exactCommit !== plan.projection.candidate.exactCommit ||
    receipt.stage !== gitReadback.stage ||
    receipt.stage !== plan.projection.stage
  ) {
    findings.push(
      "resume-preflight-candidate: trusted Git, state/provider preflight and equal plan must bind one candidate and stage"
    );
  }
  if (
    receipt.provider.taxkitWorkerCount !== 1 ||
    !receipt.state.workerIdentityAgreement ||
    receipt.state.resources[0].logicalId !== "DocsBuild" ||
    receipt.state.resources[1].logicalId !== "DocsWebsite"
  ) {
    findings.push(
      "resume-preflight-scope: resume requires exactly one matching TaxKit Worker and the two owned state resources"
    );
  }
  return findings;
};
