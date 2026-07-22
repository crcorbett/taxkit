import { Schema } from "effect";

export const DocumentationPathClass = Schema.Literals([
  "maintainer",
  "public",
  "generated",
  "workspace-manifest",
  "authored-sdk",
  "other",
]);
export type DocumentationPathClass = typeof DocumentationPathClass.Type;

export const DocumentationInvariant = Schema.Literals([
  "maintainer-metadata",
  "lifecycle-successor",
  "relative-link",
  "local-bun-command",
  "workspace-readme",
  "generated-source-owner",
  "owner-policy",
]);
export type DocumentationInvariant = typeof DocumentationInvariant.Type;

export class DocumentationDiagnostic extends Schema.TaggedClass<DocumentationDiagnostic>()(
  "DocumentationDiagnostic",
  {
    invariant: DocumentationInvariant,
    owner: Schema.NonEmptyString,
    repair: Schema.NonEmptyString,
    target: Schema.NonEmptyString,
  }
) {}

export class DocumentationReport extends Schema.TaggedClass<DocumentationReport>()(
  "DocumentationReport",
  {
    diagnostics: Schema.Array(DocumentationDiagnostic),
    inspected: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    maintainer: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    public: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  }
) {}

export class DocumentationReceipt extends Schema.TaggedClass<DocumentationReceipt>()(
  "DocumentationReceipt",
  {
    diagnostics: Schema.Array(DocumentationDiagnostic),
    inspected: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    maintainer: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    nonClaim: Schema.NonEmptyString,
    ok: Schema.Boolean,
    omittedDiagnostics: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    postcondition: Schema.NonEmptyString,
    public: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    reportPath: Schema.NonEmptyString,
    violationCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  }
) {}

export class DocumentationCheckError extends Schema.TaggedErrorClass<DocumentationCheckError>()(
  "DocumentationCheckError",
  { operation: Schema.NonEmptyString }
) {}

export const WorkspacePackageManifest = Schema.Struct({
  name: Schema.optional(Schema.NonEmptyString),
  scripts: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

const OwnerBinding = Schema.Struct({
  command: Schema.optional(Schema.String),
  owner: Schema.NonEmptyString,
  path: Schema.NonEmptyString,
});

export const PublicPageAcceptanceRecord = Schema.Struct({
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  owner: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  state: Schema.Literal("accepted"),
  targetPath: Schema.NonEmptyString,
});
export type PublicPageAcceptanceRecord = typeof PublicPageAcceptanceRecord.Type;

export const OwnerPolicy = Schema.Struct({
  fumadocs: Schema.Struct({
    build: OwnerBinding,
    generatedRoot: Schema.NonEmptyString,
    source: OwnerBinding,
  }),
  maintainer: Schema.Struct({
    rootEntrypoints: Schema.Array(Schema.NonEmptyString),
    roots: Schema.Array(Schema.NonEmptyString),
    snapshotExemptions: Schema.Array(
      Schema.Struct({
        documentClass: Schema.Literal("manual-html-snapshot"),
        path: Schema.NonEmptyString,
        reason: Schema.NonEmptyString,
      })
    ),
  }),
  openApi: Schema.Struct({
    liveRoute: OwnerBinding,
    snapshot: OwnerBinding,
    source: OwnerBinding,
    test: OwnerBinding,
  }),
  public: Schema.Struct({
    navigation: OwnerBinding,
    roots: Schema.Array(Schema.NonEmptyString),
    statusDecision: Schema.Struct({
      acceptanceRecords: Schema.Array(
        Schema.Struct({
          path: Schema.NonEmptyString,
          record: Schema.NonEmptyString,
        })
      ),
      owner: Schema.NonEmptyString,
      path: Schema.NonEmptyString,
      semantics: Schema.Literal("accepted-public-lifecycle"),
      statuses: Schema.Struct({
        draft: Schema.Literal("authored-candidate"),
        published: Schema.Literal("accepted-current"),
      }),
    }),
  }),
  sdkDocs: Schema.Struct({
    owner: Schema.NonEmptyString,
    roots: Schema.Array(Schema.NonEmptyString),
  }),
});
export type OwnerPolicy = typeof OwnerPolicy.Type;

export const RunbookId = Schema.Literals([
  "release-readiness",
  "versioning",
  "packed-consumer-proof",
  "recovery",
]);
export type RunbookId = typeof RunbookId.Type;

export const ConsequentialOperation = Schema.Literals([
  "versioning",
  "commit",
  "push",
  "tag",
  "release",
  "registry-publication",
  "deployment",
  "provider-access",
  "recovery-mutation",
]);
export type ConsequentialOperation = typeof ConsequentialOperation.Type;

const RunbookCommand = Schema.Struct({
  argv: Schema.NonEmptyArray(Schema.NonEmptyString),
  executeInDryRun: Schema.Literal(false),
  invocation: Schema.NonEmptyString,
  requiredAuthority: Schema.Literals(["local-proof", "versioning"]),
  requiredEnvironment: Schema.Array(
    Schema.Literals(["RELEASE_ATTEMPT_PATH", "RELEASE_ATTEMPT_SHA256"])
  ),
  script: Schema.NonEmptyString,
  scriptOwner: Schema.Literals(["root", "@taxkit/sdk"]),
});

const RunbookEntry = Schema.Struct({
  acceptedEvidenceRequired: Schema.Boolean,
  commands: Schema.NonEmptyArray(RunbookCommand),
  evidencePaths: Schema.NonEmptyArray(Schema.NonEmptyString),
  id: RunbookId,
  owner: Schema.NonEmptyString,
  path: Schema.NonEmptyString,
  stopOperations: Schema.NonEmptyArray(ConsequentialOperation),
});

const AuthorityStop = Schema.Struct({
  approvalBoundary: Schema.NonEmptyString,
  auditReceipt: Schema.NonEmptyString,
  durationOrRevocation: Schema.NonEmptyString,
  environment: Schema.NonEmptyString,
  escalation: Schema.NonEmptyString,
  operation: ConsequentialOperation,
  principal: Schema.NonEmptyString,
  principalSource: Schema.NonEmptyString,
  resource: Schema.NonEmptyString,
  rollbackPrecondition: Schema.NonEmptyString,
  status: Schema.Literals(["unknown-stop", "approved"]),
});

export const RunbookContract = Schema.Struct({
  acceptedHandoff: Schema.Struct({
    acceptedSummary: Schema.NonEmptyString,
    failedProvenance: Schema.NonEmptyString,
    journeyInventory: Schema.NonEmptyString,
    packet: Schema.NonEmptyString,
    validationReceipt: Schema.NonEmptyString,
  }),
  authorityStops: Schema.NonEmptyArray(AuthorityStop),
  dryRun: Schema.Struct({
    executeCommands: Schema.Literal(false),
    nonClaim: Schema.NonEmptyString,
    operationsExecuted: Schema.Tuple([]),
    postcondition: Schema.NonEmptyString,
    reportPath: Schema.Literal("tmp/runbook-validation-report.json"),
  }),
  owner: Schema.NonEmptyString,
  reviewTrigger: Schema.NonEmptyString,
  runbooks: Schema.NonEmptyArray(RunbookEntry),
  schemaVersion: Schema.Literal(1),
  taskId: Schema.Literal("HGI-204"),
});
export type RunbookContract = typeof RunbookContract.Type;

const CommitSha = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}$/u));
const Sha256 = Schema.String.check(
  Schema.isPattern(/^(?:sha256:)?[a-f0-9]{64}$/u)
);

export const Hgi203ValidationProjection = Schema.Struct({
  candidate: Schema.Struct({
    acceptedSummary: Schema.Literal(
      "docs/evidence/releases/HGI-203-accepted-attempt.json"
    ),
    acceptedSummarySha256: Sha256,
    attemptId: Schema.String.check(Schema.isPattern(/^release-[0-9]+$/u)),
    contentManifest: Schema.Literal(
      "docs/evidence/releases/HGI-203-content-manifest.txt"
    ),
    contentManifestSha256: Sha256,
    packet: Schema.Literal("docs/evidence/releases/HGI-203-local.json"),
    packetSha256: Sha256,
  }),
  semanticCommit: CommitSha,
  status: Schema.Literal("passed"),
  taskId: Schema.Literal("HGI-203"),
});
export type Hgi203ValidationProjection = typeof Hgi203ValidationProjection.Type;

export const RunbookInvariant = Schema.Literals([
  "exact-inventory",
  "unique-owner",
  "required-section",
  "existing-command",
  "evidence-path",
  "authority-stop",
  "accepted-handoff",
  "non-executing",
]);
export type RunbookInvariant = typeof RunbookInvariant.Type;

export class RunbookDiagnostic extends Schema.TaggedClass<RunbookDiagnostic>()(
  "RunbookDiagnostic",
  {
    invariant: RunbookInvariant,
    owner: Schema.NonEmptyString,
    recovery: Schema.NonEmptyString,
    target: Schema.NonEmptyString,
  }
) {}

export class RunbookValidationReceipt extends Schema.TaggedClass<RunbookValidationReceipt>()(
  "RunbookValidationReceipt",
  {
    diagnostics: Schema.Array(RunbookDiagnostic),
    inspectedCommands: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    inspectedRunbooks: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    nonClaim: Schema.NonEmptyString,
    ok: Schema.Boolean,
    omittedDiagnostics: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    operationsExecuted: Schema.Tuple([]),
    postcondition: Schema.NonEmptyString,
    reportPath: Schema.Literal("tmp/runbook-validation-report.json"),
    schemaVersion: Schema.Literal(1),
    taskId: Schema.Literal("HGI-204"),
    violationCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  }
) {}

export class RunbookValidationError extends Schema.TaggedErrorClass<RunbookValidationError>()(
  "RunbookValidationError",
  { operation: Schema.NonEmptyString }
) {}
