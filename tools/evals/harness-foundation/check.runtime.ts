import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array,
  Console,
  Effect,
  Match,
  Option,
  Record as EffectRecord,
  Stream,
  Schema,
} from "effect";
import { Command } from "effect/cli";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { CriticalJourneyInventory } from "../../governance/schemas.js";
import {
  hashEpochBytes,
  decodeGitText,
  readEpochJson,
  repositoryRootFromUrl,
  restoreChangedPaths,
} from "./input.boundary.js";
import {
  candidateCommit,
  candidateTree,
  EpochCandidate,
  EpochCommandError,
  EpochInputError,
  EpochInvariantError,
  epochPaths,
  EpochValidation,
  failedAttemptPaths,
  IndependentReview,
  independentReviewCheckNames,
  JourneyReceipt,
  migrationBaseCommit,
  receiptPaths,
  Scenarios,
  SourceManifest,
  validationCheckNames,
} from "./schemas.js";
import type { JourneyId } from "./schemas.js";
import { CanonicalSkillBaseline } from "./skill-receipt.schema.js";

const repositoryRootUrl = new URL("../../..", import.meta.url);
const requiredJourneyIds = [
  "taxkit-calculator-direct",
  "taxkit-sdk-packed",
  "taxkit-http-api",
  "taxkit-docs-runtime",
  "taxkit-release-closure",
];
const forbiddenMigrationPrefixes = [
  ".changeset/",
  ".github/workflows/",
  ".github/workflows/quality.yml",
  "apps/",
  "docs/operations/authority-model.md",
  "docs/operations/automation-register.md",
  "docs/runbooks/",
  "docs/standards/controls.md",
  "docs/documentation-audit/HGI-203",
  "docs/documentation-audit/HGI-204",
  "docs/documentation-audit/HGI-205",
  "docs/documentation-audit/HGI-206",
  "docs/documentation-audit/hgi-206/",
  "docs/evidence/releases/HGI-203",
  "docs/verification/critical-journeys.json",
  "packages/",
  "tools/documentation/owner-policy.json",
  "tools/documentation/runbook-",
  "tools/evals/hgi-206",
  "tools/quality-workflow/",
];
const canonicalSkillReceiptPath = "tools/skills/canonical-skill-baseline.json";
const criticalJourneyOwnerPath = "docs/verification/critical-journeys.json";
const requiredSourceArtifacts = [
  canonicalSkillReceiptPath,
  "docs/verification/repository-harness-profile.json",
  "tools/governance/check.runtime.ts",
  "tools/governance/input.boundary.ts",
  "tools/governance/policy.ts",
  "tools/governance/schemas.ts",
  criticalJourneyOwnerPath,
  "tools/evals/harness-foundation-scenarios.json",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/evals/harness-foundation/input.boundary.ts",
  "tools/evals/harness-foundation/schemas.ts",
];
const expectedJourneyCommands = {
  "taxkit-calculator-direct": "bun run test",
  "taxkit-docs-runtime":
    "bun run docs:validate && bun run --filter=docs test:browser",
  "taxkit-http-api": "bun run --filter=api smoke",
  "taxkit-release-closure": "bun run release:check -- --ci",
  "taxkit-sdk-packed":
    "bun run --filter=@taxkit/sdk check-packed-artifact && bun run --filter=@taxkit/sdk validate:downstream",
} satisfies Readonly<Record<JourneyId, string>>;
const externalBoundaries = [
  "push",
  "hosted CI",
  "registry",
  "release",
  "deployment",
  "provider",
  "public-site",
  "external-consumer",
];

const readHash = (repositoryRoot: string, target: string) =>
  Effect.gen(function* readEpochArtifactHash() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const bytes = yield* fileSystem
      .readFile(path.join(repositoryRoot, target))
      .pipe(Effect.mapError(() => new EpochInputError({ target })));
    return yield* hashEpochBytes(bytes);
  });

const runGit = (
  repositoryRoot: string,
  arguments_: readonly string[],
  target: string
) =>
  Effect.gen(function* runEpochGitCommand() {
    const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* childProcesses.spawn(
      ChildProcess.make("git", arguments_, {
        cwd: repositoryRoot,
        stderr: "pipe",
        stdin: "ignore",
        stdout: "pipe",
      })
    );
    const [stdout, [exitCode]] = yield* Effect.all(
      [
        Stream.runCollect(handle.stdout),
        Effect.zip(handle.exitCode, Stream.runDrain(handle.stderr), {
          concurrent: true,
        }),
      ],
      { concurrency: 1 }
    );
    yield* Match.value(Number(exitCode)).pipe(
      Match.when(0, () => Effect.void),
      Match.orElse((code) =>
        Effect.fail(new EpochCommandError({ exitCode: code, target }))
      )
    );
    return Uint8Array.from(Array.flatMap(stdout, Array.fromIterable));
  }).pipe(Effect.scoped);

const requireInvariant = (
  condition: boolean,
  invariant: string,
  target: string,
  recovery: string
) =>
  condition
    ? Effect.void
    : Effect.fail(new EpochInvariantError({ invariant, recovery, target }));

const hasExactMembers = (
  actual: readonly string[],
  expected: readonly string[]
) =>
  actual.length === expected.length &&
  Array.every(expected, (member) => Array.contains(actual, member));

const manifestMatchesSkillReceipt = (
  manifest: SourceManifest,
  receipt: CanonicalSkillBaseline
) => {
  const skills = EffectRecord.toEntries(receipt.skills);
  const overlays = receipt.allowedOverlays;
  const extras = EffectRecord.toEntries(receipt.extras);
  return (
    manifest.skills.length === skills.length &&
    Array.every(skills, ([id, expected]) =>
      Array.some(
        manifest.skills,
        (actual) =>
          actual.id === id &&
          actual.entryCount === expected.entryCount &&
          actual.treeDigest === expected.treeDigest
      )
    ) &&
    manifest.overlays.length === overlays.length &&
    Array.every(overlays, (expected) =>
      Array.some(
        manifest.overlays,
        (actual) =>
          actual.path === expected.path && actual.sha256 === expected.sha256
      )
    ) &&
    manifest.extras.length === extras.length &&
    Array.every(extras, ([id, expected]) =>
      Array.some(
        manifest.extras,
        (actual) =>
          actual.id === id &&
          actual.classification === expected.classification &&
          actual.entryCount === expected.entryCount &&
          actual.treeDigest === expected.treeDigest
      )
    )
  );
};

const scenariosMatchCriticalJourneys = (
  scenarios: Scenarios,
  inventory: CriticalJourneyInventory
) =>
  hasExactMembers(
    Array.map(inventory.journeys, (journey) => journey.id),
    requiredJourneyIds
  ) &&
  Array.every(scenarios.journeys, (scenario) =>
    Array.findFirst(
      inventory.journeys,
      (journey) => journey.id === scenario.id
    ).pipe(
      Option.exists(
        (canonical) =>
          EffectRecord.get(expectedJourneyCommands, scenario.id).pipe(
            Option.contains(scenario.command)
          ) &&
          scenario.owner === `${criticalJourneyOwnerPath}#${scenario.id}` &&
          scenario.oracle === canonical.oracle &&
          Array.some(
            canonical.nonClaims,
            (nonClaim) => nonClaim.trim() === scenario.nonClaim.trim()
          )
      )
    )
  );

export const checkHarnessFoundationEpoch = (repositoryRoot: string) =>
  // oxlint-disable-next-line complexity -- each evidence identity, preserved surface, clock, and non-claim is an explicit fail-closed epoch invariant.
  Effect.gen(function* checkHarnessFoundationEpochProgram() {
    const manifest = yield* readEpochJson(
      repositoryRoot,
      epochPaths.manifest,
      SourceManifest
    );
    const scenarios = yield* readEpochJson(
      repositoryRoot,
      epochPaths.scenarios,
      Scenarios
    );
    const canonicalSkillReceipt = yield* runGit(
      repositoryRoot,
      ["show", `${candidateCommit}:${canonicalSkillReceiptPath}`],
      canonicalSkillReceiptPath
    ).pipe(
      Effect.flatMap((bytes) =>
        decodeGitText(canonicalSkillReceiptPath, bytes)
      ),
      Effect.flatMap(
        Schema.decodeUnknownEffect(
          Schema.fromJsonString(CanonicalSkillBaseline)
        )
      )
    );
    const criticalJourneys = yield* readEpochJson(
      repositoryRoot,
      criticalJourneyOwnerPath,
      CriticalJourneyInventory
    );
    const receipts = yield* Effect.forEach(
      receiptPaths,
      (target) =>
        readEpochJson(repositoryRoot, target, JourneyReceipt).pipe(
          Effect.map((receipt) => ({ receipt, target }))
        ),
      { concurrency: 1 }
    );
    const review = yield* readEpochJson(
      repositoryRoot,
      epochPaths.independentReview,
      IndependentReview
    );
    const candidate = yield* readEpochJson(
      repositoryRoot,
      epochPaths.candidate,
      EpochCandidate
    );
    const validation = yield* readEpochJson(
      repositoryRoot,
      epochPaths.validation,
      EpochValidation
    );

    const actualTree = yield* runGit(
      repositoryRoot,
      ["rev-parse", `${candidateCommit}^{tree}`],
      "candidate-tree"
    ).pipe(Effect.flatMap((bytes) => decodeGitText("candidate-tree", bytes)));
    const changedPathBytes = yield* runGit(
      repositoryRoot,
      ["diff", "--name-only", "-z", migrationBaseCommit, candidateCommit, "--"],
      "candidate-changed-paths"
    );
    const changedPaths = yield* restoreChangedPaths(changedPathBytes);
    const changedPathDigest = yield* hashEpochBytes(changedPathBytes);

    yield* requireInvariant(
      actualTree === candidateTree &&
        manifest.candidate.tree === actualTree &&
        candidate.target.tree === actualTree,
      "candidate-identity",
      epochPaths.manifest,
      "Bind the epoch to the exact committed candidate tree."
    );
    yield* requireInvariant(
      manifest.candidate.changedPathCount === changedPaths.length &&
        candidate.target.changedPathCount === changedPaths.length &&
        manifest.candidate.changedPathDigest === changedPathDigest &&
        candidate.target.changedPathDigest === changedPathDigest,
      "changed-path-identity",
      epochPaths.manifest,
      "Recompute the NUL-delimited migration path inventory from Git and refresh the candidate evidence."
    );
    yield* requireInvariant(
      !Array.some(changedPaths, (target) =>
        Array.some(
          forbiddenMigrationPrefixes,
          (prefix) => target === prefix || target.startsWith(prefix)
        )
      ),
      "preserved-surfaces",
      epochPaths.manifest,
      "Keep package, app, public-content, workflow, runbook, authority, control, automation, and release-readiness owners outside the migration."
    );
    yield* requireInvariant(
      hasExactMembers(
        Array.map(manifest.artifacts, (artifact) => artifact.path),
        requiredSourceArtifacts
      ),
      "source-artifact-coverage",
      epochPaths.manifest,
      "Bind exactly the canonical skill receipt, profile, governance validator, critical journeys, and scenario owner."
    );
    yield* requireInvariant(
      manifestMatchesSkillReceipt(manifest, canonicalSkillReceipt),
      "skill-receipt-projection",
      epochPaths.manifest,
      "Project exact canonical skill, overlay, and declared-extra identities from the hashed repository receipt."
    );

    const manifestArtifactHashes = yield* Effect.forEach(
      manifest.artifacts,
      (artifact) =>
        Effect.gen(function* readManifestArtifactHash() {
          if (artifact.path === canonicalSkillReceiptPath) {
            const actual = yield* runGit(
              repositoryRoot,
              ["show", `${candidateCommit}:${artifact.path}`],
              artifact.path
            ).pipe(Effect.flatMap(sha256));
            return { actual, artifact };
          }
          const actual = yield* readHash(repositoryRoot, artifact.path);
          return { actual, artifact };
        }),
      { concurrency: 4 }
    );
    yield* requireInvariant(
      Array.every(
        manifestArtifactHashes,
        ({ actual, artifact }) => actual === artifact.sha256
      ),
      "source-artifact-identity",
      epochPaths.manifest,
      "Restore every profile, receipt, validator, journey, and scenario artifact to its recorded digest."
    );

    const scenarioJourneyIds = Array.map(
      scenarios.journeys,
      (journey) => journey.id
    );
    yield* requireInvariant(
      hasExactMembers(scenarioJourneyIds, requiredJourneyIds),
      "scenario-coverage",
      epochPaths.scenarios,
      "Retain exactly the five TaxKit critical journeys."
    );
    yield* requireInvariant(
      scenariosMatchCriticalJourneys(scenarios, criticalJourneys),
      "critical-journey-projection",
      epochPaths.scenarios,
      "Project exact journey IDs, commands, owner anchors, oracles, and non-claims from the hashed canonical journey owner."
    );
    yield* requireInvariant(
      receipts.length === scenarios.journeys.length &&
        hasExactMembers(
          Array.map(receipts, ({ receipt }) => receipt.journeyId),
          requiredJourneyIds
        ) &&
        Array.every(receipts, ({ receipt, target }) =>
          Array.some(
            scenarios.journeys,
            (journey) =>
              journey.id === receipt.journeyId &&
              journey.command === receipt.command &&
              journey.receipt === target &&
              receipt.durationMs > 0 &&
              receipt.exitCode === 0
          )
        ),
      "journey-receipts",
      "docs/documentation-audit/harness-foundation/receipts",
      "Restore one zero-exit, duration-bound receipt for each scenario command and oracle."
    );

    const sourceManifestHash = yield* readHash(
      repositoryRoot,
      epochPaths.manifest
    );
    const scenarioHash = yield* readHash(repositoryRoot, epochPaths.scenarios);
    const failedHashes = yield* Effect.forEach(
      failedAttemptPaths,
      (path) =>
        readHash(repositoryRoot, path).pipe(
          Effect.map((artifactHash) => ({ path, sha256: artifactHash }))
        ),
      { concurrency: 2 }
    );
    const reviewHash = yield* readHash(
      repositoryRoot,
      epochPaths.independentReview
    );
    const receiptHashes = yield* Effect.forEach(
      receipts,
      ({ receipt, target }) =>
        readHash(repositoryRoot, target).pipe(
          Effect.map((artifactHash) => ({
            journeyId: receipt.journeyId,
            path: target,
            sha256: artifactHash,
          }))
        ),
      { concurrency: 4 }
    );
    yield* requireInvariant(
      candidate.sourceManifest.path === epochPaths.manifest &&
        candidate.sourceManifest.sha256 === sourceManifestHash &&
        candidate.scenario.path === epochPaths.scenarios &&
        candidate.scenario.sha256 === scenarioHash &&
        candidate.failedAttempts.length === failedHashes.length &&
        Array.every(failedHashes, (actual) =>
          Array.some(
            candidate.failedAttempts,
            (expected) =>
              expected.path === actual.path && expected.sha256 === actual.sha256
          )
        ) &&
        candidate.independentReview.path === epochPaths.independentReview &&
        candidate.independentReview.sha256 === reviewHash &&
        candidate.receipts.length === receiptHashes.length &&
        Array.every(receiptHashes, (actual) =>
          Array.some(
            candidate.receipts,
            (expected) =>
              expected.journeyId === actual.journeyId &&
              expected.path === actual.path &&
              expected.sha256 === actual.sha256
          )
        ),
      "evidence-identity",
      epochPaths.candidate,
      "Refresh the candidate only from exact source, scenario, failure, review, and journey receipt hashes."
    );
    yield* requireInvariant(
      review.status === "accepted" &&
        review.candidateCommit === candidateCommit &&
        review.findings.length === 0 &&
        hasExactMembers(
          Array.map(review.checks, (check) => check.name),
          independentReviewCheckNames
        ) &&
        review.reviewer.identity !== manifest.epoch.worker &&
        Array.contains(
          review.reviewer.workerIndependentOf,
          manifest.epoch.worker
        ) &&
        Array.every(
          receipts,
          ({ receipt }) =>
            Date.parse(receipt.observedAt) <= Date.parse(review.observedAt)
        ) &&
        Date.parse(review.observedAt) <= Date.parse(validation.observedAt),
      "independent-review",
      epochPaths.independentReview,
      "Obtain a fresh, temporally ordered independent acceptance with the exact reviewer-owned check set and no unresolved findings."
    );
    yield* requireInvariant(
      candidate.clocks.workerFeedback.valueMs === null &&
        candidate.clocks.workerFeedback.reason !== null &&
        candidate.clocks.humanAttention.valueMs === null &&
        candidate.clocks.humanAttention.reason !== null &&
        candidate.clocks.workerWallClock.valueMs !== null &&
        candidate.clocks.workerWallClock.valueMs > 0 &&
        candidate.clocks.acceptedOutcome.valueMs !== null &&
        candidate.clocks.acceptedOutcome.valueMs > 0,
      "epoch-clocks",
      epochPaths.candidate,
      "Record each directly measured clock independently or retain null with its reason."
    );
    const nonClaimSource = [
      ...manifest.nonClaims,
      ...candidate.nonClaims,
      ...review.nonClaims,
      ...validation.nonClaims,
      ...Array.map(receipts, ({ receipt }) => receipt.nonClaim),
    ].join(" ");
    yield* requireInvariant(
      Array.every(externalBoundaries, (boundary) =>
        nonClaimSource.toLowerCase().includes(boundary.toLowerCase())
      ),
      "external-non-claims",
      epochPaths.candidate,
      "Keep local, Git, hosted CI, registry, release, deployment, provider, public-site, and external-consumer claims separate."
    );
    const candidateHash = yield* readHash(repositoryRoot, epochPaths.candidate);
    yield* requireInvariant(
      validation.status === "passed" &&
        validation.candidate.path === epochPaths.candidate &&
        validation.candidate.sha256 === candidateHash &&
        hasExactMembers(
          Array.map(validation.checks, (check) => check.name),
          validationCheckNames
        ) &&
        validation.noChangeset.includes(
          "package-facing behaviour is unchanged"
        ),
      "validation-identity",
      epochPaths.validation,
      "Bind the passing validation receipt to the exact qualified candidate, exact checker-owned postconditions, and package-facing no-Changeset rationale."
    );

    return {
      changedPaths: changedPaths.length,
      journeyIds: Array.map(
        receipts,
        ({ receipt }): JourneyId => receipt.journeyId
      ),
      sourceManifestHash,
    };
  });

const program = Effect.gen(function* harnessFoundationEpochMain() {
  const repositoryRoot = yield* repositoryRootFromUrl(repositoryRootUrl);
  const result = yield* checkHarnessFoundationEpoch(repositoryRoot);
  yield* Console.info(
    `Harness foundation epoch passed: candidate=${candidateCommit}; changed-paths=${result.changedPaths}; journeys=${result.journeyIds.length}; source=${result.sourceManifestHash}.`
  );
}).pipe(
  Effect.tapErrorTag("EpochCommandError", (error) =>
    Console.error(
      `FAIL [command] target=${error.target}; recovery=repair local Git evidence collection (exit ${error.exitCode}).`
    )
  ),
  Effect.tapErrorTag("EpochInputError", (error) =>
    Console.error(
      `FAIL [input] target=${error.target}; recovery=repair the Schema-decoded epoch owner.`
    )
  ),
  Effect.tapErrorTag("EpochInvariantError", (error) =>
    Console.error(
      `FAIL [${error.invariant}] target=${error.target}; recovery=${error.recovery}`
    )
  ),
  Effect.scoped
);

const command = Command.make(
  "check-harness-foundation-epoch",
  {},
  () => program
);

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(
      Command.run(command, {
        renderErrors: false,
        version: "repository-local",
      }).pipe(Effect.provide(BunServices.layer)),
      { disableErrorReporting: true }
    )
  ),
  Match.orElse(() => false)
);
