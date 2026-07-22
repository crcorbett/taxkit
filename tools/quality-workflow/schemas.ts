import { Schema } from "effect";

const QualityWorkflowInvariant = Schema.Literals([
  "workflow-yaml",
  "workflow-triggers",
  "workflow-permissions",
  "workflow-concurrency",
  "workflow-job-shape",
  "workflow-timeout",
  "workflow-action-pin",
  "workflow-pin-update-owner",
  "canonical-release-graph",
  "workflow-mutation-step",
  "release-boundary-corpus",
  "release-boundary-fixture",
  "control-register",
  "automation-register",
  "release-runtime-boundary",
]);

export class QualityWorkflowFinding extends Schema.TaggedClass<QualityWorkflowFinding>()(
  "QualityWorkflowFinding",
  {
    invariant: QualityWorkflowInvariant,
    recovery: Schema.NonEmptyString,
    target: Schema.NonEmptyString,
  }
) {}

export class QualityWorkflowYamlError extends Schema.TaggedErrorClass<QualityWorkflowYamlError>()(
  "QualityWorkflowYamlError",
  {
    target: Schema.NonEmptyString,
  }
) {}

export class QualityWorkflowInputError extends Schema.TaggedErrorClass<QualityWorkflowInputError>()(
  "QualityWorkflowInputError",
  {
    target: Schema.NonEmptyString,
  }
) {}

export class QualityWorkflowPolicyError extends Schema.TaggedErrorClass<QualityWorkflowPolicyError>()(
  "QualityWorkflowPolicyError",
  { findings: Schema.NonEmptyArray(QualityWorkflowFinding) }
) {}

const YamlRecord = Schema.Record(Schema.String, Schema.Unknown);

export const QualityWorkflowDocument = Schema.Struct({
  concurrency: YamlRecord,
  env: Schema.optional(YamlRecord),
  jobs: YamlRecord,
  name: Schema.Literal("Quality"),
  on: YamlRecord,
  permissions: YamlRecord,
});
export type QualityWorkflowDocument = typeof QualityWorkflowDocument.Type;

export const ReleaseBoundaryFixture = Schema.Struct({
  command: Schema.Struct({
    args: Schema.Array(Schema.String),
    executable: Schema.NonEmptyString,
  }),
  defect: Schema.NonEmptyString,
  expectedFailedCheck: Schema.NonEmptyString,
  failureOracle: Schema.NonEmptyString,
  id: Schema.Literals([
    "public-export",
    "packed-sdk",
    "api-contract",
    "public-docs-manifest",
    "workflow-semantics",
    "release-script",
  ]),
  mutation: Schema.Struct({
    replacement: Schema.NonEmptyString,
    search: Schema.NonEmptyString,
  }),
  recovery: Schema.NonEmptyString,
  runner: Schema.NonEmptyString,
  target: Schema.NonEmptyString,
});
export type ReleaseBoundaryFixture = typeof ReleaseBoundaryFixture.Type;

export const ReleaseBoundaryFixtureCorpus = Schema.Array(
  ReleaseBoundaryFixture
);

const ControlRegisterEntry = Schema.Struct({
  evidence: Schema.NonEmptyString,
  fixture: Schema.NonEmptyString,
  id: Schema.NonEmptyString,
  owner: Schema.NonEmptyString,
  preventedFailure: Schema.NonEmptyString,
  recovery: Schema.NonEmptyString,
  retirementCondition: Schema.NonEmptyString,
  reviewTrigger: Schema.NonEmptyString,
  signal: Schema.NonEmptyString,
});
export type ControlRegisterEntry = typeof ControlRegisterEntry.Type;
export const ControlRegister = Schema.Array(ControlRegisterEntry);

const ContextCandidateEnvelope = Schema.Struct({
  candidatePath: Schema.NonEmptyString,
  classification: Schema.Literal("untrusted-report-only"),
  generatedEvidenceExclusions: Schema.NonEmptyArray(Schema.NonEmptyString),
  lastKnownGoodRecovery: Schema.NonEmptyString,
  publicationStatus: Schema.Literal("not-published"),
  publisher: Schema.NonEmptyString,
  recovery: Schema.NonEmptyString,
  responsibleReviewer: Schema.NonEmptyString,
  selfFeedbackExclusions: Schema.NonEmptyArray(Schema.NonEmptyString),
  targetRevision: Schema.NonEmptyString,
});

const AutomationSignal = Schema.Struct({
  kind: Schema.Literals([
    "pull-request-or-push",
    "foreground-maintainer-request",
  ]),
  revisionSource: Schema.Literals([
    "github.sha",
    "foreground-maintainer-supplied-immutable-revision",
  ]),
});

const AutomationDurableState = Schema.Struct({
  kind: Schema.Literals([
    "immutable-revision-validation",
    "report-only-context-candidate",
  ]),
  location: Schema.Literals([
    "checked-out-repository-revision",
    "tmp/context-candidates/",
  ]),
  revisionSource: Schema.Literals([
    "github.sha",
    "foreground-maintainer-supplied-immutable-revision",
  ]),
});

const AutomationAuthority = Schema.Struct({
  denied: Schema.NonEmptyArray(
    Schema.Literals([
      "canonical-repository-edit",
      "credential-write",
      "deployment",
      "external-state-recovery",
      "provider-write",
      "publication",
      "registry-write",
      "release",
    ])
  ),
  environment: Schema.Literals(["github-actions-ci", "local-report-only"]),
  grants: Schema.Array(Schema.Literal("contents:read")),
  principal: Schema.NonEmptyString,
  resource: Schema.Literals([
    "taxkit-repository-and-runner",
    "explicit-source-set-and-candidate",
  ]),
});

const AutomationResource = Schema.Struct({
  id: Schema.Literals([
    "taxkit-repository-and-runner",
    "explicit-source-set-and-candidate",
  ]),
  scope: Schema.NonEmptyArray(Schema.NonEmptyString),
});

const AutomationEnvironment = Schema.Struct({
  id: Schema.Literals(["github-actions-ci", "local-report-only"]),
  trigger: Schema.Literals([
    "configured-pull-request-or-push",
    "foreground-maintainer-only",
  ]),
});

const AutomationProof = Schema.Struct({
  command: Schema.NonEmptyString,
  failureIdentity: Schema.NonEmptyString,
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  successPostcondition: Schema.NonEmptyString,
});

const AutomationStopAndEscalation = Schema.Struct({
  escalationOwner: Schema.NonEmptyString,
  mode: Schema.Literal("fail-closed"),
  stopConditions: Schema.NonEmptyArray(Schema.NonEmptyString),
});

const AutomationRollback = Schema.Struct({
  action: Schema.NonEmptyString,
  authorityRequired: Schema.NonEmptyString,
});

const AutomationRecovery = Schema.Struct({
  action: Schema.NonEmptyString,
  owner: Schema.NonEmptyString,
  verificationCommand: Schema.NonEmptyString,
});

const AutomationRetirement = Schema.Struct({
  approvalOwner: Schema.NonEmptyString,
  condition: Schema.NonEmptyString,
  successorRequired: Schema.Literal(true),
});

const AutomationExternalState = Schema.Struct({
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  status: Schema.Literal("not-established"),
});

const AutomationRegisterEntry = Schema.Struct({
  authority: AutomationAuthority,
  candidate: Schema.optional(ContextCandidateEnvelope),
  durableState: AutomationDurableState,
  environment: AutomationEnvironment,
  externalState: AutomationExternalState,
  id: Schema.Literals(["quality-ci", "documentation-context-freshness"]),
  owner: Schema.NonEmptyString,
  proof: AutomationProof,
  recovery: AutomationRecovery,
  resource: AutomationResource,
  retirementCondition: AutomationRetirement,
  rollback: AutomationRollback,
  signal: AutomationSignal,
  stopAndEscalation: AutomationStopAndEscalation,
});
export type AutomationRegisterEntry = typeof AutomationRegisterEntry.Type;
export const AutomationRegister = Schema.Array(AutomationRegisterEntry);
