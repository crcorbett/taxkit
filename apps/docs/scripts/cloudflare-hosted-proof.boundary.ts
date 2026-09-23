import { Config, Data, Effect, Schema, SchemaGetter } from "effect";

const CommitSha = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}$/u));
const Sha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u));
const CloudflareAccountId = Schema.String.check(
  Schema.isPattern(/^[a-f0-9]{32}$/u)
);
const ProviderIdentity = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(256),
  Schema.isPattern(/^[A-Za-z0-9._:/-]+$/u)
);
const WorkersDevUrl = Schema.String.check(
  Schema.isMaxLength(256),
  Schema.isPattern(
    /^https:\/\/(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+workers\.dev$/u
  )
);
// This proof input rejects invalid stage text independently of Alchemy's
// deployment declaration; the workflow also checks the exact stage identity.
const HostedProofStage = Schema.String.check(
  Schema.isPattern(/^(?:prod|pr-[1-9]\d*)$/u)
);
const EvidenceDirectory = Schema.String.check(
  Schema.isMaxLength(512),
  Schema.isPattern(
    /^docs\/evidence\/deployments\/(?!.*\.\.(?:\/|$))[A-Za-z0-9._/-]+$/u
  )
);
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

const HostedProofConfig = Schema.Struct({
  TAXKIT_DOCS_ACCOUNT_ID: CloudflareAccountId,
  TAXKIT_DOCS_CANDIDATE_COMMIT: CommitSha,
  TAXKIT_DOCS_CONFIG_SHA256: Sha256,
  TAXKIT_DOCS_DEPLOYMENT_ID: ProviderIdentity,
  TAXKIT_DOCS_DEPLOYMENT_INPUT_SHA256: Sha256,
  TAXKIT_DOCS_ENVIRONMENT: Schema.Literals([
    "preview",
    "production",
    "rollback",
  ]),
  TAXKIT_DOCS_EVIDENCE_DIRECTORY: EvidenceDirectory,
  TAXKIT_DOCS_HOSTED_PROPAGATION_ATTEMPTS: decimalNumber(1, 20),
  TAXKIT_DOCS_HOSTED_PROPAGATION_DELAY_MS: decimalNumber(1, 30_000),
  TAXKIT_DOCS_HOSTED_URL: WorkersDevUrl,
  TAXKIT_DOCS_LOCKFILE_SHA256: Sha256,
  TAXKIT_DOCS_PLAN_SHA256: Sha256,
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

export interface CloudflareHostedProofConfig {
  readonly acceptedPlanSha256: string;
  readonly accountId: string;
  readonly candidateCommit: string;
  readonly configSha256: string;
  readonly deploymentId: string;
  readonly deploymentInputSha256: string;
  readonly environment: "preview" | "production" | "rollback";
  readonly evidenceDirectory: string;
  readonly hostedPropagationAttempts: number;
  readonly hostedPropagationDelayMs: number;
  readonly lockfileSha256: string;
  readonly origin: string;
  readonly previewPrNumber: number | null;
  readonly previousVersionId: string | null;
  readonly rollbackRecoveryIdentity: string;
  readonly stage: string;
  readonly stateStoreId: string;
  readonly versionId: string;
  readonly workerName: string;
}

export class HostedProofConfigurationError extends Data.TaggedError(
  "HostedProofConfigurationError"
)<{
  readonly requirement: "environment-input" | "environment-stage-identity";
}> {}

export class HostedProofExecutionError extends Data.TaggedError(
  "HostedProofExecutionError"
)<{
  readonly operation: "browser-close" | "browser-launch" | "browser-proof";
}> {}

export class HostedProofEvidenceError extends Data.TaggedError(
  "HostedProofEvidenceError"
)<{
  readonly operation: "encode-observation";
}> {}

type HostedProofObservation = typeof Schema.Unknown.Type;

export interface CloudflareHostedProofHost<BrowserHandle> {
  readonly close: (browser: BrowserHandle) => Promise<void>;
  readonly launch: (signal: AbortSignal) => Promise<BrowserHandle>;
  readonly run: (
    config: CloudflareHostedProofConfig,
    browser: BrowserHandle,
    signal: AbortSignal
  ) => Promise<HostedProofObservation>;
}

const loadHostedProofConfig = Effect.gen(function* loadHostedProofConfig() {
  const input = yield* Config.schema(HostedProofConfig).pipe(
    Effect.mapError(
      () =>
        new HostedProofConfigurationError({
          requirement: "environment-input",
        })
    )
  );
  const previewPrNumber = input.TAXKIT_DOCS_PREVIEW_PR_NUMBER ?? null;
  const validStageIdentity =
    input.TAXKIT_DOCS_ENVIRONMENT === "preview"
      ? previewPrNumber !== null &&
        input.TAXKIT_DOCS_STAGE === `pr-${previewPrNumber}`
      : previewPrNumber === null && input.TAXKIT_DOCS_STAGE === "prod";
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
    previousVersionId:
      input.TAXKIT_DOCS_PREVIOUS_VERSION_ID === undefined ||
      input.TAXKIT_DOCS_PREVIOUS_VERSION_ID === ""
        ? null
        : input.TAXKIT_DOCS_PREVIOUS_VERSION_ID,
    rollbackRecoveryIdentity: input.TAXKIT_DOCS_ROLLBACK_RECOVERY_IDENTITY,
    stage: input.TAXKIT_DOCS_STAGE,
    stateStoreId: input.TAXKIT_DOCS_STATE_STORE_ID,
    versionId: input.TAXKIT_DOCS_VERSION_ID,
    workerName: input.TAXKIT_DOCS_WORKER_NAME,
  } satisfies CloudflareHostedProofConfig;
});

const acquireBrowser = <BrowserHandle>(
  host: CloudflareHostedProofHost<BrowserHandle>
) =>
  Effect.acquireRelease(
    Effect.tryPromise({
      catch: () =>
        new HostedProofExecutionError({ operation: "browser-launch" }),
      try: (signal) => host.launch(signal),
    }),
    (browser) =>
      Effect.tryPromise({
        catch: () =>
          new HostedProofExecutionError({ operation: "browser-close" }),
        try: () => host.close(browser),
      }).pipe(Effect.orDie)
  );

const HostedProofJson = Schema.Record(Schema.String, Schema.Json);

export const runCloudflareHostedProof = <BrowserHandle>(
  host: CloudflareHostedProofHost<BrowserHandle>
) =>
  Effect.gen(function* cloudflareHostedProof() {
    const config = yield* loadHostedProofConfig;
    const browser = yield* acquireBrowser(host);
    const observation = yield* Effect.tryPromise({
      catch: () =>
        new HostedProofExecutionError({ operation: "browser-proof" }),
      try: (signal) => host.run(config, browser, signal),
    });

    return yield* Schema.encodeUnknownEffect(
      Schema.fromJsonString(HostedProofJson)
    )(observation).pipe(
      Effect.mapError(
        () => new HostedProofEvidenceError({ operation: "encode-observation" })
      )
    );
  });
