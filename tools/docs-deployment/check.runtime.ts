import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Array, Console, Effect, Match } from "effect";
import * as Path from "effect/Path";

import { readDeploymentJson, readDeploymentSha256 } from "./input.boundary.js";
// This checker reads retained historical receipts. Current workflow plan
// admission uses DeploymentPlanReceipt in the workflow receipt boundary.
import {
  inspectDeploymentOwners,
  inspectAuthorityCapabilityReceipt,
  inspectCredentialCapabilityReceipt,
  inspectGitAuthorityReceipt,
  inspectGitReadbackReceipt,
  inspectHistoricalDeploymentPlanReceipt as inspectDeploymentPlanReceipt,
  inspectHistoricalDeploymentPlanActions as inspectDeploymentPlanActions,
  inspectInitialProductionPreflight,
  inspectPreviewEvidenceChain,
  inspectPreviewHostedEvidenceChain,
  inspectPreviewMutationPreflight,
  inspectPreviewTeardownReceipt,
  inspectPreviewWorkflowTeardownReceipt,
  inspectProductionEvidenceChain,
  inspectProductionMutationPreflight,
  inspectProductionRollbackReceipt,
  inspectProviderPreflightReceipt,
  inspectResumePreflightReceipt,
  inspectScreenshotImageDigest,
} from "./policy.js";
import { readRetiredDocsSourceBundle } from "./retired-source.boundary.js";
import {
  DeploymentAuthorityPreflightReceipt,
  DeploymentAuthorityCapabilityReceipt,
  DeploymentCredentialCapabilityReceipt,
  DeploymentApplyFailureReceipt,
  DeploymentGitAuthorityReceipt,
  DeploymentGitReadbackReceipt,
  DeploymentJourneyInventory,
  HistoricalDeploymentPlanReceipt as DeploymentPlanReceipt,
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
  DeploymentHostedProofReceipt,
  DeploymentScreenshotManifest,
  DocsDeploymentInputError,
  DocsDeploymentPolicyError,
} from "./schemas.js";

const repositoryRootUrl = new URL("../..", import.meta.url);

export const checkDocsDeployment = (repositoryRoot: string) =>
  Effect.gen(function* checkDocsDeploymentProgram() {
    yield* readRetiredDocsSourceBundle(repositoryRoot);
    const [
      inventory,
      receipt,
      capabilityReceipt,
      credentialCapabilityReceipt,
      gitAuthority,
      gitReadback,
      providerPreflight,
      plan,
      _failedApply,
      latestGitReadback,
      resumePreflight,
      successorPlan,
      _historicalGitReadback,
      _historicalPlan,
      _historicalProviderReadback,
      _historicalHostedProof,
      _historicalDesktopScreenshot,
      _historicalMobileScreenshot,
      _historicalDestroyPlan,
      _historicalTeardown,
      acceptedGitReadback,
      acceptedPlan,
      credentialReadback,
      deployPreflight,
      providerReadback,
      hostedProof,
      desktopScreenshot,
      mobileScreenshot,
      destroyPlan,
      destroyPreflight,
      teardown,
    ] = yield* Effect.all([
      readDeploymentJson(
        repositoryRoot,
        "docs/verification/docs-deployment-journeys.json",
        DeploymentJourneyInventory
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-preflight/authority-preflight.json",
        DeploymentAuthorityPreflightReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-02-authority-capability/receipt.json",
        DeploymentAuthorityCapabilityReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-04-ci-capability/receipt.json",
        DeploymentCredentialCapabilityReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-preflight/git-authority.json",
        DeploymentGitAuthorityReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-preflight/git-readback.json",
        DeploymentGitReadbackReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/preflight.json",
        DeploymentProviderPreflightReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/plan.json",
        DeploymentPlanReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/failed-apply.json",
        DeploymentApplyFailureReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/git-readback-e4e3dd9.json",
        DeploymentGitReadbackReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/resume-preflight-e4e3dd9.json",
        DeploymentResumePreflightReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/successor-plan-e4e3dd9.json",
        DeploymentPlanReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/git-readback-0d714e6.json",
        DeploymentGitReadbackReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/successor-plan-0d714e6.json",
        DeploymentPlanReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/provider-readback-0d714e6.json",
        DeploymentProviderReadback
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/hosted-proof-0d714e6.json",
        DeploymentHostedProofReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/screenshot-desktop-0d714e6.json",
        DeploymentScreenshotManifest
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/screenshot-mobile-0d714e6.json",
        DeploymentScreenshotManifest
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/destroy-plan-0d714e6.json",
        DeploymentPlanReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/teardown-0d714e6.json",
        DeploymentPreviewTeardownReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/git-readback-d9cb894.json",
        DeploymentGitReadbackReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/successor-plan-d9cb894.json",
        DeploymentPlanReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/credential-readback-d9cb894.json",
        DeploymentPreviewCredentialReadbackReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/predeploy-d9cb894.json",
        DeploymentPreviewMutationPreflightReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/provider-readback-d9cb894.json",
        DeploymentProviderReadback
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/hosted-proof-d9cb894.json",
        DeploymentHostedProofReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/screenshot-desktop-d9cb894.json",
        DeploymentScreenshotManifest
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/screenshot-mobile-d9cb894.json",
        DeploymentScreenshotManifest
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/destroy-plan-d9cb894.json",
        DeploymentPlanReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/predestroy-d9cb894.json",
        DeploymentPreviewMutationPreflightReceipt
      ),
      readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/teardown-d9cb894.json",
        DeploymentPreviewTeardownReceipt
      ),
    ]);
    const productionEvidenceRoot =
      "docs/evidence/deployments/2026-07-30-production-prod";
    const productionRollbackPaths = {
      initialProviderReadbackPath: `${productionEvidenceRoot}/provider-readback-d9cb894.json`,
      restoredHostedProofPath: `${productionEvidenceRoot}/rollback-hosted-d9cb894.json`,
      restoredPlanPath: `${productionEvidenceRoot}/rollback-plan-d9cb894.json`,
      restoredPreflightPath: `${productionEvidenceRoot}/rollback-predeploy-d9cb894.json`,
      restoredProviderReadbackPath: `${productionEvidenceRoot}/rollback-provider-d9cb894.json`,
      restoredScreenshotManifestPaths: [
        `${productionEvidenceRoot}/rollback-screenshot-desktop-d9cb894.json`,
        `${productionEvidenceRoot}/rollback-screenshot-mobile-d9cb894.json`,
      ],
      successorHostedProofPath: `${productionEvidenceRoot}/rollback-successor-production-hosted-c99984c.json`,
      successorPreviewHostedProofPath: `${productionEvidenceRoot}/rollback-successor-preview-hosted-c99984c.json`,
      successorPreviewProviderReadbackPath: `${productionEvidenceRoot}/rollback-successor-preview-provider-c99984c.json`,
      successorPreviewTeardownPath: `${productionEvidenceRoot}/rollback-successor-preview-teardown-c99984c.json`,
      successorProviderReadbackPath: `${productionEvidenceRoot}/rollback-successor-production-provider-c99984c.json`,
      successorScreenshotManifestPaths: [
        `${productionEvidenceRoot}/rollback-successor-production-screenshot-desktop-c99984c.json`,
        `${productionEvidenceRoot}/rollback-successor-production-screenshot-mobile-c99984c.json`,
      ],
    } as const;
    const successorMobileManifestPath = yield* Effect.fromOption(
      Array.get(productionRollbackPaths.successorScreenshotManifestPaths, 1)
    ).pipe(
      Effect.mapError(
        () =>
          new DocsDeploymentInputError({
            target: "successor-mobile-manifest-path",
          })
      )
    );
    const successorDesktopManifestPath = yield* Effect.fromOption(
      Array.get(productionRollbackPaths.successorScreenshotManifestPaths, 0)
    ).pipe(
      Effect.mapError(
        () =>
          new DocsDeploymentInputError({
            target: "successor-desktop-manifest-path",
          })
      )
    );
    const restoredMobileManifestPath = yield* Effect.fromOption(
      Array.get(productionRollbackPaths.restoredScreenshotManifestPaths, 1)
    ).pipe(
      Effect.mapError(
        () =>
          new DocsDeploymentInputError({
            target: "restored-mobile-manifest-path",
          })
      )
    );
    const restoredDesktopManifestPath = yield* Effect.fromOption(
      Array.get(productionRollbackPaths.restoredScreenshotManifestPaths, 0)
    ).pipe(
      Effect.mapError(
        () =>
          new DocsDeploymentInputError({
            target: "restored-desktop-manifest-path",
          })
      )
    );
    const production = yield* Effect.all({
      initialDesktop: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/screenshot-desktop-d9cb894.json`,
        DeploymentScreenshotManifest
      ),
      initialHosted: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/hosted-proof-d9cb894.json`,
        DeploymentHostedProofReceipt
      ),
      initialMobile: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/screenshot-mobile-d9cb894.json`,
        DeploymentScreenshotManifest
      ),
      initialPlan: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/plan-d9cb894.json`,
        DeploymentPlanReceipt
      ),
      initialPreflight: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/predeploy-d9cb894.json`,
        DeploymentProductionPreflightReceipt
      ),
      initialProvider: readDeploymentJson(
        repositoryRoot,
        productionRollbackPaths.initialProviderReadbackPath,
        DeploymentProviderReadback
      ),
      restoredDesktop: readDeploymentJson(
        repositoryRoot,
        restoredDesktopManifestPath,
        DeploymentScreenshotManifest
      ),
      restoredHosted: readDeploymentJson(
        repositoryRoot,
        productionRollbackPaths.restoredHostedProofPath,
        DeploymentHostedProofReceipt
      ),
      restoredMobile: readDeploymentJson(
        repositoryRoot,
        restoredMobileManifestPath,
        DeploymentScreenshotManifest
      ),
      restoredPlan: readDeploymentJson(
        repositoryRoot,
        productionRollbackPaths.restoredPlanPath,
        DeploymentPlanReceipt
      ),
      restoredPreflight: readDeploymentJson(
        repositoryRoot,
        productionRollbackPaths.restoredPreflightPath,
        DeploymentProductionMutationPreflightReceipt
      ),
      restoredProvider: readDeploymentJson(
        repositoryRoot,
        productionRollbackPaths.restoredProviderReadbackPath,
        DeploymentProviderReadback
      ),
      rollbackReceipt: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-receipt-d9cb894.json`,
        DeploymentProductionRollbackReceipt
      ),
      successorDesktop: readDeploymentJson(
        repositoryRoot,
        successorDesktopManifestPath,
        DeploymentScreenshotManifest
      ),
      successorHosted: readDeploymentJson(
        repositoryRoot,
        productionRollbackPaths.successorHostedProofPath,
        DeploymentHostedProofReceipt
      ),
      successorMobile: readDeploymentJson(
        repositoryRoot,
        successorMobileManifestPath,
        DeploymentScreenshotManifest
      ),
      successorPlan: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-successor-production-plan-c99984c.json`,
        DeploymentPlanReceipt
      ),
      successorPreflight: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-successor-production-predeploy-c99984c.json`,
        DeploymentProductionMutationPreflightReceipt
      ),
      successorPreviewCredential: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-successor-preview-credential-readback-c99984c.json`,
        DeploymentPreviewCredentialReadbackReceipt
      ),
      successorPreviewDesktop: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-successor-preview-screenshot-desktop-c99984c.json`,
        DeploymentScreenshotManifest
      ),
      successorPreviewDestroyPlan: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-successor-preview-destroy-plan-c99984c.json`,
        DeploymentPlanReceipt
      ),
      successorPreviewGit: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-successor-preview-git-readback-c99984c.json`,
        DeploymentGitReadbackReceipt
      ),
      successorPreviewHosted: readDeploymentJson(
        repositoryRoot,
        productionRollbackPaths.successorPreviewHostedProofPath,
        DeploymentHostedProofReceipt
      ),
      successorPreviewMobile: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-successor-preview-screenshot-mobile-c99984c.json`,
        DeploymentScreenshotManifest
      ),
      successorPreviewPlan: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-successor-preview-plan-c99984c.json`,
        DeploymentPlanReceipt
      ),
      successorPreviewPredestroy: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-successor-preview-predestroy-c99984c.json`,
        DeploymentPreviewMutationPreflightReceipt
      ),
      successorPreviewPreflight: readDeploymentJson(
        repositoryRoot,
        `${productionEvidenceRoot}/rollback-successor-preview-predeploy-c99984c.json`,
        DeploymentPreviewMutationPreflightReceipt
      ),
      successorPreviewProvider: readDeploymentJson(
        repositoryRoot,
        productionRollbackPaths.successorPreviewProviderReadbackPath,
        DeploymentProviderReadback
      ),
      successorPreviewTeardown: readDeploymentJson(
        repositoryRoot,
        productionRollbackPaths.successorPreviewTeardownPath,
        DeploymentPreviewTeardownReceipt
      ),
      successorProvider: readDeploymentJson(
        repositoryRoot,
        productionRollbackPaths.successorProviderReadbackPath,
        DeploymentProviderReadback
      ),
    });
    const current = yield* Effect.all({
      credential: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/credential-readback-aabe7b6.json",
        DeploymentPreviewCredentialReadbackReceipt
      ),
      git: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/git-readback-aabe7b6.json",
        DeploymentGitReadbackReceipt
      ),
      previewDesktop: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-02-preview-pr-1/screenshot-desktop-aabe7b6.json",
        DeploymentScreenshotManifest
      ),
      previewDestroyPlan: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-02-preview-pr-1/destroy-plan-aabe7b6.json",
        DeploymentPlanReceipt
      ),
      previewDestroyPreflight: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-02-preview-pr-1/predestroy-aabe7b6.json",
        DeploymentPreviewMutationPreflightReceipt
      ),
      previewHosted: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-02-preview-pr-1/hosted-proof-aabe7b6.json",
        DeploymentHostedProofReceipt
      ),
      previewMobile: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-02-preview-pr-1/screenshot-mobile-aabe7b6.json",
        DeploymentScreenshotManifest
      ),
      previewPlan: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-02-preview-pr-1/plan-aabe7b6.json",
        DeploymentPlanReceipt
      ),
      previewPreflight: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/predeploy-aabe7b6.json",
        DeploymentPreviewMutationPreflightReceipt
      ),
      previewProvider: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-02-preview-pr-1/provider-aabe7b6.json",
        DeploymentProviderReadback
      ),
      previewTeardown: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-02-preview-pr-1/teardown-aabe7b6.json",
        DeploymentPreviewTeardownReceipt
      ),
      productionDesktop: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/screenshot-desktop-aabe7b6.json",
        DeploymentScreenshotManifest
      ),
      productionHosted: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/hosted-proof-aabe7b6.json",
        DeploymentHostedProofReceipt
      ),
      productionMobile: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/screenshot-mobile-aabe7b6.json",
        DeploymentScreenshotManifest
      ),
      productionPlan: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/plan-aabe7b6.json",
        DeploymentPlanReceipt
      ),
      productionPreflight: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/predeploy-aabe7b6.json",
        DeploymentProductionMutationPreflightReceipt
      ),
      productionProvider: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/provider-aabe7b6.json",
        DeploymentProviderReadback
      ),
      rollbackCredential: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-preview-pr-1/credential-readback-rollback-d9cb894.json",
        DeploymentPreviewCredentialReadbackReceipt
      ),
      rollbackDesktop: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/rollback-aabe7b6-to-d9cb894/screenshot-desktop.json",
        DeploymentScreenshotManifest
      ),
      rollbackHosted: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/rollback-aabe7b6-to-d9cb894/hosted-proof.json",
        DeploymentHostedProofReceipt
      ),
      rollbackMobile: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/rollback-aabe7b6-to-d9cb894/screenshot-mobile.json",
        DeploymentScreenshotManifest
      ),
      rollbackPlan: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/rollback-plan-aabe7b6-to-d9cb894.json",
        DeploymentPlanReceipt
      ),
      rollbackPreflight: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/rollback-predeploy-aabe7b6-to-d9cb894.json",
        DeploymentProductionMutationPreflightReceipt
      ),
      rollbackProvider: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-07-30-production-prod/rollback-provider-aabe7b6-to-d9cb894.json",
        DeploymentProviderReadback
      ),
    });
    const currentEpoch = yield* Effect.all({
      previewDesktop: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-preview-pr-15/screenshot-desktop-b59e4ee.json",
        DeploymentScreenshotManifest
      ),
      previewDestroyPlan: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-preview-pr-15/destroy-plan-b59e4ee.json",
        DeploymentPlanReceipt
      ),
      previewHosted: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-preview-pr-15/hosted-proof-b59e4ee.json",
        DeploymentHostedProofReceipt
      ),
      previewMobile: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-preview-pr-15/screenshot-mobile-b59e4ee.json",
        DeploymentScreenshotManifest
      ),
      previewPlan: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-preview-pr-15/equal-replan-b59e4ee.json",
        DeploymentPlanReceipt
      ),
      previewProvider: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-preview-pr-15/provider-readback-b59e4ee.json",
        DeploymentProviderReadback
      ),
      previewTeardown: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-preview-pr-15/teardown-workflow-b59e4ee.json",
        DeploymentPreviewWorkflowTeardownReceipt
      ),
      productionDesktop: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-production-prod/screenshot-desktop-b59e4ee.json",
        DeploymentScreenshotManifest
      ),
      productionHosted: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-production-prod/hosted-proof-b59e4ee.json",
        DeploymentHostedProofReceipt
      ),
      productionMobile: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-production-prod/screenshot-mobile-b59e4ee.json",
        DeploymentScreenshotManifest
      ),
      productionPlan: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-production-prod/production-equal-replan-b59e4ee.json",
        DeploymentPlanReceipt
      ),
      productionProvider: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-production-prod/provider-readback-b59e4ee.json",
        DeploymentProviderReadback
      ),
      rollbackDesktop: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-production-prod/rollback/screenshot-desktop-eafeaad.json",
        DeploymentScreenshotManifest
      ),
      rollbackHosted: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-production-prod/rollback/hosted-proof-eafeaad.json",
        DeploymentHostedProofReceipt
      ),
      rollbackMobile: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-production-prod/rollback/screenshot-mobile-eafeaad.json",
        DeploymentScreenshotManifest
      ),
      rollbackPlan: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-production-prod/rollback/rollback-plan-eafeaad.json",
        DeploymentPlanReceipt
      ),
      rollbackProvider: readDeploymentJson(
        repositoryRoot,
        "docs/evidence/deployments/2026-08-10-production-prod/rollback/provider-readback-eafeaad.json",
        DeploymentProviderReadback
      ),
    });
    const currentEpochImageDigests = yield* Effect.all({
      previewDesktop: readDeploymentSha256(
        repositoryRoot,
        currentEpoch.previewDesktop.imagePath
      ),
      previewMobile: readDeploymentSha256(
        repositoryRoot,
        currentEpoch.previewMobile.imagePath
      ),
      productionDesktop: readDeploymentSha256(
        repositoryRoot,
        currentEpoch.productionDesktop.imagePath
      ),
      productionMobile: readDeploymentSha256(
        repositoryRoot,
        currentEpoch.productionMobile.imagePath
      ),
      rollbackDesktop: readDeploymentSha256(
        repositoryRoot,
        currentEpoch.rollbackDesktop.imagePath
      ),
      rollbackMobile: readDeploymentSha256(
        repositoryRoot,
        currentEpoch.rollbackMobile.imagePath
      ),
    });
    const [desktopImageSha256, mobileImageSha256] = yield* Effect.all([
      readDeploymentSha256(repositoryRoot, desktopScreenshot.imagePath),
      readDeploymentSha256(repositoryRoot, mobileScreenshot.imagePath),
    ]);
    const productionImageDigests = yield* Effect.all({
      initialDesktop: readDeploymentSha256(
        repositoryRoot,
        production.initialDesktop.imagePath
      ),
      initialMobile: readDeploymentSha256(
        repositoryRoot,
        production.initialMobile.imagePath
      ),
      restoredDesktop: readDeploymentSha256(
        repositoryRoot,
        production.restoredDesktop.imagePath
      ),
      restoredMobile: readDeploymentSha256(
        repositoryRoot,
        production.restoredMobile.imagePath
      ),
      successorDesktop: readDeploymentSha256(
        repositoryRoot,
        production.successorDesktop.imagePath
      ),
      successorMobile: readDeploymentSha256(
        repositoryRoot,
        production.successorMobile.imagePath
      ),
      successorPreviewDesktop: readDeploymentSha256(
        repositoryRoot,
        production.successorPreviewDesktop.imagePath
      ),
      successorPreviewMobile: readDeploymentSha256(
        repositoryRoot,
        production.successorPreviewMobile.imagePath
      ),
    });
    const currentImageDigests = yield* Effect.all({
      previewDesktop: readDeploymentSha256(
        repositoryRoot,
        current.previewDesktop.imagePath
      ),
      previewMobile: readDeploymentSha256(
        repositoryRoot,
        current.previewMobile.imagePath
      ),
      productionDesktop: readDeploymentSha256(
        repositoryRoot,
        current.productionDesktop.imagePath
      ),
      productionMobile: readDeploymentSha256(
        repositoryRoot,
        current.productionMobile.imagePath
      ),
      rollbackDesktop: readDeploymentSha256(
        repositoryRoot,
        current.rollbackDesktop.imagePath
      ),
      rollbackMobile: readDeploymentSha256(
        repositoryRoot,
        current.rollbackMobile.imagePath
      ),
    });
    return [
      ...(yield* inspectDeploymentOwners(inventory, receipt)),
      ...inspectAuthorityCapabilityReceipt(capabilityReceipt),
      ...inspectCredentialCapabilityReceipt(credentialCapabilityReceipt),
      ...inspectGitAuthorityReceipt(gitAuthority),
      ...inspectGitReadbackReceipt(gitReadback),
      ...inspectProviderPreflightReceipt(providerPreflight, gitReadback),
      ...(yield* inspectDeploymentPlanReceipt(plan)),
      ...inspectGitReadbackReceipt(latestGitReadback),
      ...inspectResumePreflightReceipt(
        resumePreflight,
        latestGitReadback,
        successorPlan
      ),
      ...(yield* inspectDeploymentPlanReceipt(successorPlan)),
      ...inspectGitReadbackReceipt(acceptedGitReadback),
      ...inspectPreviewMutationPreflight(
        deployPreflight,
        acceptedGitReadback,
        acceptedPlan,
        receipt,
        credentialReadback
      ),
      ...(yield* inspectPreviewEvidenceChain(
        acceptedGitReadback,
        acceptedPlan,
        providerReadback,
        hostedProof,
        [desktopScreenshot, mobileScreenshot]
      )),
      ...inspectScreenshotImageDigest(desktopScreenshot, desktopImageSha256),
      ...inspectScreenshotImageDigest(mobileScreenshot, mobileImageSha256),
      ...inspectPreviewMutationPreflight(
        destroyPreflight,
        acceptedGitReadback,
        destroyPlan,
        receipt,
        credentialReadback,
        providerReadback
      ),
      ...(yield* inspectPreviewTeardownReceipt(
        teardown,
        destroyPlan,
        providerReadback
      )),
      ...inspectInitialProductionPreflight(
        production.initialPreflight,
        production.initialPlan,
        providerReadback,
        hostedProof,
        teardown,
        credentialReadback,
        production.initialProvider
      ),
      ...(yield* inspectProductionEvidenceChain(
        production.initialPlan,
        production.initialProvider,
        production.initialHosted,
        [production.initialDesktop, production.initialMobile],
        "production",
        "create"
      )),
      ...inspectGitReadbackReceipt(production.successorPreviewGit),
      ...inspectPreviewMutationPreflight(
        production.successorPreviewPreflight,
        production.successorPreviewGit,
        production.successorPreviewPlan,
        receipt,
        production.successorPreviewCredential
      ),
      ...(yield* inspectPreviewEvidenceChain(
        production.successorPreviewGit,
        production.successorPreviewPlan,
        production.successorPreviewProvider,
        production.successorPreviewHosted,
        [production.successorPreviewDesktop, production.successorPreviewMobile]
      )),
      ...inspectPreviewMutationPreflight(
        production.successorPreviewPredestroy,
        production.successorPreviewGit,
        production.successorPreviewDestroyPlan,
        receipt,
        production.successorPreviewCredential,
        production.successorPreviewProvider
      ),
      ...(yield* inspectPreviewTeardownReceipt(
        production.successorPreviewTeardown,
        production.successorPreviewDestroyPlan,
        production.successorPreviewProvider
      )),
      ...inspectProductionMutationPreflight(
        production.successorPreflight,
        production.successorPlan,
        production.initialProvider,
        production.successorProvider,
        production.successorPreviewCredential
      ),
      ...(yield* inspectProductionEvidenceChain(
        production.successorPlan,
        production.successorProvider,
        production.successorHosted,
        [production.successorDesktop, production.successorMobile],
        "production",
        "update"
      )),
      ...inspectProductionMutationPreflight(
        production.restoredPreflight,
        production.restoredPlan,
        production.successorProvider,
        production.restoredProvider,
        credentialReadback
      ),
      ...(yield* inspectProductionEvidenceChain(
        production.restoredPlan,
        production.restoredProvider,
        production.restoredHosted,
        [production.restoredDesktop, production.restoredMobile],
        "rollback",
        "update"
      )),
      ...inspectProductionRollbackReceipt(
        production.rollbackReceipt,
        production.initialProvider,
        production.successorPreviewProvider,
        production.successorPreviewTeardown,
        production.successorProvider,
        production.restoredProvider,
        [production.initialDesktop, production.initialMobile],
        [production.restoredDesktop, production.restoredMobile],
        productionRollbackPaths
      ),
      ...inspectGitReadbackReceipt(current.git),
      ...(yield* inspectDeploymentPlanReceipt(current.previewPlan)),
      ...inspectDeploymentPlanActions(current.previewPlan, "create"),
      ...inspectPreviewMutationPreflight(
        current.previewPreflight,
        current.git,
        current.previewPlan,
        receipt,
        current.credential
      ),
      ...(yield* inspectPreviewEvidenceChain(
        current.git,
        current.previewPlan,
        current.previewProvider,
        current.previewHosted,
        [current.previewDesktop, current.previewMobile]
      )),
      ...inspectScreenshotImageDigest(
        current.previewDesktop,
        currentImageDigests.previewDesktop
      ),
      ...inspectScreenshotImageDigest(
        current.previewMobile,
        currentImageDigests.previewMobile
      ),
      ...inspectPreviewMutationPreflight(
        current.previewDestroyPreflight,
        current.git,
        current.previewDestroyPlan,
        receipt,
        current.credential,
        current.previewProvider
      ),
      ...(yield* inspectPreviewTeardownReceipt(
        current.previewTeardown,
        current.previewDestroyPlan,
        current.previewProvider
      )),
      ...(yield* inspectDeploymentPlanReceipt(current.productionPlan)),
      ...inspectDeploymentPlanActions(current.productionPlan, "update"),
      ...inspectProductionMutationPreflight(
        current.productionPreflight,
        current.productionPlan,
        production.restoredProvider,
        current.productionProvider,
        current.credential
      ),
      ...(yield* inspectProductionEvidenceChain(
        current.productionPlan,
        current.productionProvider,
        current.productionHosted,
        [current.productionDesktop, current.productionMobile],
        "production",
        "update"
      )),
      ...inspectScreenshotImageDigest(
        current.productionDesktop,
        currentImageDigests.productionDesktop
      ),
      ...inspectScreenshotImageDigest(
        current.productionMobile,
        currentImageDigests.productionMobile
      ),
      ...(yield* inspectDeploymentPlanReceipt(current.rollbackPlan)),
      ...inspectDeploymentPlanActions(current.rollbackPlan, "update"),
      ...inspectProductionMutationPreflight(
        current.rollbackPreflight,
        current.rollbackPlan,
        current.productionProvider,
        current.rollbackProvider,
        current.rollbackCredential
      ),
      ...(yield* inspectProductionEvidenceChain(
        current.rollbackPlan,
        current.rollbackProvider,
        current.rollbackHosted,
        [current.rollbackDesktop, current.rollbackMobile],
        "rollback",
        "update"
      )),
      ...inspectScreenshotImageDigest(
        current.rollbackDesktop,
        currentImageDigests.rollbackDesktop
      ),
      ...inspectScreenshotImageDigest(
        current.rollbackMobile,
        currentImageDigests.rollbackMobile
      ),
      ...inspectScreenshotImageDigest(
        production.initialDesktop,
        productionImageDigests.initialDesktop
      ),
      ...inspectScreenshotImageDigest(
        production.initialMobile,
        productionImageDigests.initialMobile
      ),
      ...inspectScreenshotImageDigest(
        production.successorPreviewDesktop,
        productionImageDigests.successorPreviewDesktop
      ),
      ...inspectScreenshotImageDigest(
        production.successorPreviewMobile,
        productionImageDigests.successorPreviewMobile
      ),
      ...inspectScreenshotImageDigest(
        production.successorDesktop,
        productionImageDigests.successorDesktop
      ),
      ...inspectScreenshotImageDigest(
        production.successorMobile,
        productionImageDigests.successorMobile
      ),
      ...inspectScreenshotImageDigest(
        production.restoredDesktop,
        productionImageDigests.restoredDesktop
      ),
      ...inspectScreenshotImageDigest(
        production.restoredMobile,
        productionImageDigests.restoredMobile
      ),
      ...(yield* inspectPreviewHostedEvidenceChain(
        currentEpoch.previewPlan,
        currentEpoch.previewProvider,
        currentEpoch.previewHosted,
        [currentEpoch.previewDesktop, currentEpoch.previewMobile]
      )),
      ...inspectScreenshotImageDigest(
        currentEpoch.previewDesktop,
        currentEpochImageDigests.previewDesktop
      ),
      ...inspectScreenshotImageDigest(
        currentEpoch.previewMobile,
        currentEpochImageDigests.previewMobile
      ),
      ...(yield* inspectPreviewWorkflowTeardownReceipt(
        currentEpoch.previewTeardown,
        currentEpoch.previewDestroyPlan,
        currentEpoch.previewProvider
      )),
      ...(yield* inspectProductionEvidenceChain(
        currentEpoch.productionPlan,
        currentEpoch.productionProvider,
        currentEpoch.productionHosted,
        [currentEpoch.productionDesktop, currentEpoch.productionMobile],
        "production",
        "update"
      )),
      ...inspectScreenshotImageDigest(
        currentEpoch.productionDesktop,
        currentEpochImageDigests.productionDesktop
      ),
      ...inspectScreenshotImageDigest(
        currentEpoch.productionMobile,
        currentEpochImageDigests.productionMobile
      ),
      ...(yield* inspectProductionEvidenceChain(
        currentEpoch.rollbackPlan,
        currentEpoch.rollbackProvider,
        currentEpoch.rollbackHosted,
        [currentEpoch.rollbackDesktop, currentEpoch.rollbackMobile],
        "rollback",
        "update"
      )),
      ...inspectScreenshotImageDigest(
        currentEpoch.rollbackDesktop,
        currentEpochImageDigests.rollbackDesktop
      ),
      ...inspectScreenshotImageDigest(
        currentEpoch.rollbackMobile,
        currentEpochImageDigests.rollbackMobile
      ),
    ];
  });

const program = Effect.gen(function* docsDeploymentMain() {
  const path = yield* Path.Path;
  const repositoryRoot = yield* path.fromFileUrl(repositoryRootUrl);
  const findings = yield* checkDocsDeployment(repositoryRoot);
  yield* Console.info(
    `Retained docs deployment receipt validation: journeys=4; historicalPreflightReceipts=11; currentEpochPreflightReceipts=4; gitAuthorityReceipts=1; historicalGitReadbackReceipts=5; currentEpochGitReadbackReceipts=1; historicalPlanReceipts=11; currentEpochPlanReceipts=6; historicalProviderReadbackReceipts=6; currentEpochProviderReadbackReceipts=3; historicalHostedProofReceipts=6; currentEpochHostedProofReceipts=3; historicalScreenshotManifests=12; currentEpochScreenshotManifests=6; historicalTeardownReceipts=3; currentEpochTeardownReceipts=1; workflowTeardownReceipts=1; rollbackReceipts=1; failedApplyReceipts=1; violations=${findings.length}; providerReadOperations=45; providerMutations=14.`
  );
  return yield* Array.match(findings, {
    onEmpty: () => Effect.void,
    onNonEmpty: (nonEmpty) =>
      Effect.fail(new DocsDeploymentPolicyError({ findings: nonEmpty })),
  });
}).pipe(
  Effect.tapErrorTag("DocsDeploymentRecordDigestError", (error) =>
    Console.error(
      `FAIL [record-digest] reason=${error.reason}; recovery=repair the saved record or local digest service.`
    )
  ),
  Effect.tapErrorTag("DocsDeploymentInputError", (error) =>
    Console.error(
      `FAIL [deployment-input] target=${error.target}; recovery=repair the Schema-decoded owner or retained receipt.`
    )
  ),
  Effect.tapErrorTag("DocsDeploymentPolicyError", (error) =>
    Console.error(error.findings.join("\n"))
  ),
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(program, { disableErrorReporting: true })
  ),
  Match.orElse(() => false)
);
