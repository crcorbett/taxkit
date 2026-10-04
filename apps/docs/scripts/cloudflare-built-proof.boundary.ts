import type { Effect } from "effect";
import { Context, Schema } from "effect";

import {
  CloudflareHostedProofConfig,
  HostedProofSha256,
  PropagationRequest,
} from "./cloudflare-hosted-proof.boundary.js";

export const BuiltProofOptions = Schema.Struct({
  captureScreenshots: Schema.Boolean,
});

export const BuiltProofOperation = Schema.Literals([
  "build",
  "browser",
  "cleanup",
  "configuration",
  "digest",
  "dry-run",
  "evidence",
  "filesystem",
  "git-revision",
  "local-worker",
  "process-table",
  "readiness",
]);

export class BuiltProofError extends Schema.TaggedError<BuiltProofError>()(
  "BuiltProofError",
  {
    operation: BuiltProofOperation,
    reason: Schema.Literals([
      "configuration",
      "exit",
      "invariant",
      "output-limit",
      "start-or-read",
      "timeout",
    ]),
  }
) {}

const Measurement = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0));
const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
const Version = Schema.String.check(Schema.isMinLength(1));
const ScreenshotViewport = Schema.Struct({
  deviceScaleFactor: Schema.Literal(1),
  height: Schema.Int.check(Schema.isGreaterThan(0)),
  width: Schema.Int.check(Schema.isGreaterThan(0)),
});
const Screenshots = Schema.Union([
  Schema.Tuple([]),
  Schema.Tuple([
    Schema.Struct({
      kind: Schema.Literal("desktop"),
      path: Schema.Literal("screenshots/desktop.png"),
      sha256: HostedProofSha256,
      viewport: ScreenshotViewport,
    }),
    Schema.Struct({
      kind: Schema.Literal("mobile"),
      path: Schema.Literal("screenshots/mobile.png"),
      sha256: HostedProofSha256,
      viewport: ScreenshotViewport,
    }),
  ]),
]);

export const BuiltProofCandidate = Schema.Struct({
  assetsSha256: HostedProofSha256,
  deploymentInputSha256: HostedProofSha256,
  sourceCommit: CloudflareHostedProofConfig.fields.candidateCommit,
  workerModulesSha256: HostedProofSha256,
  worktreeQualifiedBeforeCommit: Schema.Literal(true),
});

export const BuiltProofReceipt = Schema.Struct({
  browser: Schema.Struct({
    name: Schema.Literal("Chromium"),
    version: Version,
  }),
  candidate: BuiltProofCandidate,
  dependencies: Schema.Struct({
    cloudflareVitePlugin: Version,
    workerd: Version,
    wrangler: Version,
  }),
  evidenceClass: Schema.Literal("local-workerd"),
  filesystem: Schema.Struct({
    isolatedOutputOnlyExecution: Schema.Literal(true),
    nodeFileSystemModules: Schema.Tuple([Schema.String, Schema.String]),
    providerCredentialEnvironmentAllowed: Schema.Literal(false),
    requestTimePolicyImportObserved: Schema.Literal(false),
  }),
  limits: Schema.Struct({
    firstResponseRequestMs: Measurement,
    gzipUploadBytes: Measurement.check(Schema.isLessThan(3 * 1024 * 1024)),
    localProcessStartToFirstResponseMs: Measurement,
    rawServerModuleBytes: Count,
    rawUploadBytes: Measurement,
    workerSizeLimitBytes: Schema.Literal(3_145_728),
  }),
  nonClaims: Schema.Tuple([
    Schema.Literal(
      "Local workerd does not prove a Cloudflare account, provider deployment, workers.dev URL, remote state, Preview, Production or rollback."
    ),
    Schema.Literal(
      "The startup observation is local workerd evidence; provider startup validation remains required."
    ),
  ]),
  oracles: Schema.Struct({
    accessibility: Schema.Literal("passed"),
    assetCacheHeaders: Schema.Literal("passed"),
    assets: Schema.Literal("passed"),
    clientNavigationWithoutDocumentReload: Schema.Literal("passed"),
    clientNotFound: Schema.Literal("passed"),
    concurrentRequestIsolation: Schema.Literal("passed"),
    consoleAndPageErrors: Schema.Literal("passed"),
    directNotFound: Schema.Literal("passed"),
    hydration: Schema.Literal("passed"),
    malformedServerFunction: Schema.Literal("passed"),
    mobileNavigationDisclosure: Schema.Literal("passed"),
    pendingNavigation: Schema.Literal("passed"),
    recoverableError: Schema.Literal("passed"),
    reducedMotion: Schema.Literal("passed"),
    serverFunctionTransport: Schema.Literal("passed"),
    ssr: Schema.Literal("passed"),
  }),
  owner: Schema.Literal("DCD-001 local Cloudflare built-app harness"),
  runtime: Schema.Struct({
    concurrentRequestsPassed: Schema.Literal(9),
    observedConstructionCount: Schema.Literal(1),
    observedDescendantCount: Count.check(Schema.isGreaterThan(0)),
    observedIsolateId: Schema.String.check(Schema.isMinLength(1)),
    observedWorkerdDescendantCount: Count.check(Schema.isGreaterThan(0)),
    perRequestConstructionPatternAbsent: Schema.Literal(true),
  }),
  schemaVersion: Schema.Literal(1),
  screenshots: Screenshots,
});

export const BuiltScreenshotManifest = Schema.Struct({
  candidate: Schema.Struct({
    assetsSha256: BuiltProofCandidate.fields.assetsSha256,
    deploymentInputSha256: BuiltProofCandidate.fields.deploymentInputSha256,
    sourceCommit: BuiltProofCandidate.fields.sourceCommit,
    workerModulesSha256: BuiltProofCandidate.fields.workerModulesSha256,
  }),
  evidenceClass: Schema.Literal("local-workerd-visual-review-input"),
  nonClaims: Schema.Tuple([
    Schema.Literal(
      "Screenshots supplement behavioral assertions and do not prove request type, focus behavior, contrast, reduced motion, HTTP status, hydration, console cleanliness or hosted behavior."
    ),
  ]),
  schemaVersion: Schema.Literal(1),
  screenshots: Screenshots,
});

// This is an internal adapter input. The public operation accepts only its
// command options; checked local origin/environment/path values stay private.
export const BuiltBrowserInput = Schema.Struct({
  captureScreenshots: BuiltProofOptions.fields.captureScreenshots,
  environment: Schema.Record(Schema.String, Schema.String),
  origin: PropagationRequest.fields.origin,
  screenshotDirectory: Schema.String,
});
export const BuiltBrowserObservation = Schema.Struct({
  browserVersion: Version,
  screenshots: Screenshots,
  serverFunctionRequests: Count.check(Schema.isGreaterThan(0)),
});

export const BuiltProofResult = Schema.Struct({
  receipt: BuiltProofReceipt,
  serverFunctionRequests: BuiltBrowserObservation.fields.serverFunctionRequests,
});

export class LocalCloudflareBuiltProof extends Context.Service<
  LocalCloudflareBuiltProof,
  {
    readonly verifyBuiltDeployment: (
      options: typeof BuiltProofOptions.Type
    ) => Effect.Effect<typeof BuiltProofResult.Type, BuiltProofError>;
  }
>()("@taxkit/docs/LocalCloudflareBuiltProof") {}
