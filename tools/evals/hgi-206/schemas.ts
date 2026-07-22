import { Schema } from "effect";

export const targetCommit = "a8a58882cd6c5f8003d31dc0c0567d78093597b9";
export const failedCandidateDigest =
  "daa431c2aa388ddffa203cf9255161800e257ed35b7a090ba080470aab07f7b7";

export const hgi206Paths = {
  candidate: "docs/documentation-audit/HGI-206-candidate.json",
  failed: "docs/documentation-audit/hgi-206/failed-independent-2026-07-22.json",
  fixtures: "tools/evals/hgi-206-contradiction-fixtures.json",
  manifest: "tools/evals/hgi-206-source-manifest.json",
  observations: "tools/evals/hgi-206-contradiction-observations.json",
  results: "tools/evals/hgi-206-results.json",
  scenarios: "tools/evals/hgi-206-scenarios.json",
};

export const receiptPaths: readonly string[] = [
  "docs/documentation-audit/hgi-206/receipts/calculator.json",
  "docs/documentation-audit/hgi-206/receipts/docs-runtime.json",
  "docs/documentation-audit/hgi-206/receipts/http-api.json",
  "docs/documentation-audit/hgi-206/receipts/packed-sdk.json",
  "docs/documentation-audit/hgi-206/receipts/release-readiness.json",
];

export const detailPaths: readonly string[] = [
  "docs/documentation-audit/hgi-206/details/calculator.json",
  "docs/documentation-audit/hgi-206/details/docs-runtime.json",
  "docs/documentation-audit/hgi-206/details/http-api.json",
  "docs/documentation-audit/hgi-206/details/packed-sdk.json",
  "docs/documentation-audit/hgi-206/details/release-readiness.json",
];

export const derivedPaths: readonly string[] = [
  hgi206Paths.manifest,
  hgi206Paths.results,
  hgi206Paths.candidate,
  ...receiptPaths,
  ...detailPaths,
  hgi206Paths.failed,
];

export const derivedExclusions: readonly {
  readonly path: string;
  readonly reason: string;
}[] = [
  {
    path: hgi206Paths.manifest,
    reason: "Self-referential source-manifest aggregate record.",
  },
  {
    path: hgi206Paths.results,
    reason: "Derived result binds the source digest and observation hash.",
  },
  {
    path: hgi206Paths.candidate,
    reason: "Candidate is bound last to final source and evidence hashes.",
  },
  ...receiptPaths.map((path) => ({
    path,
    reason: "Derived receipt binds the source digest and bounded-detail hash.",
  })),
  ...detailPaths.map((path) => ({
    path,
    reason: "Derived bounded detail is hashed by its journey receipt.",
  })),
  {
    path: hgi206Paths.failed,
    reason:
      "Retained failed-attempt evidence is hashed by the final candidate.",
  },
];

export const canonicalSourcePaths: readonly string[] = [
  ".agents/skills/docs-maintainer/SKILL.md",
  ".agents/skills/docs-maintainer/references/repository-profile.md",
  "AGENTS.md",
  "docs/README.md",
  "docs/architecture/effect-services.md",
  "docs/documentation-audit/README.md",
  "docs/exec-plans/active/harness-governance-documentation.md",
  "docs/operations/authority-model.md",
  "docs/product-specs/harness-governance-documentation.md",
  "docs/runbooks/README.md",
  "docs/runbooks/release-readiness.md",
  "docs/verification/critical-journeys.json",
  "docs/verification/effectiveness.md",
  "docs/verification/harness-epochs.md",
  "oxlint.config.ts",
  "package.json",
  "tools/evals/hgi-206/check.runtime.ts",
  "tools/evals/hgi-206/input.boundary.ts",
  "tools/evals/hgi-206/schemas.ts",
  "tools/evals/hgi-206/service.test.ts",
  "tools/evals/hgi-206/service.ts",
  "tools/evals/hgi-206-contradiction-fixtures.json",
  "tools/evals/hgi-206-contradiction-observations.json",
  "tools/evals/hgi-206-scenarios.json",
  "tools/evals/tsconfig.json",
];

export const Sha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u));
export const NonEmpty = Schema.NonEmptyString;
export const ObservedAt = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
);
export const RelativePath = NonEmpty.pipe(
  Schema.check(Schema.isPattern(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/u))
);

export const Artifact = Schema.Struct({ path: RelativePath, sha256: Sha256 });
export type Artifact = typeof Artifact.Type;

const ContradictionId = Schema.Literals([
  "stale-owner",
  "stale-command",
  "imitation-proof",
  "mutable-artifact-identity",
  "raw-unbounded-evidence",
  "unsafe-rerun",
  "unknown-principal-authority-expansion",
  "duplicated-runbook",
  "missing-recovery",
  "missing-rollback-escalation",
  "invented-timing",
  "unchecked-boundary-input",
  "instanceof-policy",
  "nested-runtime",
  "helper-common-utils-sprawl",
]);

export const Fixture = Schema.Struct({
  claim: NonEmpty,
  id: ContradictionId,
  invariant: NonEmpty,
  nonClaim: NonEmpty,
  owner: NonEmpty,
  recovery: NonEmpty,
  target: RelativePath,
});
export type Fixture = typeof Fixture.Type;

export const FixtureCorpus = Schema.Struct({
  fixtures: Schema.Array(Fixture),
  purpose: NonEmpty,
  schemaVersion: Schema.Literal(2),
  taskId: Schema.Literal("HGI-206"),
});
export type FixtureCorpus = typeof FixtureCorpus.Type;

export const ContradictionObservation = Schema.Struct({
  exitCode: Schema.Literal(0),
  fixtureId: ContradictionId,
  invariant: NonEmpty,
  kind: Schema.Literal("bounded-contradiction-observation"),
  nonClaim: NonEmpty,
  observedAt: ObservedAt,
  owner: NonEmpty,
  postcondition: NonEmpty,
  recovery: NonEmpty,
  schemaVersion: Schema.Literal(1),
  status: Schema.Literal("rejected"),
  target: RelativePath,
});
export type ContradictionObservation = typeof ContradictionObservation.Type;

export const ObservationCorpus = Schema.Struct({
  observations: Schema.Array(ContradictionObservation),
  schemaVersion: Schema.Literal(1),
  taskId: Schema.Literal("HGI-206"),
});
export type ObservationCorpus = typeof ObservationCorpus.Type;

export const Result = Schema.Struct({
  detailPath: Schema.Literal(hgi206Paths.observations),
  detailSha256: Sha256,
  exitCode: Schema.Literal(0),
  id: ContradictionId,
  invariant: NonEmpty,
  nonClaim: NonEmpty,
  observedAt: ObservedAt,
  owner: NonEmpty,
  postcondition: NonEmpty,
  recovery: NonEmpty,
  status: Schema.Literal("rejected"),
  target: RelativePath,
});
export type Result = typeof Result.Type;

export const Results = Schema.Struct({
  lifecycle: Schema.Literal("local-deterministic-result"),
  limitations: Schema.Array(NonEmpty),
  nonClaim: NonEmpty,
  procedure: NonEmpty,
  results: Schema.Array(Result),
  schemaVersion: Schema.Literal(3),
  target: Schema.Struct({
    baseCommit: Schema.Literal(targetCommit),
    sourceDigest: Sha256,
    sourceManifest: Schema.Literal(hgi206Paths.manifest),
  }),
  taskId: Schema.Literal("HGI-206"),
});
export type Results = typeof Results.Type;

const ManifestExclusion = Schema.Struct({
  path: RelativePath,
  reason: NonEmpty,
});

export const Manifest = Schema.Struct({
  algorithm: NonEmpty,
  changedPathDigest: Sha256,
  changedPaths: Schema.Array(RelativePath),
  digest: Sha256,
  exclusions: Schema.Array(ManifestExclusion),
  files: Schema.Array(Artifact),
  schemaVersion: Schema.Literal(3),
  taskId: Schema.Literal("HGI-206"),
});
export type Manifest = typeof Manifest.Type;

const JourneyId = Schema.Literals([
  "HGI206-CALCULATOR-FRESH",
  "HGI206-PACKED-SDK-FRESH",
  "HGI206-HTTP-API-FRESH",
  "HGI206-DOCS-RUNTIME-FRESH",
  "HGI206-RELEASE-READINESS-FRESH",
]);

export const Journey = Schema.Struct({
  command: NonEmpty,
  id: JourneyId,
  nonClaim: NonEmpty,
  oracle: NonEmpty,
  owner: NonEmpty,
  receipt: RelativePath,
  recovery: NonEmpty,
});
export type Journey = typeof Journey.Type;

export const Scenarios = Schema.Struct({
  authority: Schema.Struct({
    mode: Schema.Literal("local-read-and-verification"),
    stopsBefore: Schema.Array(NonEmpty),
  }),
  independentGrade: Schema.Struct({
    nonClaim: NonEmpty,
    owner: NonEmpty,
    resultPath: NonEmpty,
    status: Schema.Literal("pending"),
  }),
  journeys: Schema.Array(Journey),
  lifecycle: Schema.Literal("current-worker-visible"),
  owner: NonEmpty,
  reviewTrigger: NonEmpty,
  schemaVersion: Schema.Literal(1),
  seededContradictions: Schema.Array(
    Schema.Struct({
      id: NonEmpty,
      invariant: NonEmpty,
      reject: NonEmpty,
      repairOwner: NonEmpty,
    })
  ),
  targetCommit: Schema.Literal(targetCommit),
  taskId: Schema.Literal("HGI-206"),
});
export type Scenarios = typeof Scenarios.Type;

export const JourneyDetail = Schema.Struct({
  command: NonEmpty,
  exitCode: Schema.Literal(0),
  journeyId: JourneyId,
  kind: Schema.Literal("bounded-journey-detail"),
  nonClaim: NonEmpty,
  observedAt: ObservedAt,
  omittedDetail: NonEmpty,
  oracle: NonEmpty,
  owner: NonEmpty,
  recovery: NonEmpty,
  schemaVersion: Schema.Literal(1),
  summary: NonEmpty,
});
export type JourneyDetail = typeof JourneyDetail.Type;

export const Receipt = Schema.Struct({
  candidate: Schema.Struct({
    sourceDigest: Sha256,
    sourceManifest: Schema.Literal(hgi206Paths.manifest),
  }),
  command: NonEmpty,
  detailPath: RelativePath,
  detailSha256: Sha256,
  exitCode: Schema.Literal(0),
  journeyId: JourneyId,
  nonClaim: NonEmpty,
  observedAt: ObservedAt,
  oracle: NonEmpty,
  owner: NonEmpty,
  recovery: NonEmpty,
  schemaVersion: Schema.Literal(1),
});
export type Receipt = typeof Receipt.Type;

const NullClock = Schema.Struct({ reason: NonEmpty, value: Schema.Null });

export const impactSurfaces: readonly string[] = [
  "active-intent",
  "ci",
  "closeout-evidence",
  "configuration-manifests",
  "documentation",
  "lint-custom-rules-fixtures",
  "readmes",
  "rollback",
  "runbooks",
  "skills",
  "tests",
];

const ImpactSurface = Schema.Literals(impactSurfaces);

const ImpactLedgerEntry = Schema.Struct({
  decision: Schema.Literals(["Change required", "N/A", "Preserve"]),
  evidence: NonEmpty,
  nonClaim: NonEmpty,
  owner: NonEmpty,
  paths: Schema.Array(RelativePath),
  postcondition: NonEmpty,
  surface: ImpactSurface,
});

const EpochSkill = Schema.Struct({
  sha256: Sha256,
  sourceId: NonEmpty.pipe(
    Schema.check(
      Schema.isPattern(
        /^(?:codex-global:(?:docs-maintainer|prd-implementer)|repository:\.agents\/skills\/docs-maintainer\/SKILL\.md)$/u
      )
    )
  ),
  sourceRevision: NonEmpty,
});

export const expectedEpochSkills: readonly {
  readonly sha256: string;
  readonly sourceId: string;
  readonly sourceRevision: string;
}[] = [
  {
    sha256: "6f2028152fd4c16f882f604b53d2906b06c336597113de67a778fbe9b9236016",
    sourceId: "codex-global:prd-implementer",
    sourceRevision: "installed global skill observed 2026-07-22",
  },
  {
    sha256: "054bafcd59be9aa209828835691254f5ed013ac8d840d9e9808bcb04b705e86d",
    sourceId: "codex-global:docs-maintainer",
    sourceRevision: "installed global skill observed 2026-07-22",
  },
  {
    sha256: "17454a6fe858d18b7e2a97d4e0addeb9c1417688e46cd3e619b0cfbe1a37de7f",
    sourceId: "repository:.agents/skills/docs-maintainer/SKILL.md",
    sourceRevision: "TaxKit a8a58882cd6c5f8003d31dc0c0567d78093597b9",
  },
];

export const isPortableSkillSourceId = (sourceId: string) =>
  /^(?:codex-global:(?:docs-maintainer|prd-implementer)|repository:\.agents\/skills\/docs-maintainer\/SKILL\.md)$/u.test(
    sourceId
  );

const EpochTool = Schema.Struct({
  name: Schema.Literals(["bun", "deno", "git", "ripgrep"]),
  observedAt: ObservedAt,
  version: NonEmpty,
});

const EpochRuntime = Schema.Struct({
  name: Schema.Literals(["Effect", "TaxKit workspace"]),
  version: NonEmpty,
});

export const Candidate = Schema.Struct({
  clocks: Schema.Struct({
    acceptedOutcome: NullClock,
    humanAttention: NullClock,
    workerFeedback: NullClock,
    workerWallClock: NullClock,
  }),
  epoch: Schema.Struct({
    host: NonEmpty,
    integrationOwner: Schema.Literal("primary prd-implementer worker"),
    model: Schema.Literal("gpt-5.6-terra"),
    reasoning: Schema.Literal("medium"),
    runtime: Schema.Array(EpochRuntime),
    skills: Schema.Array(EpochSkill),
    targetCommit: Schema.Literal(targetCommit),
    tools: Schema.Array(EpochTool),
    worker: NonEmpty,
  }),
  evidence: Schema.Struct({
    failedAttempt: Schema.Struct({
      limitation: NonEmpty,
      path: Schema.Literal(hgi206Paths.failed),
      priorCandidateDigest: Schema.Literal(failedCandidateDigest),
      sha256: Sha256,
    }),
    fixtures: Schema.Struct({
      path: Schema.Literal(hgi206Paths.fixtures),
      sha256: Sha256,
    }),
    observations: Schema.Struct({
      path: Schema.Literal(hgi206Paths.observations),
      sha256: Sha256,
    }),
    receipts: Schema.Array(Artifact),
    results: Schema.Struct({
      path: Schema.Literal(hgi206Paths.results),
      sha256: Sha256,
    }),
  }),
  impactLedger: Schema.Array(ImpactLedgerEntry),
  independentGrade: Schema.Struct({
    nonClaim: NonEmpty,
    status: Schema.Literal("pending"),
  }),
  lifecycle: Schema.Literal("candidate"),
  limitations: Schema.Array(NonEmpty),
  rollback: NonEmpty,
  schemaVersion: Schema.Literal(3),
  target: Schema.Struct({
    baseCommit: Schema.Literal(targetCommit),
    sourceDigest: Sha256,
    sourceManifest: Schema.Literal(hgi206Paths.manifest),
  }),
  taskId: Schema.Literal("HGI-206"),
});
export type Candidate = typeof Candidate.Type;

export const Failed = Schema.Struct({
  blockers: Schema.Array(NonEmpty),
  lifecycle: Schema.Literal("failed"),
  nonClaim: NonEmpty,
  observedAt: Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u)),
  priorCandidate: Schema.Struct({
    digest: Schema.Literal(failedCandidateDigest),
    identity: NonEmpty,
    limitation: NonEmpty,
    strongestReproducibleIdentity: Schema.Struct({
      failedFeedbackPath: RelativePath,
      targetCommit: Schema.Literal(targetCommit),
    }),
  }),
  provenance: NonEmpty,
  recovery: NonEmpty,
  schemaVersion: Schema.Literal(1),
  targetCommit: Schema.Literal(targetCommit),
  taskId: Schema.Literal("HGI-206"),
});
export type Failed = typeof Failed.Type;

export class Hgi206CommandError extends Schema.TaggedErrorClass<Hgi206CommandError>()(
  "Hgi206CommandError",
  { exitCode: Schema.Number, target: NonEmpty }
) {}

export class Hgi206InputError extends Schema.TaggedErrorClass<Hgi206InputError>()(
  "Hgi206InputError",
  { target: NonEmpty }
) {}

export class Hgi206InvariantError extends Schema.TaggedErrorClass<Hgi206InvariantError>()(
  "Hgi206InvariantError",
  {
    detailsPath: RelativePath,
    invariant: NonEmpty,
    postcondition: NonEmpty,
    recovery: NonEmpty,
    target: NonEmpty,
  }
) {}

export const forbiddenClaims: readonly Fixture[] = [
  {
    claim: "owner=docs/legacy-owner.md",
    id: "stale-owner",
    invariant: "current router rejects stale owner",
    nonClaim: "No external owner is queried.",
    owner: "docs/README.md",
    recovery: "route to current router",
    target: "docs/README.md",
  },
  {
    claim: "command=bun run retired:journey",
    id: "stale-command",
    invariant: "scenario rejects retired command",
    nonClaim: "No command executes.",
    owner: "tools/evals/hgi-206-scenarios.json",
    recovery: "use journey command",
    target: "tools/evals/hgi-206-scenarios.json",
  },
  {
    claim: "proof=static-search",
    id: "imitation-proof",
    invariant: "journey requires named boundary oracle",
    nonClaim: "No runtime is invoked.",
    owner: "docs/verification/critical-journeys.json",
    recovery: "use boundary receipt",
    target: "docs/verification/critical-journeys.json",
  },
  {
    claim: "identity=latest",
    id: "mutable-artifact-identity",
    invariant: "proof rejects mutable/candidate/tmp/failed identity",
    nonClaim: "No release evidence changes.",
    owner: "docs/runbooks/release-readiness.md",
    recovery: "use immutable accepted identity",
    target: "docs/runbooks/release-readiness.md",
  },
  {
    claim: "evidence=raw-log",
    id: "raw-unbounded-evidence",
    invariant: "evidence requires bounded sanitized receipt/detail",
    nonClaim: "No raw log retained.",
    owner: "docs/verification/effectiveness.md",
    recovery: "write bounded evidence",
    target: "docs/verification/effectiveness.md",
  },
  {
    claim: "action=rerun-consequential",
    id: "unsafe-rerun",
    invariant: "failure stops consequential rerun",
    nonClaim: "No operation reruns.",
    owner: "docs/operations/authority-model.md",
    recovery: "stop and escalate",
    target: "docs/operations/authority-model.md",
  },
  {
    claim: "principal=unknown",
    id: "unknown-principal-authority-expansion",
    invariant: "unknown principal cannot expand authority",
    nonClaim: "No authority granted.",
    owner: "docs/operations/authority-model.md",
    recovery: "name authority receipt",
    target: "docs/operations/authority-model.md",
  },
  {
    claim: "procedure=duplicate",
    id: "duplicated-runbook",
    invariant: "procedure has one target-owned runbook",
    nonClaim: "No runbook action occurs.",
    owner: "docs/runbooks/README.md",
    recovery: "remove duplicate",
    target: "docs/runbooks/README.md",
  },
  {
    claim: "recovery=",
    id: "missing-recovery",
    invariant: "failure evidence names recovery and owner",
    nonClaim: "No recovery claimed.",
    owner: "docs/verification/effectiveness.md",
    recovery: "add recovery owner",
    target: "docs/verification/effectiveness.md",
  },
  {
    claim: "rollback-escalation=missing",
    id: "missing-rollback-escalation",
    invariant: "consequential runbook requires rollback and escalation",
    nonClaim: "No operation authorised.",
    owner: "docs/runbooks/README.md",
    recovery: "add rollback and escalation",
    target: "docs/runbooks/README.md",
  },
  {
    claim: "clock=estimated",
    id: "invented-timing",
    invariant: "four clocks reject inferred timing",
    nonClaim: "No timing measured.",
    owner: "docs/verification/effectiveness.md",
    recovery: "record null or direct telemetry",
    target: "docs/verification/effectiveness.md",
  },
  {
    claim: "input=unchecked",
    id: "unchecked-boundary-input",
    invariant: "boundary input is Schema-decoded",
    nonClaim: "No provider contacted.",
    owner: "docs/architecture/effect-services.md",
    recovery: "decode at boundary",
    target: "docs/architecture/effect-services.md",
  },
  {
    claim: "policy=instanceof",
    id: "instanceof-policy",
    invariant: "provider policy rejects instanceof",
    nonClaim: "No SDK call occurs.",
    owner: "AGENTS.md",
    recovery: "map tagged error",
    target: "AGENTS.md",
  },
  {
    claim: "runtime=nested",
    id: "nested-runtime",
    invariant: "runtime execution stays at entrypoint",
    nonClaim: "No Effect executes.",
    owner: "AGENTS.md",
    recovery: "return composed Effect",
    target: "AGENTS.md",
  },
  {
    claim: "module=helper/common/utils",
    id: "helper-common-utils-sprawl",
    invariant: "one-use transformation rejects helper/common/utils sprawl",
    nonClaim: "No implementation changes.",
    owner: "AGENTS.md",
    recovery: "inline transformation",
    target: "AGENTS.md",
  },
];
