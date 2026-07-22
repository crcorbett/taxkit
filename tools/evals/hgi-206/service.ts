import { Effect } from "effect";

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
  hashes: ReadonlyMap<string, string>
) =>
  members
    .toSorted((left, right) => {
      if (left.path < right.path) {
        return -1;
      }
      if (left.path > right.path) {
        return 1;
      }
      return 0;
    })
    .map((member) => `${hashes.get(member.path)}  ${member.path}\n`)
    .join("");

export interface Hgi206Evidence {
  readonly candidate: Candidate;
  readonly changedPathDigest: string;
  readonly changedPaths: readonly string[];
  readonly failed: Failed;
  readonly fixtures: FixtureCorpus;
  readonly hashes: ReadonlyMap<string, string>;
  readonly manifest: Manifest;
  readonly observations: ObservationCorpus;
  readonly receipts: ReadonlyMap<string, Receipt>;
  readonly results: Results;
  readonly scenarios: Scenarios;
  readonly journeyDetails: ReadonlyMap<string, JourneyDetail>;
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
  contradictionPredicates.some((predicate) => predicate(fixture)) &&
  forbiddenClaims.some(
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

const sorted = (values: readonly string[]) => values.toSorted();
const samePaths = (left: readonly string[], right: readonly string[]) =>
  JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
const isSorted = (values: readonly string[]) =>
  JSON.stringify(values) === JSON.stringify(sorted(values));

const validateManifest = (evidence: Hgi206Evidence) => {
  const membersMatch = evidence.manifest.files.every(
    (member) => evidence.hashes.get(member.path) === member.sha256
  );
  const memberPaths = evidence.manifest.files.map((member) => member.path);
  const exclusionsMatch =
    evidence.manifest.exclusions.length === derivedExclusions.length &&
    evidence.manifest.exclusions.every((exclusion) =>
      derivedExclusions.some(
        (expected) =>
          expected.path === exclusion.path &&
          expected.reason === exclusion.reason
      )
    );
  const sourcesMatch =
    samePaths(memberPaths, canonicalSourcePaths) &&
    isSorted(memberPaths) &&
    new Set(memberPaths).size === memberPaths.length;

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
  const ledgerPaths = evidence.candidate.impactLedger.flatMap(
    (entry) => entry.paths
  );
  const ledgerSurfaces = evidence.candidate.impactLedger.map(
    (entry) => entry.surface
  );

  return evidence.manifest.changedPathDigest === evidence.changedPathDigest &&
    samePaths(evidence.manifest.changedPaths, evidence.changedPaths) &&
    isSorted(evidence.manifest.changedPaths) &&
    new Set(evidence.manifest.changedPaths).size ===
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
  result: Result | undefined,
  observation: ContradictionObservation | undefined,
  observationHash: string | undefined
) =>
  result &&
  observation &&
  observationHash &&
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
  observation: ContradictionObservation | undefined,
  fixture: Fixture
) =>
  observation &&
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
  result: Result | undefined,
  observation: ContradictionObservation | undefined,
  observationHash: string | undefined
) =>
  resultMatchesObservation(result, observation, observationHash) &&
  observationMatchesFixture(observation, fixture) &&
  isTypedForbiddenClaim(fixture);

const validateContradictions = (evidence: Hgi206Evidence) => {
  const observationHash = evidence.hashes.get(hgi206Paths.observations);
  const hasExactCoverage =
    evidence.fixtures.fixtures.length === 15 &&
    evidence.observations.observations.length === 15 &&
    evidence.results.results.length === 15 &&
    forbiddenClaims.length === 15;
  const fixtureIds = evidence.fixtures.fixtures.map((fixture) => fixture.id);
  const observationIds = evidence.observations.observations.map(
    (observation) => observation.fixtureId
  );
  const resultIds = evidence.results.results.map((result) => result.id);
  const uniqueCoverage =
    new Set(fixtureIds).size === 15 &&
    new Set(observationIds).size === 15 &&
    new Set(resultIds).size === 15 &&
    samePaths(
      fixtureIds,
      forbiddenClaims.map((fixture) => fixture.id)
    ) &&
    samePaths(observationIds, fixtureIds) &&
    samePaths(resultIds, fixtureIds);
  const allObserved = evidence.fixtures.fixtures.every((fixture) =>
    validateObservation(
      fixture,
      evidence.results.results.find((result) => result.id === fixture.id),
      evidence.observations.observations.find(
        (observation) => observation.fixtureId === fixture.id
      ),
      observationHash
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
  const receiptBindings = candidate.evidence.receipts.every(
    (receipt) => evidence.hashes.get(receipt.path) === receipt.sha256
  );
  const candidateReceiptPaths = candidate.evidence.receipts.map(
    (receipt) => receipt.path
  );
  const sourceDigest = evidence.manifest.digest;
  const sourcesMatch =
    candidate.target.sourceDigest === sourceDigest &&
    evidence.results.target.sourceDigest === sourceDigest;
  const evidenceMatches =
    candidate.evidence.failedAttempt.sha256 ===
      evidence.hashes.get(hgi206Paths.failed) &&
    candidate.evidence.fixtures.sha256 ===
      evidence.hashes.get(hgi206Paths.fixtures) &&
    candidate.evidence.observations.sha256 ===
      evidence.hashes.get(hgi206Paths.observations) &&
    candidate.evidence.results.sha256 ===
      evidence.hashes.get(hgi206Paths.results);

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
  receipt: Receipt | undefined,
  detail: JourneyDetail | undefined,
  detailHash: string | undefined,
  sourceDigest: string
) =>
  receipt &&
  detail &&
  detailHash &&
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
    evidence.receipts.size === 5 &&
    evidence.scenarios.journeys.length === 5 &&
    evidence.candidate.evidence.receipts.length === 5;
  const journeyReceiptPaths = evidence.scenarios.journeys.map(
    (journey) => journey.receipt
  );
  const receiptDetailPaths = [...evidence.receipts.values()].map(
    (receipt) => receipt.detailPath
  );
  const exactPaths =
    samePaths(journeyReceiptPaths, receiptPaths) &&
    journeyReceiptPaths.length === receiptPaths.length &&
    samePaths(receiptDetailPaths, detailPaths) &&
    receiptDetailPaths.length === detailPaths.length;
  const allJourneysBind = evidence.scenarios.journeys.every((journey) => {
    const receipt = evidence.receipts.get(journey.receipt);
    const detail = receipt
      ? evidence.journeyDetails.get(receipt.detailPath)
      : undefined;
    const detailHash = receipt
      ? evidence.hashes.get(receipt.detailPath)
      : undefined;

    return validateJourney(
      journey,
      receipt,
      detail,
      detailHash,
      evidence.manifest.digest
    );
  });

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
  const allClocksAreNull = clocks.every((clock) => clock.value === null);
  const clockReasonsAreHonest = clocks.every((clock) =>
    clock.reason.includes("not directly measured")
  );
  const skillSourceIds = evidence.candidate.epoch.skills.map(
    (skill) => skill.sourceId
  );
  const toolNames = evidence.candidate.epoch.tools.map((tool) => tool.name);
  const runtimeNames = evidence.candidate.epoch.runtime.map(
    (runtime) => runtime.name
  );
  const hasEpochEvidence =
    evidence.candidate.epoch.worker !==
      evidence.candidate.epoch.integrationOwner &&
    evidence.candidate.epoch.skills.length === expectedEpochSkills.length &&
    evidence.candidate.epoch.skills.every((skill) =>
      expectedEpochSkills.some(
        (expected) =>
          expected.sha256 === skill.sha256 &&
          expected.sourceId === skill.sourceId &&
          expected.sourceRevision === skill.sourceRevision
      )
    ) &&
    samePaths(
      skillSourceIds,
      expectedEpochSkills.map((skill) => skill.sourceId)
    ) &&
    evidence.hashes.get(".agents/skills/docs-maintainer/SKILL.md") ===
      expectedEpochSkills.find((skill) =>
        skill.sourceId.startsWith("repository:")
      )?.sha256 &&
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
