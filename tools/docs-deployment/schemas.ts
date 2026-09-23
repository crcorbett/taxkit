import { DocsDeploymentStage } from "@taxkit/infrastructure/stage";
import { Schema } from "effect";

const CommitSha = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}$/u));
const Sha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u));
const WorkersDevUrl = Schema.String.check(
  Schema.isPattern(/^https:\/\/[^/]+\.workers\.dev\/?$/u)
).pipe(Schema.brand("taxkit/WorkersDevUrl"));
const CloudflareAccountId = Schema.String.check(
  Schema.isPattern(/^[a-f0-9]{32}$/u)
).pipe(Schema.brand("taxkit/CloudflareAccountId"));
const ProviderIdentity = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9._:/-]+$/u)
).pipe(Schema.brand("taxkit/DocsDeploymentProviderIdentity"));
const RepositoryEvidencePath = Schema.String.check(
  Schema.isPattern(
    /^docs\/evidence\/deployments\/(?!\.\.(?:\/|$))(?!.*\/\.\.(?:\/|$))[A-Za-z0-9._/-]+$/u
  )
).pipe(Schema.brand("taxkit/DocsDeploymentEvidencePath"));

const DeploymentJourneyId = Schema.Literals([
  "taxkit-docs-workerd",
  "taxkit-docs-preview",
  "taxkit-docs-production",
  "taxkit-docs-deployment-rollback",
]);

const DeploymentJourney = Schema.Struct({
  claim: Schema.NonEmptyString,
  environment: Schema.Literals([
    "local-workerd",
    "cloudflare-preview",
    "cloudflare-production",
    "cloudflare-production-rollback",
  ]),
  falseGreenOracles: Schema.NonEmptyArray(Schema.NonEmptyString),
  id: DeploymentJourneyId,
  oracleClasses: Schema.NonEmptyArray(Schema.NonEmptyString),
  receiptRoute: Schema.NonEmptyString,
});

export const DeploymentJourneyInventory = Schema.Struct({
  journeys: Schema.Tuple([
    DeploymentJourney,
    DeploymentJourney,
    DeploymentJourney,
    DeploymentJourney,
  ]),
  owner: Schema.Literal("taxkit-docs-deployment-proof-owner"),
  reviewTrigger: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
});
export type DeploymentJourneyInventory = typeof DeploymentJourneyInventory.Type;

/**
 * The receipt Schemas below are retained historical evidence decoders. Current
 * workflow admission uses DeploymentPlanReceipt, inventory.schemas.ts and
 * workflow-receipts.schemas.ts, which admit only the native Website resource.
 */

const AuthorityOperation = Schema.Literals([
  "credential-account-preflight",
  "state-inventory",
  "state-bootstrap-adoption",
  "preview-plan",
  "preview-equal-replan",
  "preview-deploy",
  "preview-provider-readback",
  "preview-hosted-proof",
  "preview-screenshot-review",
  "preview-destroy",
  "preview-absence-readback",
  "production-plan",
  "production-equal-replan",
  "production-deploy",
  "production-provider-readback",
  "production-hosted-proof",
  "production-screenshot-review",
  "production-rollback-redeploy",
  "production-rollback-readback",
  "alchemy-reconciliation",
]);

const ProviderObservation = Schema.Struct({
  accountId: CloudflareAccountId,
  accountPlanReadback: Schema.Literal("not-attempted"),
  alchemyProfile: Schema.NonEmptyString,
  alchemyProfileStatus: Schema.Literal("authenticated"),
  cloudflareCredentialExpiresAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  cloudflareCredentialScopeReadback: Schema.Literal("not-attempted"),
  cloudflareCredentialSource: Schema.Literal("alchemy-oauth-profile"),
  githubLogin: Schema.NonEmptyString,
  workersSubdomainReadback: Schema.Literal("not-attempted"),
  wranglerCredentialStatus: Schema.Literal("expired"),
});

export const DeploymentProviderPreflightReceipt = Schema.Struct({
  candidate: Schema.Struct({
    exactCommit: CommitSha,
    pullRequestNumber: Schema.Int.check(Schema.isGreaterThan(0)),
    status: Schema.Literal("trusted-pr-head"),
  }),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operationsExecuted: Schema.Tuple([
    Schema.Literal("credential-account-preflight"),
    Schema.Literal("workers-account-settings-readback"),
    Schema.Literal("workers-subdomain-readback"),
    Schema.Literal("billing-subscription-readback"),
    Schema.Literal("state-inventory"),
    Schema.Literal("provider-worker-list-readback"),
  ]),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literals([
    "account-subdomain-and-empty-taxkit-state-confirmed",
    "partial-taxkit-state-and-provider-absence-confirmed",
  ]),
  provider: Schema.Struct({
    accountId: CloudflareAccountId,
    accountType: Schema.Literal("standard"),
    billingSubscriptionReadback: Schema.Literal("forbidden-403"),
    cloudflareCredentialExpiresAt: Schema.String.check(
      Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
    ),
    cloudflareCredentialSource: Schema.Literal("alchemy-oauth-profile"),
    cloudflareCredentialType: Schema.Literal("oauth"),
    greenCompute: Schema.Boolean,
    taxkitWorkerCount: Schema.Literal(0),
    workersSubdomain: Schema.NonEmptyString,
    workersUsageModel: Schema.Literal("standard"),
  }),
  receiptId: Schema.Literal(
    "DCD-002-provider-resume-preflight-pr-1-2026-07-30"
  ),
  rollback: Schema.Literal("none-required-read-only"),
  schemaVersion: Schema.Literal(1),
  stage: DocsDeploymentStage,
  state: Schema.Struct({
    genericCliResult: Schema.Literal("rejected-placeholder-stage"),
    id: Schema.Literal("cloudflare-http"),
    otherStackCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    resources: Schema.Array(
      Schema.Struct({
        logicalId: Schema.Literals(["DocsBuild", "DocsWebsite"]),
        status: Schema.Literals(["created", "creating"]),
      })
    ),
    taxkitStackPresent: Schema.Boolean,
    version: Schema.Int.check(Schema.isGreaterThan(0)),
  }),
});
export type DeploymentProviderPreflightReceipt =
  typeof DeploymentProviderPreflightReceipt.Type;

export const DeploymentApplyFailureReceipt = Schema.Struct({
  candidateCommit: CommitSha,
  error: Schema.Struct({
    message: Schema.Literal(
      "unresolved Worker main reached beta.64 compatibility precreate"
    ),
    providerMutationCount: Schema.Literal(0),
    remoteStatePostcondition: Schema.Literal(
      "DocsBuild-created-DocsWebsite-creating"
    ),
  }),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operation: Schema.Literal("preview-deploy"),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  planSha256: Sha256,
  receiptId: Schema.Literal("DCD-002-preview-apply-failure-2026-07-30"),
  recovery: Schema.NonEmptyString,
  rollback: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  stage: DocsDeploymentStage,
});
export type DeploymentApplyFailureReceipt =
  typeof DeploymentApplyFailureReceipt.Type;

const DeploymentPlanProjectionFields = {
  candidate: Schema.Struct({
    deploymentInputSha256: Sha256,
    exactCommit: CommitSha,
    lockfileSha256: Sha256,
  }),
  configSha256: Sha256,
  redaction: Schema.Struct({
    ansiRemoved: Schema.Literal(true),
    secretValuesIncluded: Schema.Literal(false),
    timestampsExcludedFromDigest: Schema.Literal(true),
  }),
  stack: Schema.Literal("TaxKitDocsCloudflare"),
  stage: DocsDeploymentStage,
} as const;

const HistoricalLegacyDeploymentPlanProjection = Schema.Struct({
  ...DeploymentPlanProjectionFields,
  logicalResources: Schema.Tuple([
    Schema.Struct({
      action: Schema.Literals(["create", "update", "noop", "delete"]),
      logicalId: Schema.Literal("DocsBuild"),
      resourceType: Schema.Literal("Command.Build"),
    }),
    Schema.Struct({
      action: Schema.Literals(["create", "update", "noop", "delete"]),
      logicalId: Schema.Literal("DocsWebsite"),
      resourceType: Schema.Literal("Cloudflare.Worker"),
    }),
  ]),
  schemaVersion: Schema.Literal(1),
});

const NativeWebsiteResource = Schema.Struct({
  action: Schema.Literals(["create", "update", "noop", "delete"]),
  logicalId: Schema.Literal("DocsWebsite"),
  resourceType: Schema.Literal("Cloudflare.Worker"),
});

const RetiredBuildResource = Schema.Struct({
  action: Schema.Literal("delete"),
  logicalId: Schema.Literal("DocsBuild"),
  resourceType: Schema.Literal("Command.Build"),
});

const HistoricalNativeDeploymentPlanProjection = Schema.Struct({
  ...DeploymentPlanProjectionFields,
  logicalResources: Schema.Union([
    Schema.Tuple([NativeWebsiteResource]),
    Schema.Tuple([RetiredBuildResource, NativeWebsiteResource]),
  ]),
  schemaVersion: Schema.Literal(2),
});

export const HistoricalDeploymentPlanProjection = Schema.Union([
  HistoricalLegacyDeploymentPlanProjection,
  HistoricalNativeDeploymentPlanProjection,
]);
export type HistoricalDeploymentPlanProjection =
  typeof HistoricalDeploymentPlanProjection.Type;

export const DeploymentPlanProjection = Schema.Struct({
  ...DeploymentPlanProjectionFields,
  logicalResources: Schema.Tuple([NativeWebsiteResource]),
  schemaVersion: Schema.Literal(2),
});
export type DeploymentPlanProjection = typeof DeploymentPlanProjection.Type;

export const DeploymentPlanReceipt = Schema.Struct({
  acceptedBy: Schema.NonEmptyString,
  acceptedPlanSha256: Sha256,
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operation: Schema.Literals([
    "preview-plan",
    "preview-equal-replan",
    "production-plan",
    "production-equal-replan",
    "preview-destroy",
  ]),
  projection: DeploymentPlanProjection,
  receiptPath: RepositoryEvidencePath,
  replanSha256: Schema.NullOr(Sha256),
  schemaVersion: Schema.Literal(2),
});
export type DeploymentPlanReceipt = typeof DeploymentPlanReceipt.Type;

export const HistoricalDeploymentPlanReceipt = Schema.Struct({
  acceptedBy: Schema.NonEmptyString,
  acceptedPlanSha256: Sha256,
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operation: Schema.Literals([
    "preview-plan",
    "preview-equal-replan",
    "production-plan",
    "production-equal-replan",
    "preview-destroy",
  ]),
  projection: HistoricalDeploymentPlanProjection,
  receiptPath: RepositoryEvidencePath,
  replanSha256: Schema.NullOr(Sha256),
  schemaVersion: Schema.Literals([1, 2]),
});
export type HistoricalDeploymentPlanReceipt =
  typeof HistoricalDeploymentPlanReceipt.Type;

export const DeploymentProviderReadback = Schema.Struct({
  acceptedPlanSha256: Sha256,
  accountId: CloudflareAccountId,
  assets: Schema.Struct({
    manifestSha256: Sha256,
    status: Schema.Literals(["present", "absent"]),
  }),
  candidateCommit: CommitSha,
  configSha256: Sha256,
  deploymentId: ProviderIdentity,
  deploymentInputSha256: Sha256,
  lockfileSha256: Sha256,
  logicalResourceId: Schema.Literal("DocsWebsite"),
  observability: Schema.Struct({
    invocationLogs: Schema.Literal(true),
    persist: Schema.Literal(true),
    traces: Schema.Literal(false),
  }),
  physicalWorkerName: ProviderIdentity,
  providerObservedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  schemaVersion: Schema.Literal(1),
  stack: Schema.Literal("TaxKitDocsCloudflare"),
  stage: DocsDeploymentStage,
  state: Schema.Struct({
    assetsManifestSha256: Sha256,
    bundleSha256: Sha256,
    id: Schema.Literal("cloudflare-http"),
    instanceId: ProviderIdentity,
    metadataSha256: Sha256,
    output: Schema.Struct({
      logicalResourceId: Schema.Literal("DocsWebsite"),
      stage: DocsDeploymentStage,
      workerName: ProviderIdentity,
      workerUrl: WorkersDevUrl,
    }),
    resources: Schema.Tuple([
      Schema.Struct({
        logicalId: Schema.Literal("DocsBuild"),
        status: Schema.Literals(["created", "updated"]),
      }),
      Schema.Struct({
        logicalId: Schema.Literal("DocsWebsite"),
        status: Schema.Literals(["created", "updated"]),
      }),
    ]),
    version: Schema.Literal(7),
  }),
  url: WorkersDevUrl,
  versionId: ProviderIdentity,
});
export type DeploymentProviderReadback = typeof DeploymentProviderReadback.Type;

const HostedOracle = Schema.Struct({
  expected: Schema.NonEmptyString,
  id: Schema.Literals([
    "initial-ssr",
    "static-assets",
    "hydration",
    "client-navigation-no-document",
    "server-function-transport",
    "native-404",
    "accessibility",
    "console-page-cleanliness",
    "cache-headers",
  ]),
  observed: Schema.NonEmptyString,
  status: Schema.Literal("passed"),
});

export const DeploymentHostedProofReceipt = Schema.Struct({
  candidateCommit: CommitSha,
  environment: Schema.Literals(["preview", "production", "rollback"]),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  oracles: Schema.Tuple([
    HostedOracle,
    HostedOracle,
    HostedOracle,
    HostedOracle,
    HostedOracle,
    HostedOracle,
    HostedOracle,
    HostedOracle,
    HostedOracle,
  ]),
  provider: DeploymentProviderReadback,
  reviewer: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  url: WorkersDevUrl,
});
export type DeploymentHostedProofReceipt =
  typeof DeploymentHostedProofReceipt.Type;

export const DeploymentScreenshotManifest = Schema.Struct({
  acceptedPlanSha256: Sha256,
  browser: Schema.Struct({
    name: Schema.Literal("chromium"),
    version: Schema.NonEmptyString,
  }),
  candidateCommit: CommitSha,
  capturedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  deploymentId: ProviderIdentity,
  deploymentInputSha256: Sha256,
  environment: Schema.Literals(["preview", "production", "rollback"]),
  expectedState: Schema.NonEmptyString,
  imagePath: RepositoryEvidencePath,
  imageSha256: Sha256,
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  lockfileSha256: Sha256,
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedState: Schema.NonEmptyString,
  recoveryIdentity: Schema.NonEmptyString,
  reviewedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  reviewer: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  sourceConfigSha256: Sha256,
  stage: DocsDeploymentStage,
  url: WorkersDevUrl,
  versionId: ProviderIdentity,
  viewport: Schema.Struct({
    deviceScaleFactor: Schema.Number.check(Schema.isGreaterThan(0)),
    height: Schema.Int.check(Schema.isGreaterThan(0)),
    kind: Schema.Literals(["desktop", "mobile"]),
    width: Schema.Int.check(Schema.isGreaterThan(0)),
  }),
  workerName: ProviderIdentity,
});
export type DeploymentScreenshotManifest =
  typeof DeploymentScreenshotManifest.Type;

export const DeploymentPreviewCredentialReadbackReceipt = Schema.Struct({
  accountId: CloudflareAccountId,
  broadExistingCredential: Schema.Literal(true),
  candidateCommit: CommitSha,
  expiresAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  profile: Schema.Literal("default"),
  receiptId: Schema.NonEmptyString,
  requiredScopesPresent: Schema.Literal(true),
  schemaVersion: Schema.Literal(1),
  scopeSetSha256: Sha256,
  stage: Schema.Literal("pr-1"),
});
export type DeploymentPreviewCredentialReadbackReceipt =
  typeof DeploymentPreviewCredentialReadbackReceipt.Type;

export const DeploymentProductionPreflightReceipt = Schema.Struct({
  acceptedPlanSha256: Sha256,
  acceptedPreview: Schema.Struct({
    candidateCommit: CommitSha,
    deploymentInputSha256: Sha256,
    hostedProofPath: Schema.Literal(
      "docs/evidence/deployments/2026-07-30-preview-pr-1/hosted-proof-d9cb894.json"
    ),
    lockfileSha256: Sha256,
    providerReadbackPath: Schema.Literal(
      "docs/evidence/deployments/2026-07-30-preview-pr-1/provider-readback-d9cb894.json"
    ),
    sourceConfigSha256: Sha256,
    teardownPath: Schema.Literal(
      "docs/evidence/deployments/2026-07-30-preview-pr-1/teardown-d9cb894.json"
    ),
  }),
  account: Schema.Struct({
    accountId: CloudflareAccountId,
    billingSubscriptionReadback: Schema.Literal("forbidden-403"),
    costAndLimitAcceptance: Schema.Struct({
      acceptedAtLocal: Schema.Literal("2026-07-30 Australia/Melbourne"),
      acceptedBy: Schema.Literal("Cooper, TaxKit repository/product owner"),
      limitsDocumentation: Schema.Literal(
        "https://developers.cloudflare.com/workers/platform/limits/"
      ),
      pricingDocumentation: Schema.Literal(
        "https://developers.cloudflare.com/workers/platform/pricing/"
      ),
      productionWorkersDevLimitationAccepted: Schema.Literal(true),
      routingDocumentation: Schema.Literal(
        "https://developers.cloudflare.com/workers/configuration/routing/"
      ),
      standardUsageModelAccepted: Schema.Literal(true),
    }),
    defaultUsageModel: Schema.Literal("standard"),
    planTierClaim: Schema.Literal("not-established"),
    workersSubdomain: Schema.NonEmptyString,
  }),
  authority: Schema.Struct({
    approvingPrincipal: Schema.Literal(
      "Cooper, TaxKit repository/product owner"
    ),
    durationOrRevocation: Schema.NonEmptyString,
    executingPrincipal: Schema.Literal(
      "authorized TaxKit docs deployment implementation thread"
    ),
    operation: Schema.Literal("production-deploy"),
  }),
  candidate: Schema.Struct({
    deploymentInputSha256: Sha256,
    exactCommit: CommitSha,
    lockfileSha256: Sha256,
    sourceConfigSha256: Sha256,
  }),
  credentials: Schema.Struct({
    accountId: CloudflareAccountId,
    expiresAt: Schema.String.check(
      Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
    ),
    profile: Schema.Literal("default"),
    scopeSetSha256: Sha256,
  }),
  lastKnownGood: Schema.Struct({
    candidateCommit: CommitSha,
    priorProductionDeployment: Schema.Literal("absent-first-production"),
    qualification: Schema.Literal("accepted-preview-source"),
  }),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operation: Schema.Literal("production-deploy-preflight"),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literal(
    "fixed-production-stage-absent-and-safe-to-create"
  ),
  provider: Schema.Struct({
    matchingWorkerCount: Schema.Literal(0),
    workerPrefix: Schema.Literal("taxkitdocscloudflare-docswebsite-prod-"),
  }),
  receiptId: Schema.Literal(
    "DCD-003-production-deploy-preflight-d9cb894-2026-07-30"
  ),
  rollback: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  stack: Schema.Literal("TaxKitDocsCloudflare"),
  stage: Schema.Literal("prod"),
  state: Schema.Struct({
    id: Schema.Literal("cloudflare-http"),
    resources: Schema.Tuple([]),
    stagePresent: Schema.Literal(false),
    version: Schema.Literal(7),
  }),
});
export type DeploymentProductionPreflightReceipt =
  typeof DeploymentProductionPreflightReceipt.Type;

const ProductionProviderIdentity = Schema.Struct({
  deploymentId: ProviderIdentity,
  physicalWorkerName: ProviderIdentity,
  url: WorkersDevUrl,
  versionId: ProviderIdentity,
});

export const DeploymentProductionMutationPreflightReceipt = Schema.Struct({
  acceptedPlanSha256: Sha256,
  authority: Schema.Struct({
    approvingPrincipal: Schema.Literal(
      "Cooper, TaxKit repository/product owner"
    ),
    durationOrRevocation: Schema.NonEmptyString,
    executingPrincipal: Schema.Literal(
      "authorized TaxKit docs deployment implementation thread"
    ),
    operation: Schema.Literals([
      "production-deploy",
      "production-rollback-redeploy",
    ]),
  }),
  candidate: Schema.Struct({
    deploymentInputSha256: Sha256,
    exactCommit: CommitSha,
    lockfileSha256: Sha256,
    sourceConfigSha256: Sha256,
  }),
  credentials: Schema.Struct({
    accountId: CloudflareAccountId,
    expiresAt: Schema.String.check(
      Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
    ),
    profile: Schema.Literal("default"),
    scopeSetSha256: Sha256,
  }),
  currentProduction: Schema.Struct({
    candidateCommit: CommitSha,
    provider: ProductionProviderIdentity,
  }),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operation: Schema.Literals([
    "production-deploy-preflight",
    "production-rollback-preflight",
  ]),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literal(
    "fixed-production-worker-and-state-agree-and-update-is-safe"
  ),
  receiptId: Schema.NonEmptyString,
  rollback: Schema.NonEmptyString,
  rollbackTarget: Schema.Struct({
    candidateCommit: CommitSha,
    qualification: Schema.NonEmptyString,
  }),
  schemaVersion: Schema.Literal(1),
  stack: Schema.Literal("TaxKitDocsCloudflare"),
  stage: Schema.Literal("prod"),
  state: Schema.Struct({
    id: Schema.Literal("cloudflare-http"),
    resources: Schema.Tuple([
      Schema.Struct({
        logicalId: Schema.Literal("DocsBuild"),
        status: Schema.Literals(["created", "updated"]),
      }),
      Schema.Struct({
        logicalId: Schema.Literal("DocsWebsite"),
        status: Schema.Literals(["created", "updated"]),
      }),
    ]),
    version: Schema.Literal(7),
    workerIdentityAgreement: Schema.Literal(true),
  }),
});
export type DeploymentProductionMutationPreflightReceipt =
  typeof DeploymentProductionMutationPreflightReceipt.Type;

const ProductionEvidenceIdentityFields = {
  candidateCommit: CommitSha,
  deploymentId: ProviderIdentity,
  providerReadbackPath: RepositoryEvidencePath,
  stateBundleSha256: Sha256,
  versionId: ProviderIdentity,
} as const;
const ProductionEvidenceIdentity = Schema.Struct(
  ProductionEvidenceIdentityFields
);

export const DeploymentProductionRollbackReceipt = Schema.Struct({
  acceptedPlanSha256: Sha256,
  authority: Schema.Struct({
    approvingPrincipal: Schema.Literal(
      "Cooper, TaxKit repository/product owner"
    ),
    operation: Schema.Literal("production-rollback-redeploy"),
  }),
  initialProduction: ProductionEvidenceIdentity,
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operation: Schema.Literal("production-normal-source-bound-rollback"),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literal(
    "stable-production-worker-restored-to-qualified-source"
  ),
  receiptId: Schema.Literal(
    "DCD-003-production-normal-rollback-d9cb894-2026-07-30"
  ),
  recovery: Schema.NonEmptyString,
  restoredProduction: Schema.Struct({
    ...ProductionEvidenceIdentityFields,
    hostedProofPath: RepositoryEvidencePath,
    planPath: RepositoryEvidencePath,
    preflightPath: RepositoryEvidencePath,
    screenshotManifestPaths: Schema.Tuple([
      RepositoryEvidencePath,
      RepositoryEvidencePath,
    ]),
  }),
  schemaVersion: Schema.Literal(1),
  stableIdentity: Schema.Struct({
    physicalWorkerName: ProviderIdentity,
    stateInstanceId: ProviderIdentity,
    url: WorkersDevUrl,
  }),
  stack: Schema.Literal("TaxKitDocsCloudflare"),
  stage: Schema.Literal("prod"),
  successor: Schema.Struct({
    ...ProductionEvidenceIdentityFields,
    hostedProofPath: RepositoryEvidencePath,
    previewHostedProofPath: RepositoryEvidencePath,
    previewProviderReadbackPath: RepositoryEvidencePath,
    previewTeardownPath: RepositoryEvidencePath,
    screenshotManifestPaths: Schema.Tuple([
      RepositoryEvidencePath,
      RepositoryEvidencePath,
    ]),
  }),
  verifiedPostconditions: Schema.Struct({
    deploymentIdChangedAtEachTransition: Schema.Literal(true),
    providerAndStateAgree: Schema.Literal(true),
    restoredBundleMatchesInitial: Schema.Literal(true),
    stableWorkerIdentityPreserved: Schema.Literal(true),
    successorPreviewRemoved: Schema.Literal(true),
    versionIdChangedAtEachTransition: Schema.Literal(true),
  }),
});
export type DeploymentProductionRollbackReceipt =
  typeof DeploymentProductionRollbackReceipt.Type;

const PreviewMutationProviderIdentity = Schema.Struct({
  deploymentId: ProviderIdentity,
  physicalWorkerName: ProviderIdentity,
  url: WorkersDevUrl,
  versionId: ProviderIdentity,
});

export const DeploymentPreviewMutationPreflightReceipt = Schema.Struct({
  acceptedPlanSha256: Sha256,
  build: Schema.Struct({
    assetsManifestSha256: Sha256,
    identityAlgorithm: Schema.Literal(
      "sha256-canonical-json-config-and-path-sorted-content-manifests"
    ),
    serverEntrySha256: Sha256,
    serverManifestSha256: Sha256,
    wranglerConfigSha256: Sha256,
  }),
  candidate: Schema.Struct({
    deploymentInputSha256: Sha256,
    exactCommit: CommitSha,
    lockfileSha256: Sha256,
    pullRequestNumber: Schema.Literal(1),
    sourceConfigSha256: Sha256,
    status: Schema.Literal("trusted-pr-head"),
  }),
  credentials: Schema.Struct({
    accountId: CloudflareAccountId,
    broadExistingCredential: Schema.Literal(true),
    expiresAt: Schema.String.check(
      Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
    ),
    profile: Schema.Literal("default"),
    requiredScopesPresent: Schema.Literal(true),
    scopeSetSha256: Sha256,
  }),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operation: Schema.Literals([
    "preview-deploy-preflight",
    "preview-destroy-preflight",
  ]),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literals([
    "exact-stage-absent-and-safe-to-create",
    "exact-stage-present-and-safe-to-destroy",
  ]),
  provider: Schema.Struct({
    identity: Schema.NullOr(PreviewMutationProviderIdentity),
    matchingWorkerCount: Schema.Int.check(
      Schema.isGreaterThanOrEqualTo(0),
      Schema.isLessThanOrEqualTo(1)
    ),
    workersSubdomain: Schema.NonEmptyString,
  }),
  receiptId: Schema.NonEmptyString,
  rollback: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  stack: Schema.Literal("TaxKitDocsCloudflare"),
  stage: Schema.Literal("pr-1"),
  state: Schema.Struct({
    id: Schema.Literal("cloudflare-http"),
    resources: Schema.Array(
      Schema.Struct({
        logicalId: Schema.Literals(["DocsBuild", "DocsWebsite"]),
        status: Schema.Literals(["created", "creating", "updated"]),
      })
    ),
    stagePresent: Schema.Boolean,
    version: Schema.Literal(7),
    workerIdentityAgreement: Schema.Boolean,
  }),
});
export type DeploymentPreviewMutationPreflightReceipt =
  typeof DeploymentPreviewMutationPreflightReceipt.Type;

export const DeploymentPreviewTeardownReceipt = Schema.Struct({
  accountId: CloudflareAccountId,
  candidateCommit: CommitSha,
  destroyPlanSha256: Sha256,
  destroyedResources: Schema.Tuple([
    Schema.Struct({
      logicalId: Schema.Literal("DocsBuild"),
      resourceType: Schema.Literal("Command.Build"),
    }),
    Schema.Struct({
      logicalId: Schema.Literal("DocsWebsite"),
      resourceType: Schema.Literal("Cloudflare.Worker"),
    }),
  ]),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operation: Schema.Literal("preview-destroy-and-absence-readback"),
  physicalWorkerName: ProviderIdentity,
  postcondition: Schema.Literal("preview-worker-and-stage-resources-absent"),
  provider: Schema.Struct({
    exactSettingsStatus: Schema.Literal(404),
    hostedUrlStatus: Schema.Literal(404),
    matchingWorkerCount: Schema.Literal(0),
  }),
  rollback: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  stack: Schema.Literal("TaxKitDocsCloudflare"),
  stage: DocsDeploymentStage,
  state: Schema.Struct({
    id: Schema.Literal("cloudflare-http"),
    outputReadback: Schema.Literal("empty-object-after-stage-delete"),
    previewResourceCount: Schema.Literal(0),
    stagePresent: Schema.Literal(false),
    version: Schema.Literal(7),
  }),
  url: WorkersDevUrl,
});
export type DeploymentPreviewTeardownReceipt =
  typeof DeploymentPreviewTeardownReceipt.Type;

/**
 * PR-close teardown runs reviewed default-branch code.  Its destroy projection
 * therefore identifies the reviewed implementation commit, while the
 * provider/state absence readback identifies the previously deployed
 * candidate.  Keep those identities explicit instead of pretending they are
 * one source revision.
 */
export const DeploymentPreviewWorkflowTeardownReceipt = Schema.Struct({
  accountId: CloudflareAccountId,
  candidateCommit: CommitSha,
  destroyPlanSha256: Sha256,
  destroyedResources: Schema.Tuple([
    Schema.Struct({
      logicalId: Schema.Literal("DocsBuild"),
      resourceType: Schema.Literal("Command.Build"),
    }),
    Schema.Struct({
      logicalId: Schema.Literal("DocsWebsite"),
      resourceType: Schema.Literal("Cloudflare.Worker"),
    }),
  ]),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operation: Schema.Literal("preview-destroy-and-absence-readback-workflow"),
  physicalWorkerName: ProviderIdentity,
  postcondition: Schema.Literal("preview-worker-and-stage-resources-absent"),
  provider: Schema.Struct({
    exactSettingsStatus: Schema.Literal(404),
    hostedUrlStatus: Schema.Literal(404),
    matchingWorkerCount: Schema.Literal(0),
  }),
  reviewedWorkflowCommit: CommitSha,
  rollback: Schema.NonEmptyString,
  runId: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  stack: Schema.Literal("TaxKitDocsCloudflare"),
  stage: DocsDeploymentStage,
  state: Schema.Struct({
    id: Schema.Literal("cloudflare-http"),
    outputReadback: Schema.Literal("empty-object-after-stage-delete"),
    previewResourceCount: Schema.Literal(0),
    stagePresent: Schema.Literal(false),
    version: Schema.Literal(7),
  }),
  url: WorkersDevUrl,
  workflowPath: Schema.NonEmptyString,
});
export type DeploymentPreviewWorkflowTeardownReceipt =
  typeof DeploymentPreviewWorkflowTeardownReceipt.Type;

export const DeploymentAuthorityPreflightReceipt = Schema.Struct({
  approval: Schema.Struct({
    approvedAtLocal: Schema.Literal("2026-07-30 Australia/Melbourne"),
    approvedEnvironments: Schema.Tuple([
      Schema.Literal("trusted-isolated-preview-workers.dev"),
      Schema.Literal("fixed-production-workers.dev"),
    ]),
    approvedOperations: Schema.NonEmptyArray(AuthorityOperation),
    approvedResources: Schema.NonEmptyArray(Schema.NonEmptyString),
    approvingPrincipal: Schema.Literal(
      "Cooper, TaxKit repository/product owner"
    ),
    durationOrRevocation: Schema.NonEmptyString,
    exclusions: Schema.NonEmptyArray(Schema.NonEmptyString),
    executingPrincipal: Schema.Literal(
      "authorized TaxKit docs deployment implementation thread"
    ),
  }),
  candidate: Schema.Struct({
    baseCommit: CommitSha,
    exactCommit: CommitSha,
    githubReadback: Schema.Literal("commit-not-found"),
    pullRequestNumber: Schema.Null,
    status: Schema.Literal("not-trusted-pr-head"),
  }),
  evidenceDigest: Sha256,
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operationsExecuted: Schema.NonEmptyArray(
    Schema.Literals([
      "git-identity-readback",
      "github-auth-readback",
      "github-candidate-readback",
      "alchemy-profile-readback",
      "wrangler-identity-readback",
    ])
  ),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literal("stopped-before-state-or-provider-mutation"),
  provider: ProviderObservation,
  receiptId: Schema.Literal("DCD-002-preview-preflight-2026-07-30"),
  rollback: Schema.Literal("none-required-no-mutation"),
  schemaVersion: Schema.Literal(1),
  state: Schema.Struct({
    alchemyStateReadback: Schema.Literal("not-attempted"),
    mutationCount: Schema.Literal(0),
    providerPlan: Schema.Literal("not-attempted"),
  }),
  stop: Schema.Struct({
    operation: Schema.Literal("preview-plan"),
    reason: Schema.Literal(
      "exact-candidate-is-not-a-trusted-github-pull-request-head"
    ),
    recovery: Schema.NonEmptyString,
  }),
});
export type DeploymentAuthorityPreflightReceipt =
  typeof DeploymentAuthorityPreflightReceipt.Type;

/**
 * Records a later authority/capability epoch without rewriting the original
 * DCD-002 preflight.  This receipt deliberately carries identities and
 * digests only; credential values never enter the repository.
 */
export const DeploymentAuthorityCapabilityReceipt = Schema.Struct({
  approval: Schema.Struct({
    approvedAtLocal: Schema.Literal("2026-08-02 Australia/Melbourne"),
    approvedEnvironments: Schema.NonEmptyArray(Schema.NonEmptyString),
    approvedOperations: Schema.NonEmptyArray(Schema.NonEmptyString),
    approvedResources: Schema.NonEmptyArray(Schema.NonEmptyString),
    approvingPrincipal: Schema.Literal(
      "Cooper, TaxKit repository/product owner"
    ),
    durationOrRevocation: Schema.NonEmptyString,
    exclusions: Schema.NonEmptyArray(Schema.NonEmptyString),
    executingPrincipal: Schema.Literal(
      "authorized TaxKit docs deployment implementation thread"
    ),
  }),
  candidate: Schema.Struct({
    branch: Schema.Literal("codex/docs-cloudflare-alchemy-deployment"),
    exactCommit: CommitSha,
    pullRequestNumber: Schema.Literal(1),
    pullRequestState: Schema.Literal("OPEN_DRAFT"),
  }),
  ciCredentialStatus: Schema.Literal("unavailable"),
  github: Schema.Struct({
    authenticatedPrincipal: Schema.Literal("crcorbett"),
    environments: Schema.Array(
      Schema.Struct({
        id: Schema.NonEmptyString,
        status: Schema.Literal("absent"),
      })
    ),
    repository: Schema.Literal("crcorbett/taxkit"),
    repositoryActionsSecrets: Schema.Array(Schema.NonEmptyString),
    repositoryVariables: Schema.Array(Schema.NonEmptyString),
  }),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  localProvider: Schema.Struct({
    accountId: CloudflareAccountId,
    alchemyProfile: Schema.Literal("default"),
    credentialType: Schema.Literal("oauth"),
    expiresAt: Schema.String.check(
      Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u)
    ),
    scopeCount: Schema.Int.check(Schema.isGreaterThan(0)),
    scopeSetSha256: Sha256,
    wranglerStatus: Schema.Literal("unauthenticated"),
  }),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literal("github-environments-and-secrets-not-mutated"),
  receiptId: Schema.String.check(
    Schema.isPattern(/^DCD-004-authority-capability-[0-9a-f-]+$/u)
  ),
  rollback: Schema.Literal("none-required-no-mutation"),
  schemaVersion: Schema.Literal(1),
  stop: Schema.Struct({
    operation: Schema.Literal("github-environment-secret-setup"),
    reason: Schema.Literal("narrow-ci-credential-values-unavailable"),
    recovery: Schema.NonEmptyString,
  }),
});
export type DeploymentAuthorityCapabilityReceipt =
  typeof DeploymentAuthorityCapabilityReceipt.Type;

const CredentialPermissionGroup = Schema.Struct({
  id: Schema.String.check(Schema.isPattern(/^[a-f0-9]{32}$/u)),
  name: Schema.NonEmptyString,
});

const CredentialTokenReadback = Schema.Struct({
  expiresAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  name: Schema.NonEmptyString,
  permissionGroups: Schema.NonEmptyArray(CredentialPermissionGroup),
  resourceScope: Schema.NonEmptyString,
  status: Schema.Literal("active"),
  tokenIdPrefix: Schema.String.check(Schema.isPattern(/^[a-f0-9]{8}$/u)),
  tokenIdSha256: Sha256,
  tokenValuesIncluded: Schema.Literal(false),
});

const ProtectedEnvironmentReadback = Schema.Struct({
  deploymentBranchPolicy: Schema.Literal("none"),
  id: Schema.Literals([
    "taxkit-docs-preview",
    "taxkit-docs-production",
    "taxkit-docs-preview-teardown",
    "github-actions-report-only",
  ]),
  reviewerLogin: Schema.Literal("crcorbett"),
  reviewerUserId: Schema.Literal(45_161_689),
  secretNames: Schema.NonEmptyArray(Schema.NonEmptyString),
  status: Schema.Literal("protected"),
});

/**
 * Records the successful 2026-08-04 credential and protected-environment
 * capability epoch without rewriting the earlier capability stop. Secret
 * values are intentionally unrepresentable in this receipt.
 */
export const DeploymentCredentialCapabilityReceipt = Schema.Struct({
  approval: Schema.Struct({
    approvedAtLocal: Schema.Literal("2026-08-04 Australia/Melbourne"),
    approvedEnvironments: Schema.Tuple([
      Schema.Literal("taxkit-docs-preview"),
      Schema.Literal("taxkit-docs-production"),
      Schema.Literal("taxkit-docs-preview-teardown"),
      Schema.Literal("github-actions-report-only"),
    ]),
    approvedOperations: Schema.NonEmptyArray(Schema.NonEmptyString),
    approvedResources: Schema.NonEmptyArray(Schema.NonEmptyString),
    approvingPrincipal: Schema.Literal(
      "Cooper, TaxKit repository/product owner"
    ),
    durationOrRevocation: Schema.NonEmptyString,
    exclusions: Schema.NonEmptyArray(Schema.NonEmptyString),
    executingPrincipal: Schema.Literal(
      "authorized TaxKit docs deployment implementation thread"
    ),
  }),
  candidate: Schema.Struct({
    branch: Schema.Literal("codex/docs-cloudflare-alchemy-deployment"),
    exactCommit: CommitSha,
    pullRequestNumber: Schema.Literal(1),
    pullRequestState: Schema.Literal("OPEN_DRAFT"),
  }),
  ciCredentialStatus: Schema.Literal("established"),
  cloudflare: Schema.Struct({
    accountId: CloudflareAccountId,
    mutation: CredentialTokenReadback,
    readOnly: CredentialTokenReadback,
    stateResources: Schema.Tuple([
      Schema.Literal("alchemy-state-store Worker"),
      Schema.Literal("StateStoreSecrets Secrets Store"),
    ]),
  }),
  github: Schema.Struct({
    authenticatedPrincipal: Schema.Literal("crcorbett"),
    connectorEnvironmentSecretAdmin: Schema.Literal("not-supported"),
    environments: Schema.Tuple([
      ProtectedEnvironmentReadback,
      ProtectedEnvironmentReadback,
      ProtectedEnvironmentReadback,
      ProtectedEnvironmentReadback,
    ]),
    repository: Schema.Literal("crcorbett/taxkit"),
    secretValuesIncluded: Schema.Literal(false),
  }),
  limitations: Schema.NonEmptyArray(Schema.NonEmptyString),
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operationsExecuted: Schema.NonEmptyArray(Schema.NonEmptyString),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literal(
    "protected-environments-and-narrow-credentials-attached"
  ),
  receiptId: Schema.Literal("DCD-004-ci-capability-2026-08-04"),
  rollback: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
});
export type DeploymentCredentialCapabilityReceipt =
  typeof DeploymentCredentialCapabilityReceipt.Type;

export const DeploymentGitAuthorityReceipt = Schema.Struct({
  approval: Schema.Struct({
    approvedAtLocal: Schema.Literal("2026-07-30 Australia/Melbourne"),
    approvedOperations: Schema.Tuple([
      Schema.Literal("create-branch"),
      Schema.Literal("push-exact-candidate"),
      Schema.Literal("create-draft-pull-request"),
      Schema.Literal("git-readback"),
      Schema.Literal("push-coherent-accepted-slices"),
    ]),
    approvingPrincipal: Schema.Literal(
      "Cooper, TaxKit repository/product owner"
    ),
    baseBranch: Schema.Literal("main"),
    branch: Schema.Literal("codex/docs-cloudflare-alchemy-deployment"),
    candidateCommit: CommitSha,
    durationOrRevocation: Schema.NonEmptyString,
    exclusions: Schema.Tuple([
      Schema.Literal("merge"),
      Schema.Literal("force-push"),
      Schema.Literal("branch-deletion"),
      Schema.Literal("pull-request-ready-conversion"),
      Schema.Literal("release-tag-publication"),
      Schema.Literal("unrelated-github-mutation"),
    ]),
    executingPrincipal: Schema.Literal(
      "authorized TaxKit docs deployment implementation thread"
    ),
    remote: Schema.Literal("origin"),
    repository: Schema.Literal("crcorbett/taxkit"),
  }),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literal("authorized-before-git-mutation"),
  precondition: Schema.Struct({
    githubCandidateStatus: Schema.Literal("commit-not-found"),
    headCommit: CommitSha,
    indexClean: Schema.Literal(true),
    localBranchStatus: Schema.Literal("absent"),
    remoteBranchStatus: Schema.Literal("absent"),
    worktreeState: Schema.Literal("validated-uncommitted-dcd-002-preserved"),
  }),
  receiptId: Schema.Literal("DCD-002-git-authority-2026-07-30"),
  rollback: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
});
export type DeploymentGitAuthorityReceipt =
  typeof DeploymentGitAuthorityReceipt.Type;

export const DeploymentGitReadbackReceipt = Schema.Struct({
  candidateStatus: Schema.Literal("trusted-pr-head"),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  operationsExecuted: Schema.Tuple([
    Schema.Literal("remote-branch-readback"),
    Schema.Literal("github-commit-readback"),
    Schema.Literal("draft-pull-request-readback"),
  ]),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literal("exact-candidate-is-trusted-draft-pr-head"),
  pullRequest: Schema.Struct({
    authorLogin: Schema.Literal("crcorbett"),
    baseName: Schema.Literal("main"),
    baseSha: CommitSha,
    headName: Schema.Literal("codex/docs-cloudflare-alchemy-deployment"),
    headSha: CommitSha,
    isDraft: Schema.Literal(true),
    number: Schema.Literal(1),
    state: Schema.Literal("OPEN"),
    url: Schema.Literal("https://github.com/crcorbett/taxkit/pull/1"),
  }),
  receiptId: Schema.NonEmptyString,
  remote: Schema.Struct({
    branch: Schema.Literal("codex/docs-cloudflare-alchemy-deployment"),
    candidateCommit: CommitSha,
    name: Schema.Literal("origin"),
    repository: Schema.Literal("crcorbett/taxkit"),
  }),
  rollback: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  stage: DocsDeploymentStage,
});
export type DeploymentGitReadbackReceipt =
  typeof DeploymentGitReadbackReceipt.Type;

export const DeploymentResumePreflightReceipt = Schema.Struct({
  candidate: Schema.Struct({
    exactCommit: CommitSha,
    precedingDeployedCommit: CommitSha,
    pullRequestNumber: Schema.Literal(1),
    status: Schema.Literal("trusted-pr-head"),
  }),
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  owner: Schema.Literal("taxkit-docs-deployment-operation-owner"),
  postcondition: Schema.Literal(
    "existing-preview-is-exactly-scoped-and-safe-to-update"
  ),
  provider: Schema.Struct({
    accountId: CloudflareAccountId,
    deploymentId: ProviderIdentity,
    physicalWorkerName: ProviderIdentity,
    previewsEnabled: Schema.Literal(true),
    taxkitWorkerCount: Schema.Literal(1),
    url: WorkersDevUrl,
    versionId: ProviderIdentity,
  }),
  receiptId: Schema.Literal(
    "DCD-002-preview-resume-preflight-e4e3dd9-2026-07-30"
  ),
  rollback: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  stage: DocsDeploymentStage,
  state: Schema.Struct({
    id: Schema.Literal("cloudflare-http"),
    resources: Schema.Tuple([
      Schema.Struct({
        logicalId: Schema.Literal("DocsBuild"),
        status: Schema.Literal("updated"),
      }),
      Schema.Struct({
        logicalId: Schema.Literal("DocsWebsite"),
        status: Schema.Literal("created"),
      }),
    ]),
    version: Schema.Literal(7),
    workerIdentityAgreement: Schema.Literal(true),
  }),
});
export type DeploymentResumePreflightReceipt =
  typeof DeploymentResumePreflightReceipt.Type;

export class DocsDeploymentInputError extends Schema.TaggedErrorClass<DocsDeploymentInputError>()(
  "DocsDeploymentInputError",
  { target: Schema.NonEmptyString }
) {}

export class DocsDeploymentPolicyError extends Schema.TaggedErrorClass<DocsDeploymentPolicyError>()(
  "DocsDeploymentPolicyError",
  { findings: Schema.NonEmptyArray(Schema.NonEmptyString) }
) {}
