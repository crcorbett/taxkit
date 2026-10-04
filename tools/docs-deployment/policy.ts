import {
  Array as EffectArray,
  Array,
  Effect,
  HashSet,
  Option,
  Schema,
} from "effect";

import { deploymentRecordDigest } from "./retained-record.egress.js";
import { DeploymentProviderReadback as ProviderReadbackSchema } from "./schemas.js";
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

export { deploymentRecordDigest } from "./retained-record.egress.js";

const hasExactStrings = (
  actual: readonly string[],
  expected: readonly string[]
): boolean =>
  actual.length === expected.length &&
  HashSet.size(HashSet.fromIterable(actual)) === expected.length &&
  EffectArray.every(expected, (value) => actual.includes(value));

export const inspectAuthorityCapabilityReceipt = (
  receipt: DeploymentAuthorityCapabilityReceipt
): readonly string[] => {
  const expectedEnvironmentIds = HashSet.fromIterable([
    "taxkit-docs-preview",
    "taxkit-docs-production",
    "taxkit-docs-preview-teardown",
    "github-actions-report-only",
  ]);
  const authorityCapabilityCandidateFindings =
    receipt.candidate.pullRequestState !== "OPEN_DRAFT" ||
    receipt.candidate.pullRequestNumber !== 1
      ? [
          "authority-capability-candidate: the capability epoch must bind the open draft PR candidate",
        ]
      : [];
  const authorityCapabilityEnvironmentsFindings =
    receipt.github.environments.length !==
      HashSet.size(expectedEnvironmentIds) ||
    EffectArray.some(
      receipt.github.environments,
      (environment) =>
        !HashSet.has(expectedEnvironmentIds, environment.id) ||
        environment.status !== "absent"
    )
      ? [
          "authority-capability-environments: the receipt must retain the four exact desired environment identities and their observed absence",
        ]
      : [];
  const authorityCapabilitySecretsFindings =
    receipt.github.repositoryActionsSecrets.length !== 0 ||
    receipt.github.repositoryVariables.length !== 0 ||
    receipt.ciCredentialStatus !== "unavailable" ||
    receipt.localProvider.wranglerStatus !== "unauthenticated"
      ? [
          "authority-capability-secrets: no CI secret value or authenticated Wrangler credential may be claimed in this capability stop",
        ]
      : [];
  const authorityCapabilityStopFindings =
    receipt.stop.reason !== "narrow-ci-credential-values-unavailable" ||
    receipt.postcondition !== "github-environments-and-secrets-not-mutated"
      ? [
          "authority-capability-stop: retain the exact narrow-credential capability stop and no-mutation postcondition",
        ]
      : [];
  return [
    ...authorityCapabilityCandidateFindings,
    ...authorityCapabilityEnvironmentsFindings,
    ...authorityCapabilitySecretsFindings,
    ...authorityCapabilityStopFindings,
  ];
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
  const environmentIds = EffectArray.map(
    receipt.github.environments,
    (environment) => environment.id
  );
  const credentialCapabilityEnvironmentsFindings =
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
      ? [
          "credential-capability-environments: the four exact environments must be reviewer-protected with no branch-policy claim",
        ]
      : [];
  const previewSecretNames = EffectArray.findFirst(
    receipt.github.environments,
    (environment) => environment.id === "taxkit-docs-preview"
  ).pipe(Option.map((environment) => environment.secretNames));
  const productionSecretNames = EffectArray.findFirst(
    receipt.github.environments,
    (environment) => environment.id === "taxkit-docs-production"
  ).pipe(Option.map((environment) => environment.secretNames));
  const teardownSecretNames = EffectArray.findFirst(
    receipt.github.environments,
    (environment) => environment.id === "taxkit-docs-preview-teardown"
  ).pipe(Option.map((environment) => environment.secretNames));
  const reportSecretNames = EffectArray.findFirst(
    receipt.github.environments,
    (environment) => environment.id === "github-actions-report-only"
  ).pipe(Option.map((environment) => environment.secretNames));
  const hasMutationSecrets = (names: Option.Option<readonly string[]>) =>
    Option.exists(names, (values) =>
      hasExactStrings(values, ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"])
    );
  const credentialCapabilitySecretsFindings =
    !hasMutationSecrets(previewSecretNames) ||
    !hasMutationSecrets(productionSecretNames) ||
    !hasMutationSecrets(teardownSecretNames) ||
    !hasExactStrings(
      Option.getOrElse(reportSecretNames, () => []),
      ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_READ_API_TOKEN"]
    ) ||
    receipt.github.secretValuesIncluded
      ? [
          "credential-capability-secrets: protected environment inventories must contain only the named, direction-specific secret names and no values",
        ]
      : [];
  const mutationGroups = EffectArray.map(
    receipt.cloudflare.mutation.permissionGroups,
    (group) => group.name
  );
  const readGroups = EffectArray.map(
    receipt.cloudflare.readOnly.permissionGroups,
    (group) => group.name
  );
  const expectedResourceScope = `com.cloudflare.api.account.${receipt.cloudflare.accountId}:*`;
  const credentialCapabilityProviderFindings =
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
      ? [
          "credential-capability-provider: mutation/read-only tokens must be active, equally time-bounded, account-scoped and limited to the exact Worker/observability/Secrets Store group sets",
        ]
      : [];
  const credentialCapabilityIdentityFindings =
    receipt.candidate.pullRequestNumber !== 1 ||
    receipt.candidate.pullRequestState !== "OPEN_DRAFT" ||
    receipt.ciCredentialStatus !== "established" ||
    receipt.github.connectorEnvironmentSecretAdmin !== "not-supported" ||
    receipt.postcondition !==
      "protected-environments-and-narrow-credentials-attached"
      ? [
          "credential-capability-identity: capability must retain the draft candidate, successful status and the actual GitHub administration path",
        ]
      : [];
  return [
    ...credentialCapabilityEnvironmentsFindings,
    ...credentialCapabilitySecretsFindings,
    ...credentialCapabilityProviderFindings,
    ...credentialCapabilityIdentityFindings,
  ];
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

const inspectPlanReceipt = (
  receipt: Pick<
    DeploymentPlanReceipt | HistoricalDeploymentPlanReceipt,
    "acceptedPlanSha256" | "operation" | "projection" | "replanSha256"
  >
) =>
  Effect.gen(function* () {
    const planDigestFindings =
      (yield* deploymentRecordDigest(receipt.projection)) ===
      receipt.acceptedPlanSha256
        ? []
        : [
            "plan-digest: acceptedPlanSha256 must bind the canonical sanitized projection",
          ];
    const isReplan =
      receipt.operation === "preview-equal-replan" ||
      receipt.operation === "production-equal-replan" ||
      receipt.operation === "preview-destroy";
    const equalReplanFindings =
      (isReplan && receipt.replanSha256 !== receipt.acceptedPlanSha256) ||
      (!isReplan && receipt.replanSha256 !== null)
        ? [
            "equal-replan: mutation requires an equal digest while a plan-only receipt must not claim replan",
          ]
        : [];
    return [...planDigestFindings, ...equalReplanFindings];
  });

export const inspectDeploymentPlanReceipt = (receipt: DeploymentPlanReceipt) =>
  inspectPlanReceipt(receipt);

export const inspectHistoricalDeploymentPlanReceipt = (
  receipt: HistoricalDeploymentPlanReceipt
) => inspectPlanReceipt(receipt);

export const inspectHistoricalDeploymentPlanActions = (
  receipt: HistoricalDeploymentPlanReceipt,
  expectedAction: "create" | "update" | "delete"
): readonly string[] => {
  const resources = receipt.projection.logicalResources;
  const website = EffectArray.findFirst(
    resources,
    (resource) => resource.logicalId === "DocsWebsite"
  );
  const retiredBuild = EffectArray.findFirst(
    resources,
    (resource) => resource.logicalId === "DocsBuild"
  );
  const valid =
    Option.exists(website, (resource) => resource.action === expectedAction) &&
    Option.match(retiredBuild, {
      onNone: () => true,
      onSome: (resource) =>
        receipt.projection.schemaVersion === 1
          ? resource.action === expectedAction
          : resource.action === "delete",
    });
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
  const hostedOraclesFindings =
    HashSet.size(HashSet.fromIterable(ids)) !==
      expectedHostedOracleIds.length ||
    Array.some(expectedHostedOracleIds, (id) => !ids.includes(id))
      ? [
          "hosted-oracles: retain exactly one passing observation for every required hosted oracle",
        ]
      : [];
  const hostedProviderBindingFindings =
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
      ? [
          "hosted-provider-binding: hosted proof must use the provider-read-back candidate and URL",
        ]
      : [];
  return [...hostedOraclesFindings, ...hostedProviderBindingFindings];
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
) =>
  Effect.gen(function* () {
    const baseFindings = [
      ...(yield* inspectHistoricalDeploymentPlanReceipt(plan)),
      ...inspectHistoricalDeploymentPlanActions(plan, "create"),
      ...inspectHostedDeploymentProof(hosted),
      ...Array.flatMap(screenshots, (manifest) =>
        inspectScreenshotProviderBinding(manifest, provider)
      ),
    ];
    const previewEvidenceChainFindings =
      gitReadback.pullRequest.headSha !==
        plan.projection.candidate.exactCommit ||
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
      !Schema.toEquivalence(ProviderReadbackSchema)(
        hosted.provider,
        provider
      ) ||
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
        ? [
            "preview-evidence-chain: Git, plan, provider, hosted and screenshot receipts must bind one Preview candidate and stage",
          ]
        : [];
    return [...baseFindings, ...previewEvidenceChainFindings];
  });

export const inspectPreviewHostedEvidenceChain = (
  plan: HistoricalDeploymentPlanReceipt,
  provider: DeploymentProviderReadback,
  hosted: DeploymentHostedProofReceipt,
  screenshots: readonly DeploymentScreenshotManifest[]
) =>
  Effect.gen(function* () {
    const baseFindings = [
      ...(yield* inspectHistoricalDeploymentPlanReceipt(plan)),
      ...inspectHistoricalDeploymentPlanActions(plan, "create"),
      ...inspectHostedDeploymentProof(hosted),
      ...Array.flatMap(screenshots, (manifest) =>
        inspectScreenshotProviderBinding(manifest, provider)
      ),
    ];
    const previewHostedEvidenceChainFindings =
      plan.projection.candidate.exactCommit !== provider.candidateCommit ||
      plan.acceptedPlanSha256 !== provider.acceptedPlanSha256 ||
      plan.projection.configSha256 !== provider.configSha256 ||
      plan.projection.candidate.deploymentInputSha256 !==
        provider.deploymentInputSha256 ||
      plan.projection.candidate.lockfileSha256 !== provider.lockfileSha256 ||
      plan.projection.stage !== provider.stage ||
      hosted.candidateCommit !== provider.candidateCommit ||
      hosted.url !== provider.url ||
      !Schema.toEquivalence(ProviderReadbackSchema)(
        hosted.provider,
        provider
      ) ||
      hosted.environment !== "preview" ||
      screenshots.length !== 2 ||
      HashSet.size(
        HashSet.fromIterable(
          EffectArray.map(screenshots, (manifest) => manifest.viewport.kind)
        )
      ) !== 2 ||
      Array.some(screenshots, (manifest) => manifest.environment !== "preview")
        ? [
            "preview-hosted-evidence-chain: plan, provider, hosted and two-viewport screenshot receipts must bind one exact Preview candidate and stage",
          ]
        : [];
    return [...baseFindings, ...previewHostedEvidenceChainFindings];
  });

export const inspectProductionEvidenceChain = (
  plan: HistoricalDeploymentPlanReceipt,
  provider: DeploymentProviderReadback,
  hosted: DeploymentHostedProofReceipt,
  screenshots: readonly DeploymentScreenshotManifest[],
  environment: "production" | "rollback",
  expectedAction: "create" | "update"
) =>
  Effect.gen(function* () {
    const baseFindings = [
      ...(yield* inspectHistoricalDeploymentPlanReceipt(plan)),
      ...inspectHistoricalDeploymentPlanActions(plan, expectedAction),
      ...inspectHostedDeploymentProof(hosted),
      ...Array.flatMap(screenshots, (manifest) =>
        inspectScreenshotProviderBinding(manifest, provider)
      ),
    ];
    const productionEvidenceChainFindings =
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
      !Schema.toEquivalence(ProviderReadbackSchema)(
        hosted.provider,
        provider
      ) ||
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
        ? [
            "production-evidence-chain: plan, provider, hosted and two-viewport screenshot receipts must bind one fixed Production candidate",
          ]
        : [];
    return [...baseFindings, ...productionEvidenceChainFindings];
  });

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

type RollbackReceiptRepresentation = Schema.Codec.Encoded<
  typeof DeploymentProductionRollbackReceipt
>;

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
    readonly initialProviderReadbackPath: RollbackReceiptRepresentation["initialProduction"]["providerReadbackPath"];
    readonly restoredHostedProofPath: RollbackReceiptRepresentation["restoredProduction"]["hostedProofPath"];
    readonly restoredPlanPath: RollbackReceiptRepresentation["restoredProduction"]["planPath"];
    readonly restoredPreflightPath: RollbackReceiptRepresentation["restoredProduction"]["preflightPath"];
    readonly restoredProviderReadbackPath: RollbackReceiptRepresentation["restoredProduction"]["providerReadbackPath"];
    readonly restoredScreenshotManifestPaths: RollbackReceiptRepresentation["restoredProduction"]["screenshotManifestPaths"];
    readonly successorHostedProofPath: RollbackReceiptRepresentation["successor"]["hostedProofPath"];
    readonly successorPreviewHostedProofPath: RollbackReceiptRepresentation["successor"]["previewHostedProofPath"];
    readonly successorPreviewProviderReadbackPath: RollbackReceiptRepresentation["successor"]["previewProviderReadbackPath"];
    readonly successorPreviewTeardownPath: RollbackReceiptRepresentation["successor"]["previewTeardownPath"];
    readonly successorProviderReadbackPath: RollbackReceiptRepresentation["successor"]["providerReadbackPath"];
    readonly successorScreenshotManifestPaths: RollbackReceiptRepresentation["successor"]["screenshotManifestPaths"];
  }
): readonly string[] => {
  const screenshotEpochsValid =
    initialScreenshots.length === 2 &&
    restoredScreenshots.length === 2 &&
    Array.every(initialScreenshots, (initial) => {
      const restoredOption = EffectArray.findFirst(
        restoredScreenshots,
        (candidate) => candidate.viewport.kind === initial.viewport.kind
      );
      return Option.exists(
        restoredOption,
        (restored) =>
          initial.imagePath !== restored.imagePath ||
          (initial.imageSha256 === restored.imageSha256 &&
            initial.imagePath.includes(initial.imageSha256.slice(0, 12)) &&
            EffectArray.some(initial.limitations, (limitation) =>
              limitation.includes("content-addressed")
            ) &&
            EffectArray.some(restored.limitations, (limitation) =>
              limitation.includes("content-addressed")
            ))
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
      !Array.every(receipt.successor.screenshotManifestPaths, (path, index) =>
        Option.exists(
          Array.get(expectedPaths.successorScreenshotManifestPaths, index),
          (expected) => path === expected
        )
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
          Option.exists(
            Array.get(expectedPaths.restoredScreenshotManifestPaths, index),
            (expected) => path === expected
          )
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
  const baseFindings = [
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
  const previewMutationPreflightFindings =
    commonMismatch || deployMismatch || destroyMismatch
      ? [
          "preview-mutation-preflight: candidate, credential scope, plan, provider and state identities must prove the exact deploy or destroy target before mutation",
        ]
      : [];
  return [...baseFindings, ...previewMutationPreflightFindings];
};

export const inspectPreviewTeardownReceipt = (
  receipt: DeploymentPreviewTeardownReceipt,
  plan: HistoricalDeploymentPlanReceipt,
  provider: DeploymentProviderReadback
) =>
  Effect.gen(function* () {
    const baseFindings = [
      ...(yield* inspectHistoricalDeploymentPlanReceipt(plan)),
      ...inspectHistoricalDeploymentPlanActions(plan, "delete"),
    ];
    const previewTeardownBindingFindings =
      plan.operation !== "preview-destroy" ||
      receipt.destroyPlanSha256 !== plan.acceptedPlanSha256 ||
      receipt.candidateCommit !== plan.projection.candidate.exactCommit ||
      receipt.candidateCommit !== provider.candidateCommit ||
      receipt.physicalWorkerName !== provider.physicalWorkerName ||
      receipt.url !== provider.url ||
      receipt.provider.matchingWorkerCount !== 0 ||
      receipt.state.stagePresent ||
      receipt.state.previewResourceCount !== 0
        ? [
            "preview-teardown-binding: destroy plan, deployed identity, provider absence and state absence must bind one exact Preview",
          ]
        : [];
    return [...baseFindings, ...previewTeardownBindingFindings];
  });

export const inspectPreviewWorkflowTeardownReceipt = (
  receipt: DeploymentPreviewWorkflowTeardownReceipt,
  plan: HistoricalDeploymentPlanReceipt,
  provider: DeploymentProviderReadback
) =>
  Effect.gen(function* () {
    const baseFindings = [
      ...(yield* inspectHistoricalDeploymentPlanReceipt(plan)),
      ...inspectHistoricalDeploymentPlanActions(plan, "delete"),
    ];
    const previewWorkflowTeardownBindingFindings =
      plan.operation !== "preview-destroy" ||
      receipt.destroyPlanSha256 !== plan.acceptedPlanSha256 ||
      receipt.reviewedWorkflowCommit !==
        plan.projection.candidate.exactCommit ||
      receipt.stage !== plan.projection.stage ||
      receipt.candidateCommit !== provider.candidateCommit ||
      receipt.stage !== provider.stage ||
      receipt.physicalWorkerName !== provider.physicalWorkerName ||
      receipt.url !== provider.url ||
      receipt.provider.matchingWorkerCount !== 0 ||
      receipt.state.stagePresent ||
      receipt.state.previewResourceCount !== 0
        ? [
            "preview-workflow-teardown-binding: reviewed teardown source, deployed candidate, destroy plan, provider absence and state absence must remain separate and claim-matched",
          ]
        : [];
    return [...baseFindings, ...previewWorkflowTeardownBindingFindings];
  });

export const inspectDeploymentOwners = (
  inventory: DeploymentJourneyInventory,
  receipt: DeploymentAuthorityPreflightReceipt
) =>
  Effect.gen(function* () {
    const ids = Array.map(inventory.journeys, (journey) => journey.id);
    const journeyInventoryFindings =
      HashSet.size(HashSet.fromIterable(ids)) !== expectedJourneyIds.length ||
      Array.some(expectedJourneyIds, (id) => !ids.includes(id))
        ? [
            "journey-inventory: retain exactly the four stable deployment journey IDs",
          ]
        : [];
    const journeyOraclesFindings = Array.some(
      inventory.journeys,
      (journey) =>
        journey.oracleClasses.length === 0 ||
        journey.falseGreenOracles.length === 0 ||
        !journey.receiptRoute.startsWith("docs/evidence/deployments/")
    )
      ? [
          "journey-oracles: every journey needs dated evidence routing, proportional oracles and explicit false-green protection",
        ]
      : [];
    const preflightStopFindings =
      receipt.candidate.status !== "not-trusted-pr-head" ||
      receipt.candidate.pullRequestNumber !== null ||
      receipt.state.mutationCount !== 0 ||
      receipt.postcondition !== "stopped-before-state-or-provider-mutation"
        ? [
            "preflight-stop: an untrusted local-only candidate must stop before state initialization, plan or provider mutation",
          ]
        : [];
    const authorityStopFindings =
      receipt.approval.approvedOperations.includes("preview-plan") &&
      receipt.stop.operation !== "preview-plan"
        ? ["authority-stop: approval does not waive trusted-candidate identity"]
        : [];
    const { evidenceDigest, ...evidenceProjection } = receipt;
    const observedDigest = yield* deploymentRecordDigest(evidenceProjection);
    const receiptDigestFindings =
      observedDigest === evidenceDigest
        ? []
        : [
            "receipt-digest: evidenceDigest must bind the canonical receipt projection excluding itself",
          ];
    return [
      ...journeyInventoryFindings,
      ...journeyOraclesFindings,
      ...preflightStopFindings,
      ...authorityStopFindings,
      ...receiptDigestFindings,
    ];
  });

export const inspectGitAuthorityReceipt = (
  receipt: DeploymentGitAuthorityReceipt
): readonly string[] => {
  const gitAuthorityTargetFindings =
    receipt.approval.candidateCommit !== receipt.precondition.headCommit ||
    receipt.approval.branch !== "codex/docs-cloudflare-alchemy-deployment" ||
    receipt.approval.baseBranch !== "main" ||
    receipt.approval.remote !== "origin"
      ? [
          "git-authority-target: candidate, branch, base and remote must match the exact approved Git target",
        ]
      : [];
  const gitAuthorityExclusionsFindings =
    !receipt.approval.exclusions.includes("force-push") ||
    !receipt.approval.exclusions.includes("merge") ||
    !receipt.approval.exclusions.includes("branch-deletion")
      ? [
          "git-authority-exclusions: merge, force-push and branch deletion must remain excluded",
        ]
      : [];
  return [...gitAuthorityTargetFindings, ...gitAuthorityExclusionsFindings];
};

export const inspectGitReadbackReceipt = (
  receipt: DeploymentGitReadbackReceipt
): readonly string[] => {
  const gitReadbackBindingFindings =
    receipt.remote.candidateCommit !== receipt.pullRequest.headSha ||
    receipt.pullRequest.headName !== receipt.remote.branch ||
    receipt.pullRequest.number !== 1 ||
    receipt.stage !== "pr-1"
      ? [
          "git-readback-binding: remote branch, draft PR head, number and deterministic stage must identify one exact candidate",
        ]
      : [];
  const gitReadbackStateFindings =
    receipt.pullRequest.baseName !== "main" ||
    !receipt.pullRequest.isDraft ||
    receipt.pullRequest.state !== "OPEN"
      ? [
          "git-readback-state: the accepted candidate must be an open draft pull request against main",
        ]
      : [];
  return [...gitReadbackBindingFindings, ...gitReadbackStateFindings];
};

export const inspectProviderPreflightReceipt = (
  receipt: DeploymentProviderPreflightReceipt,
  gitReadback: DeploymentGitReadbackReceipt
): readonly string[] => {
  const providerPreflightCandidateFindings =
    receipt.candidate.exactCommit !== gitReadback.pullRequest.headSha ||
    receipt.candidate.pullRequestNumber !== gitReadback.pullRequest.number ||
    receipt.stage !== gitReadback.stage
      ? [
          "provider-preflight-candidate: provider inventory must bind the current trusted PR head and derived stage",
        ]
      : [];
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
  const providerPreflightStateFindings =
    !partialStateIsExact && !emptyStateIsExact
      ? [
          "provider-preflight-state: inventory must prove either an empty first-Preview state or the exact resumable build-created/worker-creating state with provider absence",
        ]
      : [];
  const providerPreflightPlanFindings =
    receipt.provider.billingSubscriptionReadback === "forbidden-403" &&
    !EffectArray.some(receipt.limitations, (limitation) =>
      limitation.includes("not the billing subscription")
    )
      ? [
          "provider-preflight-plan: denied billing readback must remain an explicit non-claim",
        ]
      : [];
  return [
    ...providerPreflightCandidateFindings,
    ...providerPreflightStateFindings,
    ...providerPreflightPlanFindings,
  ];
};

export const inspectResumePreflightReceipt = (
  receipt: DeploymentResumePreflightReceipt,
  gitReadback: DeploymentGitReadbackReceipt,
  plan: HistoricalDeploymentPlanReceipt
): readonly string[] => {
  const resumePreflightCandidateFindings =
    receipt.candidate.exactCommit !== gitReadback.pullRequest.headSha ||
    receipt.candidate.exactCommit !== plan.projection.candidate.exactCommit ||
    receipt.stage !== gitReadback.stage ||
    receipt.stage !== plan.projection.stage
      ? [
          "resume-preflight-candidate: trusted Git, state/provider preflight and equal plan must bind one candidate and stage",
        ]
      : [];
  const resumePreflightScopeFindings =
    receipt.provider.taxkitWorkerCount !== 1 ||
    !receipt.state.workerIdentityAgreement ||
    !Option.exists(
      Array.get(receipt.state.resources, 0),
      (resource) => resource.logicalId === "DocsBuild"
    ) ||
    !Option.exists(
      Array.get(receipt.state.resources, 1),
      (resource) => resource.logicalId === "DocsWebsite"
    )
      ? [
          "resume-preflight-scope: resume requires exactly one matching TaxKit Worker and the two owned state resources",
        ]
      : [];
  return [...resumePreflightCandidateFindings, ...resumePreflightScopeFindings];
};
