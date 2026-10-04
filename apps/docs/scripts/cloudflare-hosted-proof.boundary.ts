import { Config, Context, Effect, Option, Schema, SchemaGetter } from "effect";

const CommitSha = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}$/u)).pipe(
  Schema.brand("DocsHostedCandidateCommit")
);
export const HostedProofSha256 = Schema.String.check(
  Schema.isPattern(/^[a-f0-9]{64}$/u)
).pipe(Schema.brand("DocsHostedSha256"));
const CloudflareAccountId = Schema.String.check(
  Schema.isPattern(/^[a-f0-9]{32}$/u)
).pipe(Schema.brand("DocsHostedCloudflareAccountId"));
const ProviderIdentity = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(256),
  Schema.isPattern(/^[A-Za-z0-9._:/-]+$/u)
).pipe(Schema.brand("DocsHostedProviderIdentity"));
const WorkersDevUrl = Schema.String.check(
  Schema.isMaxLength(256),
  Schema.isPattern(
    /^https:\/\/(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+workers\.dev$/u
  )
).pipe(Schema.brand("DocsHostedWorkersDevUrl"));
// This proof input rejects invalid stage text independently of Alchemy's
// deployment declaration; the workflow also checks the exact stage identity.
const HostedProofStage = Schema.String.check(
  Schema.isPattern(/^(?:prod|pr-[1-9]\d*)$/u)
).pipe(Schema.brand("DocsHostedStage"));
const EvidenceDirectory = Schema.String.check(
  Schema.isMaxLength(512),
  Schema.isPattern(
    /^docs\/evidence\/deployments\/(?!.*\.\.(?:\/|$))[A-Za-z0-9._/-]+$/u
  )
).pipe(Schema.brand("DocsHostedEvidenceDirectory"));
const DecimalString = Schema.String.check(
  Schema.isPattern(/^(?:0|[1-9]\d*)$/u)
);
const decimalNumber = (minimum: number, maximum: number) =>
  DecimalString.pipe(
    Schema.decodeTo(
      Schema.Int.check(
        Schema.isGreaterThanOrEqualTo(minimum),
        Schema.isLessThanOrEqualTo(maximum)
      ),
      {
        decode: SchemaGetter.transform(Number),
        encode: SchemaGetter.transform(String),
      }
    )
  );

const LoopbackOrigin = Schema.String.check(
  Schema.isPattern(/^http:\/\/127\.0\.0\.1:[1-9]\d*$/u)
).pipe(Schema.brand("DocsHostedLoopbackOrigin"));

const HostedProofEnvironment = Schema.Struct({
  TAXKIT_DOCS_ACCOUNT_ID: CloudflareAccountId,
  TAXKIT_DOCS_CANDIDATE_COMMIT: CommitSha,
  TAXKIT_DOCS_CONFIG_SHA256: HostedProofSha256,
  TAXKIT_DOCS_DEPLOYMENT_ID: ProviderIdentity,
  TAXKIT_DOCS_DEPLOYMENT_INPUT_SHA256: HostedProofSha256,
  TAXKIT_DOCS_ENVIRONMENT: Schema.Literals([
    "preview",
    "production",
    "rollback",
  ]),
  TAXKIT_DOCS_EVIDENCE_DIRECTORY: EvidenceDirectory,
  TAXKIT_DOCS_HOSTED_PROPAGATION_ATTEMPTS: decimalNumber(1, 20),
  TAXKIT_DOCS_HOSTED_PROPAGATION_DELAY_MS: decimalNumber(1, 30_000),
  TAXKIT_DOCS_HOSTED_URL: WorkersDevUrl,
  TAXKIT_DOCS_LOCKFILE_SHA256: HostedProofSha256,
  TAXKIT_DOCS_PLAN_SHA256: HostedProofSha256,
  TAXKIT_DOCS_PREVIEW_PR_NUMBER: Schema.optional(
    decimalNumber(1, 1_000_000_000)
  ),
  TAXKIT_DOCS_PREVIOUS_VERSION_ID: Schema.optional(
    Schema.Union([Schema.Literal(""), ProviderIdentity])
  ),
  TAXKIT_DOCS_ROLLBACK_RECOVERY_IDENTITY: ProviderIdentity,
  TAXKIT_DOCS_STAGE: HostedProofStage,
  TAXKIT_DOCS_STATE_STORE_ID: ProviderIdentity,
  TAXKIT_DOCS_VERSION_ID: ProviderIdentity,
  TAXKIT_DOCS_WORKER_NAME: ProviderIdentity,
});

// Environment text and checked configuration share the same field constraints.
// Optional environment values become Option inside the operation; null remains
// only in the historical observation JSON representation.
const { fields } = HostedProofEnvironment;
export const CloudflareHostedProofConfig = Schema.Struct({
  acceptedPlanSha256: fields.TAXKIT_DOCS_PLAN_SHA256,
  accountId: fields.TAXKIT_DOCS_ACCOUNT_ID,
  candidateCommit: fields.TAXKIT_DOCS_CANDIDATE_COMMIT,
  configSha256: fields.TAXKIT_DOCS_CONFIG_SHA256,
  deploymentId: fields.TAXKIT_DOCS_DEPLOYMENT_ID,
  deploymentInputSha256: fields.TAXKIT_DOCS_DEPLOYMENT_INPUT_SHA256,
  environment: fields.TAXKIT_DOCS_ENVIRONMENT,
  evidenceDirectory: fields.TAXKIT_DOCS_EVIDENCE_DIRECTORY,
  hostedPropagationAttempts: Schema.toType(
    fields.TAXKIT_DOCS_HOSTED_PROPAGATION_ATTEMPTS
  ),
  hostedPropagationDelayMs: Schema.toType(
    fields.TAXKIT_DOCS_HOSTED_PROPAGATION_DELAY_MS
  ),
  lockfileSha256: fields.TAXKIT_DOCS_LOCKFILE_SHA256,
  // The environment boundary accepts Workers URLs only. Controlled native
  // adapter tests additionally use a loopback server, never an arbitrary URL.
  origin: Schema.Union([fields.TAXKIT_DOCS_HOSTED_URL, LoopbackOrigin]),
  previewPrNumber: Schema.Option(
    Schema.Int.check(Schema.isBetween({ maximum: 1_000_000_000, minimum: 1 }))
  ),
  previousVersionId: Schema.Option(ProviderIdentity),
  rollbackRecoveryIdentity: fields.TAXKIT_DOCS_ROLLBACK_RECOVERY_IDENTITY,
  stage: fields.TAXKIT_DOCS_STAGE,
  stateStoreId: fields.TAXKIT_DOCS_STATE_STORE_ID,
  versionId: fields.TAXKIT_DOCS_VERSION_ID,
  workerName: fields.TAXKIT_DOCS_WORKER_NAME,
});
export type CloudflareHostedProofConfig =
  typeof CloudflareHostedProofConfig.Type;

export class HostedProofConfigurationError extends Schema.TaggedError<HostedProofConfigurationError>()(
  "HostedProofConfigurationError",
  {
    requirement: Schema.Literals([
      "environment-input",
      "environment-stage-identity",
    ]),
  }
) {}
export class HostedProofExecutionError extends Schema.TaggedError<HostedProofExecutionError>()(
  "HostedProofExecutionError",
  {
    operation: Schema.Literals([
      "asset-propagation",
      "browser-close",
      "browser-launch",
      "browser-proof",
    ]),
  }
) {}
export class HostedProofAssetPropagationError extends Schema.TaggedError<HostedProofAssetPropagationError>()(
  "HostedProofAssetPropagationError",
  { reason: Schema.Literal("missing-script-asset") }
) {}
export class HostedProofEvidenceError extends Schema.TaggedError<HostedProofEvidenceError>()(
  "HostedProofEvidenceError",
  { operation: Schema.Literal("encode-observation") }
) {}

const Viewport = Schema.Struct({
  deviceScaleFactor: Schema.Finite,
  height: Schema.Int,
  width: Schema.Int,
});
const Screenshot = Schema.Struct({
  kind: Schema.Literals(["desktop", "mobile"]),
  path: Schema.String,
  sha256: HostedProofSha256,
  viewport: Viewport,
});
// This producer owns the full observation. The workflow's separately owned
// admission projection checks the required deployment identity fields.
export const HostedProofProbe = Schema.Struct({
  accessibility: Schema.Struct({
    contrastRatio: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(4.5)),
    labelledArticle: Schema.Literal(true),
    labelledMain: Schema.Literal(true),
    labelledNavigation: Schema.Literal(true),
    skipLinkFocus: Schema.Literal(true),
  }),
  asset: Schema.Struct({
    cacheControl: Schema.String,
    contentType: Schema.String,
    etagPresent: Schema.Literal(true),
    path: Schema.String,
    status: Schema.Literal(200),
  }),
  assetPropagationRetries: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  browser: Schema.Struct({
    name: Schema.Literal("chromium"),
    version: Schema.String.check(Schema.isMinLength(1)),
  }),
  diagnostics: Schema.Array(Schema.String).check(Schema.isMaxLength(0)),
  direct404: Schema.Literal(404),
  initialSsr: Schema.Literal(200),
  malformedServerFunctionStatus: Schema.Int.check(
    Schema.isBetween({ maximum: 499, minimum: 400 })
  ),
  navigation: Schema.Struct({
    client404WithoutDocumentReload: Schema.Literal(true),
    documentRequestsAdded: Schema.Literal(0),
    serverFunctionResponses: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  }),
  runtime: Schema.Struct({
    constructionCounts: Schema.Tuple([Schema.Literal(1), Schema.Literal(1)]),
    firstIsolate: Schema.String.check(Schema.isMinLength(1)),
    sameObservedIsolate: Schema.Literal(true),
    secondIsolate: Schema.String.check(Schema.isMinLength(1)),
  }),
  screenshots: Schema.Tuple([Screenshot, Screenshot]),
});
export type HostedProofProbe = typeof HostedProofProbe.Type;
const HostedProofObservation = Schema.Struct({
  ...HostedProofProbe.fields,
  acceptedPlanSha256: fields.TAXKIT_DOCS_PLAN_SHA256,
  accountId: fields.TAXKIT_DOCS_ACCOUNT_ID,
  candidateCommit: fields.TAXKIT_DOCS_CANDIDATE_COMMIT,
  configSha256: fields.TAXKIT_DOCS_CONFIG_SHA256,
  deploymentId: fields.TAXKIT_DOCS_DEPLOYMENT_ID,
  deploymentInputSha256: fields.TAXKIT_DOCS_DEPLOYMENT_INPUT_SHA256,
  environment: fields.TAXKIT_DOCS_ENVIRONMENT,
  lockfileSha256: fields.TAXKIT_DOCS_LOCKFILE_SHA256,
  previewPrNumber: Schema.NullOr(
    Schema.Int.check(Schema.isBetween({ maximum: 1_000_000_000, minimum: 1 }))
  ),
  previousVersionId: Schema.NullOr(ProviderIdentity),
  rollbackRecoveryIdentity: fields.TAXKIT_DOCS_ROLLBACK_RECOVERY_IDENTITY,
  stage: fields.TAXKIT_DOCS_STAGE,
  stateStoreId: fields.TAXKIT_DOCS_STATE_STORE_ID,
  url: fields.TAXKIT_DOCS_HOSTED_URL,
  versionId: fields.TAXKIT_DOCS_VERSION_ID,
  workerName: fields.TAXKIT_DOCS_WORKER_NAME,
});

export const PropagationRequest = Schema.Struct({
  attempts: CloudflareHostedProofConfig.fields.hostedPropagationAttempts,
  delayMs: CloudflareHostedProofConfig.fields.hostedPropagationDelayMs,
  hydrationTimeoutMs: Schema.Int.check(
    Schema.isBetween({ maximum: 30_000, minimum: 1 })
  ),
  origin: LoopbackOrigin,
});
export const PropagationProbe = Schema.Struct({
  diagnostics: Schema.Array(Schema.String).check(Schema.isMaxLength(0)),
  retries: Schema.Int,
  routerPresent: Schema.Boolean,
});

export class CloudflareHostedProof extends Context.Service<
  CloudflareHostedProof,
  {
    readonly verifyHostedDeployment: (
      config: CloudflareHostedProofConfig
    ) => Effect.Effect<HostedProofProbe, HostedProofExecutionError>;
    readonly verifyAssetPropagation: (
      config: typeof PropagationRequest.Type
    ) => Effect.Effect<
      typeof PropagationProbe.Type,
      HostedProofExecutionError | HostedProofAssetPropagationError
    >;
  }
>()("@taxkit/docs/CloudflareHostedProof") {}

const loadHostedProofConfig = Effect.gen(function* loadHostedProofConfig() {
  const input = yield* Config.schema(HostedProofEnvironment).pipe(
    Effect.mapError(
      () =>
        new HostedProofConfigurationError({ requirement: "environment-input" })
    )
  );
  const previewPrNumber = Option.fromNullishOr(
    input.TAXKIT_DOCS_PREVIEW_PR_NUMBER
  );
  const validStageIdentity =
    input.TAXKIT_DOCS_ENVIRONMENT === "preview"
      ? Option.isSome(previewPrNumber) &&
        input.TAXKIT_DOCS_STAGE === `pr-${previewPrNumber.value}`
      : Option.isNone(previewPrNumber) && input.TAXKIT_DOCS_STAGE === "prod";
  if (!validStageIdentity) {
    return yield* new HostedProofConfigurationError({
      requirement: "environment-stage-identity",
    });
  }
  return {
    acceptedPlanSha256: input.TAXKIT_DOCS_PLAN_SHA256,
    accountId: input.TAXKIT_DOCS_ACCOUNT_ID,
    candidateCommit: input.TAXKIT_DOCS_CANDIDATE_COMMIT,
    configSha256: input.TAXKIT_DOCS_CONFIG_SHA256,
    deploymentId: input.TAXKIT_DOCS_DEPLOYMENT_ID,
    deploymentInputSha256: input.TAXKIT_DOCS_DEPLOYMENT_INPUT_SHA256,
    environment: input.TAXKIT_DOCS_ENVIRONMENT,
    evidenceDirectory: input.TAXKIT_DOCS_EVIDENCE_DIRECTORY,
    hostedPropagationAttempts: input.TAXKIT_DOCS_HOSTED_PROPAGATION_ATTEMPTS,
    hostedPropagationDelayMs: input.TAXKIT_DOCS_HOSTED_PROPAGATION_DELAY_MS,
    lockfileSha256: input.TAXKIT_DOCS_LOCKFILE_SHA256,
    origin: input.TAXKIT_DOCS_HOSTED_URL,
    previewPrNumber,
    previousVersionId: Option.fromNullishOr(
      input.TAXKIT_DOCS_PREVIOUS_VERSION_ID
    ).pipe(
      Option.flatMap((value) =>
        value === "" ? Option.none() : Option.some(value)
      )
    ),
    rollbackRecoveryIdentity: input.TAXKIT_DOCS_ROLLBACK_RECOVERY_IDENTITY,
    stage: input.TAXKIT_DOCS_STAGE,
    stateStoreId: input.TAXKIT_DOCS_STATE_STORE_ID,
    versionId: input.TAXKIT_DOCS_VERSION_ID,
    workerName: input.TAXKIT_DOCS_WORKER_NAME,
  } satisfies CloudflareHostedProofConfig;
});

export const runCloudflareHostedProof = Effect.gen(
  function* cloudflareHostedProof() {
    const config = yield* loadHostedProofConfig;
    const proof = yield* CloudflareHostedProof;
    const observation = yield* proof.verifyHostedDeployment(config);
    return yield* Schema.encodeEffect(
      Schema.fromJsonString(HostedProofObservation)
    )({
      ...observation,
      acceptedPlanSha256: config.acceptedPlanSha256,
      accountId: config.accountId,
      candidateCommit: config.candidateCommit,
      configSha256: config.configSha256,
      deploymentId: config.deploymentId,
      deploymentInputSha256: config.deploymentInputSha256,
      environment: config.environment,
      lockfileSha256: config.lockfileSha256,
      previewPrNumber: Option.getOrNull(config.previewPrNumber),
      previousVersionId: Option.getOrNull(config.previousVersionId),
      rollbackRecoveryIdentity: config.rollbackRecoveryIdentity,
      stage: config.stage,
      stateStoreId: config.stateStoreId,
      url: config.origin,
      versionId: config.versionId,
      workerName: config.workerName,
    }).pipe(
      Effect.mapError(
        () => new HostedProofEvidenceError({ operation: "encode-observation" })
      )
    );
  }
);
