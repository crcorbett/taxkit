import {
  Array,
  Effect,
  Equivalence,
  HashMap,
  HashSet,
  Option,
  Order,
} from "effect";
import { sort } from "effect/Array";

import {
  canonicalSourcePaths,
  derivedExclusions,
  detailPaths,
  expectedEpochSkills,
  forbiddenClaims,
  hgi206Paths,
  Hgi206InvariantError,
  impactSurfaces,
  receiptPaths,
} from "./schemas.js";
import type {
  Artifact,
  Candidate,
  ContradictionObservation,
  Failed,
  Fixture,
  FixtureCorpus,
  Journey,
  JourneyDetail,
  Manifest,
  ObservationCorpus,
  Receipt,
  Result,
  Results,
  Scenarios,
} from "./schemas.js";

export const renderManifestAggregateSource = (
  members: readonly Artifact[],
  hashes: HashMap.HashMap<string, string>
) =>
  Effect.forEach(
    sort(
      members,
      Order.mapInput(Order.String, (member: Artifact) => member.path)
    ),
    (member) =>
      HashMap.get(hashes, member.path).pipe(
        Option.match({
          onNone: () =>
            Effect.fail(
              new Hgi206InvariantError({
                detailsPath: hgi206Paths.manifest,
                invariant: "manifest-member-hashes",
                postcondition:
                  "all canonical manifest members have checked hashes before rendering",
                recovery:
                  "restore the exact hash for each canonical source member",
                target: member.path,
              })
            ),
          onSome: (hash) => Effect.succeed(`${hash}  ${member.path}\n`),
        })
      )
  ).pipe(Effect.map((rows) => rows.join("")));

export interface Hgi206Evidence {
  readonly candidate: Candidate;
  readonly changedPathDigest: string;
  readonly changedPaths: readonly string[];
  readonly failed: Failed;
  readonly fixtures: FixtureCorpus;
  readonly hashes: HashMap.HashMap<string, string>;
  readonly manifest: Manifest;
  readonly observations: ObservationCorpus;
  readonly receipts: HashMap.HashMap<string, Receipt>;
  readonly results: Results;
  readonly scenarios: Scenarios;
  readonly journeyDetails: HashMap.HashMap<string, JourneyDetail>;
  readonly manifestAggregate: string;
}

export interface Hgi206Report {
  readonly changedPathDigest: string;
  readonly manifestDigest: string;
  readonly resultCount: number;
}

type ContradictionPredicate = (fixture: Fixture) => boolean;

const staleOwner = (fixture: Fixture) =>
  fixture.id === "stale-owner" &&
  fixture.claim === "owner=docs/legacy-owner.md";
const staleCommand = (fixture: Fixture) =>
  fixture.id === "stale-command" &&
  fixture.claim === "command=bun run retired:journey";
const imitationProof = (fixture: Fixture) =>
  fixture.id === "imitation-proof" && fixture.claim === "proof=static-search";
const mutableArtifactIdentity = (fixture: Fixture) =>
  fixture.id === "mutable-artifact-identity" &&
  fixture.claim === "identity=latest";
const rawUnboundedEvidence = (fixture: Fixture) =>
  fixture.id === "raw-unbounded-evidence" &&
  fixture.claim === "evidence=raw-log";
const unsafeRerun = (fixture: Fixture) =>
  fixture.id === "unsafe-rerun" &&
  fixture.claim === "action=rerun-consequential";
const unknownPrincipalAuthorityExpansion = (fixture: Fixture) =>
  fixture.id === "unknown-principal-authority-expansion" &&
  fixture.claim === "principal=unknown";
const duplicatedRunbook = (fixture: Fixture) =>
  fixture.id === "duplicated-runbook" &&
  fixture.claim === "procedure=duplicate";
const missingRecovery = (fixture: Fixture) =>
  fixture.id === "missing-recovery" && fixture.claim === "recovery=";
const missingRollbackEscalation = (fixture: Fixture) =>
  fixture.id === "missing-rollback-escalation" &&
  fixture.claim === "rollback-escalation=missing";
const inventedTiming = (fixture: Fixture) =>
  fixture.id === "invented-timing" && fixture.claim === "clock=estimated";
const uncheckedBoundaryInput = (fixture: Fixture) =>
  fixture.id === "unchecked-boundary-input" &&
  fixture.claim === "input=unchecked";
const instanceofPolicy = (fixture: Fixture) =>
  fixture.id === "instanceof-policy" && fixture.claim === "policy=instanceof";
const nestedRuntime = (fixture: Fixture) =>
  fixture.id === "nested-runtime" && fixture.claim === "runtime=nested";
const helperCommonUtilsSprawl = (fixture: Fixture) =>
  fixture.id === "helper-common-utils-sprawl" &&
  fixture.claim === "module=helper/common/utils";

const contradictionPredicates: readonly ContradictionPredicate[] = [
  staleOwner,
  staleCommand,
  imitationProof,
  mutableArtifactIdentity,
  rawUnboundedEvidence,
  unsafeRerun,
  unknownPrincipalAuthorityExpansion,
  duplicatedRunbook,
  missingRecovery,
  missingRollbackEscalation,
  inventedTiming,
  uncheckedBoundaryInput,
  instanceofPolicy,
  nestedRuntime,
  helperCommonUtilsSprawl,
];

export const isTypedForbiddenClaim = (fixture: Fixture) =>
  Array.some(contradictionPredicates, (predicate) => predicate(fixture)) &&
  Array.some(
    forbiddenClaims,
    (claim) =>
      claim.claim === fixture.claim &&
      claim.id === fixture.id &&
      claim.invariant === fixture.invariant &&
      claim.nonClaim === fixture.nonClaim &&
      claim.owner === fixture.owner &&
      claim.recovery === fixture.recovery &&
      claim.target === fixture.target
  );

const fail = (
  invariant: string,
  target: string,
  recovery: string,
  detailsPath: string,
  postcondition: string
) =>
  Effect.fail(
    new Hgi206InvariantError({
      detailsPath,
      invariant,
      postcondition,
      recovery,
      target,
    })
  );

const sorted = (values: readonly string[]) => sort(values, Order.String);
const samePaths = (left: readonly string[], right: readonly string[]) =>
  Equivalence.Array(Equivalence.String)(sorted(left), sorted(right));
const isSorted = (values: readonly string[]) =>
  Equivalence.Array(Equivalence.String)(values, sorted(values));

const validateManifest = (evidence: Hgi206Evidence) => {
  const membersMatch = Array.every(evidence.manifest.files, (member) =>
    HashMap.get(evidence.hashes, member.path).pipe(
      Option.contains(member.sha256)
    )
  );
  const memberPaths = Array.map(
    evidence.manifest.files,
    (member) => member.path
  );
  const exclusionsMatch =
    evidence.manifest.exclusions.length === derivedExclusions.length &&
    Array.every(evidence.manifest.exclusions, (exclusion) =>
      Array.some(
        derivedExclusions,
        (expected) =>
          expected.path === exclusion.path &&
          expected.reason === exclusion.reason
      )
    );
  const sourcesMatch =
    samePaths(memberPaths, canonicalSourcePaths) &&
    isSorted(memberPaths) &&
    HashSet.size(HashSet.fromIterable(memberPaths)) === memberPaths.length;

  return evidence.manifestAggregate === evidence.manifest.digest &&
    membersMatch &&
    sourcesMatch &&
    exclusionsMatch
    ? Effect.void
    : fail(
        "manifest-member-hashes",
        hgi206Paths.manifest,
        "recompute every canonical source member hash and path-sorted aggregate",
        hgi206Paths.manifest,
        "all canonical manifest members match their exact bytes"
      );
};

const validateChangedPaths = (evidence: Hgi206Evidence) => {
  const ledgerPaths = Array.flatMap(
    evidence.candidate.impactLedger,
    (entry) => entry.paths
  );
  const ledgerSurfaces = Array.map(
    evidence.candidate.impactLedger,
    (entry) => entry.surface
  );

  return evidence.manifest.changedPathDigest === evidence.changedPathDigest &&
    samePaths(evidence.manifest.changedPaths, evidence.changedPaths) &&
    isSorted(evidence.manifest.changedPaths) &&
    HashSet.size(HashSet.fromIterable(evidence.manifest.changedPaths)) ===
      evidence.manifest.changedPaths.length &&
    samePaths(ledgerPaths, evidence.changedPaths) &&
    ledgerPaths.length === evidence.changedPaths.length &&
    samePaths(ledgerSurfaces, impactSurfaces) &&
    ledgerSurfaces.length === impactSurfaces.length
    ? Effect.void
    : fail(
        "untracked-inclusive-changed-paths",
        hgi206Paths.manifest,
        "refresh the exact git-status path manifest and complete impact ledger after files stabilize",
        hgi206Paths.candidate,
        "tracked and untracked HGI-206 paths have one exact impact-ledger row"
      );
};

const resultMatchesObservation = (
  result: Result,
  observation: ContradictionObservation,
  observationHash: string
) =>
  result.detailSha256 === observationHash &&
  result.detailPath === hgi206Paths.observations &&
  result.exitCode === observation.exitCode &&
  result.id === observation.fixtureId &&
  result.invariant === observation.invariant &&
  result.nonClaim === observation.nonClaim &&
  result.observedAt === observation.observedAt &&
  result.owner === observation.owner &&
  result.postcondition === observation.postcondition &&
  result.recovery === observation.recovery &&
  result.status === observation.status &&
  result.target === observation.target;

const observationMatchesFixture = (
  observation: ContradictionObservation,
  fixture: Fixture
) =>
  observation.fixtureId === fixture.id &&
  observation.invariant === fixture.invariant &&
  observation.nonClaim === fixture.nonClaim &&
  observation.owner === fixture.owner &&
  observation.postcondition ===
    `The ${fixture.id} contradiction was rejected by the local typed evaluator.` &&
  observation.recovery === fixture.recovery &&
  observation.target === fixture.target;

const validateObservation = (
  fixture: Fixture,
  result: Result,
  observation: ContradictionObservation,
  observationHash: string
) =>
  resultMatchesObservation(result, observation, observationHash) &&
  observationMatchesFixture(observation, fixture) &&
  isTypedForbiddenClaim(fixture);

const validateContradictions = (evidence: Hgi206Evidence) => {
  const observationHash = HashMap.get(
    evidence.hashes,
    hgi206Paths.observations
  );
  const hasExactCoverage =
    evidence.fixtures.fixtures.length === 15 &&
    evidence.observations.observations.length === 15 &&
    evidence.results.results.length === 15 &&
    forbiddenClaims.length === 15;
  const fixtureIds = Array.map(
    evidence.fixtures.fixtures,
    (fixture) => fixture.id
  );
  const observationIds = Array.map(
    evidence.observations.observations,
    (observation) => observation.fixtureId
  );
  const resultIds = Array.map(evidence.results.results, (result) => result.id);
  const uniqueCoverage =
    HashSet.size(HashSet.fromIterable(fixtureIds)) === 15 &&
    HashSet.size(HashSet.fromIterable(observationIds)) === 15 &&
    HashSet.size(HashSet.fromIterable(resultIds)) === 15 &&
    samePaths(
      fixtureIds,
      Array.map(forbiddenClaims, (fixture) => fixture.id)
    ) &&
    samePaths(observationIds, fixtureIds) &&
    samePaths(resultIds, fixtureIds);
  const allObserved = Array.every(evidence.fixtures.fixtures, (fixture) =>
    Option.all([
      Array.findFirst(
        evidence.results.results,
        (result) => result.id === fixture.id
      ),
      Array.findFirst(
        evidence.observations.observations,
        (observation) => observation.fixtureId === fixture.id
      ),
      observationHash,
    ]).pipe(
      Option.exists(
        ([result, observation, hash]) =>
          validateObservation(fixture, result, observation, hash) === true
      )
    )
  );

  return hasExactCoverage && uniqueCoverage && allObserved
    ? Effect.void
    : fail(
        "bounded-contradiction-observation",
        hgi206Paths.observations,
        "derive exactly one typed result row and observation from each forbidden claim",
        hgi206Paths.results,
        "all fifteen seeded contradictions have one typed local rejection"
      );
};

const validateCandidateEvidence = (evidence: Hgi206Evidence) => {
  const { candidate } = evidence;
  const receiptBindings = Array.every(candidate.evidence.receipts, (receipt) =>
    HashMap.get(evidence.hashes, receipt.path).pipe(
      Option.contains(receipt.sha256)
    )
  );
  const candidateReceiptPaths = Array.map(
    candidate.evidence.receipts,
    (receipt) => receipt.path
  );
  const sourceDigest = evidence.manifest.digest;
  const sourcesMatch =
    candidate.target.sourceDigest === sourceDigest &&
    evidence.results.target.sourceDigest === sourceDigest;
  const evidenceMatches =
    HashMap.get(evidence.hashes, hgi206Paths.failed).pipe(
      Option.contains(candidate.evidence.failedAttempt.sha256)
    ) &&
    HashMap.get(evidence.hashes, hgi206Paths.fixtures).pipe(
      Option.contains(candidate.evidence.fixtures.sha256)
    ) &&
    HashMap.get(evidence.hashes, hgi206Paths.observations).pipe(
      Option.contains(candidate.evidence.observations.sha256)
    ) &&
    HashMap.get(evidence.hashes, hgi206Paths.results).pipe(
      Option.contains(candidate.evidence.results.sha256)
    );

  return sourcesMatch &&
    evidenceMatches &&
    receiptBindings &&
    samePaths(candidateReceiptPaths, receiptPaths) &&
    candidateReceiptPaths.length === receiptPaths.length
    ? Effect.void
    : fail(
        "candidate-evidence-binding",
        hgi206Paths.candidate,
        "recompute transitive evidence hashes then bind the candidate last",
        hgi206Paths.candidate,
        "candidate references final manifest, fixture, result, failure, and receipt bytes"
      );
};

const validateJourney = (
  journey: Journey,
  receipt: Receipt,
  detail: JourneyDetail,
  detailHash: string,
  sourceDigest: string
) =>
  receipt.candidate.sourceDigest === sourceDigest &&
  receipt.command === journey.command &&
  receipt.detailSha256 === detailHash &&
  receipt.exitCode === detail.exitCode &&
  receipt.journeyId === journey.id &&
  receipt.nonClaim === journey.nonClaim &&
  receipt.observedAt === detail.observedAt &&
  receipt.oracle === journey.oracle &&
  receipt.owner === journey.owner &&
  receipt.recovery === journey.recovery &&
  detail.command === journey.command &&
  detail.journeyId === journey.id &&
  detail.nonClaim === journey.nonClaim &&
  detail.oracle === journey.oracle &&
  detail.owner === journey.owner &&
  detail.recovery === journey.recovery;

const validateJourneys = (evidence: Hgi206Evidence) => {
  const hasFiveReceipts =
    HashMap.size(evidence.receipts) === 5 &&
    evidence.scenarios.journeys.length === 5 &&
    evidence.candidate.evidence.receipts.length === 5;
  const journeyReceiptPaths = Array.map(
    evidence.scenarios.journeys,
    (journey) => journey.receipt
  );
  const receiptDetailPaths = Array.map(
    Array.fromIterable(HashMap.values(evidence.receipts)),
    (receipt) => receipt.detailPath
  );
  const exactPaths =
    samePaths(journeyReceiptPaths, receiptPaths) &&
    journeyReceiptPaths.length === receiptPaths.length &&
    samePaths(receiptDetailPaths, detailPaths) &&
    receiptDetailPaths.length === detailPaths.length;
  const allJourneysBind = Array.every(evidence.scenarios.journeys, (journey) =>
    HashMap.get(evidence.receipts, journey.receipt).pipe(
      Option.flatMap((receipt) =>
        Option.all([
          Option.some(receipt),
          HashMap.get(evidence.journeyDetails, receipt.detailPath),
          HashMap.get(evidence.hashes, receipt.detailPath),
        ])
      ),
      Option.exists(
        ([receipt, detail, hash]) =>
          validateJourney(
            journey,
            receipt,
            detail,
            hash,
            evidence.manifest.digest
          ) === true
      )
    )
  );

  return hasFiveReceipts && exactPaths && allJourneysBind
    ? Effect.void
    : fail(
        "journey-receipt-binding",
        hgi206Paths.candidate,
        "bind every scenario journey to its receipt and bounded detail fields",
        hgi206Paths.candidate,
        "all five journeys bind command, owner, oracle, receipt, recovery, and non-claim"
      );
};

const validateHonestEpoch = (evidence: Hgi206Evidence) => {
  const clocks = [
    evidence.candidate.clocks.acceptedOutcome,
    evidence.candidate.clocks.humanAttention,
    evidence.candidate.clocks.workerFeedback,
    evidence.candidate.clocks.workerWallClock,
  ];
  const allClocksAreNull = Array.every(clocks, (clock) => clock.value === null);
  const clockReasonsAreHonest = Array.every(clocks, (clock) =>
    clock.reason.includes("not directly measured")
  );
  const skillSourceIds = Array.map(
    evidence.candidate.epoch.skills,
    (skill) => skill.sourceId
  );
  const toolNames = Array.map(
    evidence.candidate.epoch.tools,
    (tool) => tool.name
  );
  const runtimeNames = Array.map(
    evidence.candidate.epoch.runtime,
    (runtime) => runtime.name
  );
  const hasEpochEvidence =
    evidence.candidate.epoch.worker !==
      evidence.candidate.epoch.integrationOwner &&
    evidence.candidate.epoch.skills.length === expectedEpochSkills.length &&
    Array.every(evidence.candidate.epoch.skills, (skill) =>
      Array.some(
        expectedEpochSkills,
        (expected) =>
          expected.sha256 === skill.sha256 &&
          expected.sourceId === skill.sourceId &&
          expected.sourceRevision === skill.sourceRevision
      )
    ) &&
    samePaths(
      skillSourceIds,
      Array.map(expectedEpochSkills, (skill) => skill.sourceId)
    ) &&
    Option.all([
      HashMap.get(evidence.hashes, ".agents/skills/docs-maintainer/SKILL.md"),
      Array.findFirst(expectedEpochSkills, (skill) =>
        skill.sourceId.startsWith("repository:")
      ),
    ]).pipe(Option.exists(([hash, skill]) => hash === skill.sha256)) &&
    samePaths(toolNames, ["bun", "deno", "git", "ripgrep"]) &&
    toolNames.length === 4 &&
    samePaths(runtimeNames, ["Effect", "TaxKit workspace"]) &&
    runtimeNames.length === 2;

  return allClocksAreNull && clockReasonsAreHonest && hasEpochEvidence
    ? Effect.void
    : fail(
        "honest-null-clocks-epoch",
        hgi206Paths.candidate,
        "retain null for unmeasured clocks and bind epoch source artifacts by hash",
        hgi206Paths.candidate,
        "every clock is directly measured or honestly null and epoch inputs are immutable"
      );
};

export const validateHgi206Evidence = (evidence: Hgi206Evidence) =>
  Effect.all(
    [
      validateManifest(evidence),
      validateChangedPaths(evidence),
      validateContradictions(evidence),
      validateCandidateEvidence(evidence),
      validateJourneys(evidence),
      validateHonestEpoch(evidence),
    ],
    { concurrency: 1 }
  ).pipe(
    Effect.as({
      changedPathDigest: evidence.manifest.changedPathDigest,
      manifestDigest: evidence.manifest.digest,
      resultCount: evidence.results.results.length,
    })
  );
