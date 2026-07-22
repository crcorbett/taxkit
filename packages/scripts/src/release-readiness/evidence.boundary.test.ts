import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import { Effect, FileSystem } from "effect";
import * as Path from "effect/Path";

import {
  decodeReleaseAcceptedAttemptSummary,
  decodeReleaseAttemptReceipt,
  decodeReleaseJourneyInventory,
  decodeReleaseProofPacket,
  persistReleaseAttemptReceipt,
  persistReleasePresentationReceipt,
  readAndVerifyReleaseAttemptReceipt,
  readReleaseAcceptedAttemptSummary,
  readReleaseEvidence,
  sha256Text,
  verifyCandidateContentManifest,
  verifyAcceptedAttempt,
  verifyNewReleaseCandidateIdentity,
  verifyReleaseEvidence,
} from "./evidence.boundary.js";
import { ReleaseAttemptId } from "./schemas.js";
import type { ReleaseAttemptReceipt } from "./schemas.js";

const workspaceRootUrl = new URL("../../../..", import.meta.url);
const zeroSha256 = `sha256:${"0".repeat(64)}`;

const readEvidenceTexts = Effect.gen(function* readEvidenceFixtureTexts() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const workspaceRoot = yield* path.fromFileUrl(workspaceRootUrl);
  const inventoryText = yield* fileSystem.readFileString(
    path.join(workspaceRoot, "docs/verification/critical-journeys.json")
  );
  const packetText = yield* fileSystem.readFileString(
    path.join(workspaceRoot, "docs/evidence/releases/HGI-203-local.json")
  );

  return { inventoryText, packetText, workspaceRoot };
});

const makeTempWorkspace = Effect.acquireRelease(
  Effect.gen(function* makeReleaseEvidenceTempWorkspace() {
    const fileSystem = yield* FileSystem.FileSystem;
    return yield* fileSystem.makeTempDirectory({
      prefix: "taxkit-release-evidence-",
    });
  }),
  (tempPath) =>
    FileSystem.FileSystem.pipe(
      Effect.flatMap((fileSystem) =>
        fileSystem.remove(tempPath, { force: true, recursive: true })
      ),
      Effect.orDie
    )
);

const failedFixtureReceipt: ReleaseAttemptReceipt = {
  attemptId: ReleaseAttemptId.make("release-1"),
  candidate: {
    baseCommit: "e63a7b60c369ca880a49dce5d1ffddcf49a6365e",
    contentManifest: "docs/evidence/releases/HGI-203-content-manifest.txt",
    contentSha256: zeroSha256,
  },
  detailArtifacts: [],
  failedCheck: "verification",
  lastSuccessfulCheck: null,
  limitation: "Local fixture only.",
  nonClaim: "No external operation.",
  observedExitCode: 1,
  postcondition: "The fixture remains failed.",
  provenance: "Deterministic persistence fixture.",
  recovery: "Inspect this receipt.",
  resumeTrigger: "A material fixture change.",
  rollback: "Remove the isolated temporary fixture workspace.",
  schemaVersion: 1,
  target: "fixture",
  terminalState: "non-zero-exit",
};

describe("release evidence boundary", () => {
  it.effect(
    "decodes and verifies the actual retained inventory and packet",
    () =>
      Effect.gen(function* testActualReleaseEvidence() {
        const { workspaceRoot } = yield* readEvidenceTexts;
        const evidence = yield* readReleaseEvidence(workspaceRoot);

        expect(evidence.inventory.journeys).toHaveLength(5);
        expect(evidence.packet.taskId).toBe("HGI-203");
      }).pipe(Effect.provide(BunServices.layer))
  );

  for (const field of [
    "startingState",
    "oracle",
    "expectedSideEffects",
    "preservedInvariants",
    "evidence",
    "nonClaims",
  ]) {
    it.effect(`rejects a critical journey without ${field}`, () =>
      Effect.gen(function* testMissingCriticalJourneyField() {
        const { inventoryText } = yield* readEvidenceTexts;
        const malformed = inventoryText.replace(
          `"${field}":`,
          `"removed${field}":`
        );

        const error = yield* decodeReleaseJourneyInventory(malformed).pipe(
          Effect.flip
        );
        expect(error._tag).toBe("ReleaseEvidenceDecodeError");
      }).pipe(Effect.provide(BunServices.layer))
    );
  }

  it.effect("rejects duplicate, unknown and reordered journey identities", () =>
    Effect.gen(function* testJourneyIdentityFailures() {
      const { inventoryText } = yield* readEvidenceTexts;
      const duplicate = inventoryText.replace(
        "taxkit-calculator-direct",
        "taxkit-sdk-packed"
      );
      const unknown = inventoryText.replace(
        "taxkit-calculator-direct",
        "taxkit-unknown"
      );

      expect(
        (yield* decodeReleaseJourneyInventory(duplicate).pipe(Effect.flip))._tag
      ).toBe("ReleaseEvidenceDecodeError");
      expect(
        (yield* decodeReleaseJourneyInventory(unknown).pipe(Effect.flip))._tag
      ).toBe("ReleaseEvidenceDecodeError");
    }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect("rejects malformed and reordered accepted-attempt summaries", () =>
    Effect.gen(function* testAcceptedAttemptSummaryShape() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const { workspaceRoot } = yield* readEvidenceTexts;
      const summaryText = yield* fileSystem.readFileString(
        path.join(
          workspaceRoot,
          "docs/evidence/releases/HGI-203-accepted-attempt.json"
        )
      );
      const malformed = summaryText.replace(
        '"receiptSha256":',
        '"removedReceiptSha256":'
      );
      const reordered = summaryText
        .replace('"check": "verification"', '"check": "__first__"')
        .replace('"check": "test"', '"check": "verification"')
        .replace('"check": "__first__"', '"check": "test"');
      const remappedJourney = summaryText.replace(
        '"taxkit-http-api": ["api-smoke"]',
        '"taxkit-http-api": ["verification"]'
      );

      expect(
        (yield* decodeReleaseAcceptedAttemptSummary(malformed).pipe(
          Effect.flip
        )).operation
      ).toBe("decode-accepted-attempt-summary");
      expect(
        (yield* decodeReleaseAcceptedAttemptSummary(reordered).pipe(
          Effect.flip
        )).operation
      ).toBe("decode-accepted-attempt-summary");
      expect(
        (yield* decodeReleaseAcceptedAttemptSummary(remappedJourney).pipe(
          Effect.flip
        )).operation
      ).toBe("decode-accepted-attempt-summary");
    }).pipe(Effect.provide(BunServices.layer))
  );

  for (const field of [
    "candidate",
    "packageDigests",
    "buildDigests",
    "exportDigests",
    "packedConsumerEvidence",
    "apiEvidence",
    "docsEvidence",
    "limitations",
    "rollback",
  ]) {
    it.effect(`rejects a proof packet without ${field}`, () =>
      Effect.gen(function* testMissingProofField() {
        const { packetText } = yield* readEvidenceTexts;
        const malformed = packetText.replace(
          `"${field}":`,
          `"removed${field}":`
        );

        const error = yield* decodeReleaseProofPacket(malformed).pipe(
          Effect.flip
        );
        expect(error._tag).toBe("ReleaseEvidenceDecodeError");
      }).pipe(Effect.provide(BunServices.layer))
    );
  }

  it.effect("rejects escaping paths and mismatched retained digests", () =>
    Effect.gen(function* testReleaseEvidenceIntegrityFailures() {
      const { inventoryText, packetText, workspaceRoot } =
        yield* readEvidenceTexts;
      const packet = yield* decodeReleaseProofPacket(packetText);
      const escapingPacket = packetText.replace(
        "docs/evidence/releases/HGI-203-content-manifest.txt",
        "../escape.txt"
      );
      const corruptCandidate = {
        ...packet,
        candidate: { ...packet.candidate, contentSha256: zeroSha256 },
      } satisfies typeof packet;
      const corruptDetail = {
        ...packet,
        attempt: {
          ...packet.attempt,
          detailArtifacts: packet.attempt.detailArtifacts.map(
            (artifact, index) =>
              index === 0 ? { ...artifact, sha256: zeroSha256 } : artifact
          ),
        },
      } satisfies typeof packet;

      expect(
        (yield* decodeReleaseProofPacket(escapingPacket).pipe(Effect.flip))._tag
      ).toBe("ReleaseEvidenceDecodeError");
      expect(
        (yield* verifyReleaseEvidence(
          workspaceRoot,
          corruptCandidate,
          inventoryText
        ).pipe(Effect.flip)).operation
      ).toBe("verify-retained-artifact-digest");
      expect(
        (yield* verifyReleaseEvidence(
          workspaceRoot,
          corruptDetail,
          inventoryText
        ).pipe(Effect.flip)).operation
      ).toBe("verify-retained-artifact-digest");
    }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect("rejects malformed, escaping and reordered content manifests", () =>
    Effect.gen(function* testContentManifestShape() {
      const workspaceRoot = yield* makeTempWorkspace;
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const manifestPath = "candidate-manifest.txt";
      const absoluteManifest = path.join(workspaceRoot, manifestPath);
      const cases = [
        "not-a-manifest-row\n",
        `${"0".repeat(64)}  ../escape.txt\n`,
        `${"0".repeat(64)}  z.txt\n${"0".repeat(64)}  a.txt\n`,
      ];

      for (const manifest of cases) {
        yield* fileSystem.writeFileString(absoluteManifest, manifest);
        const error = yield* verifyCandidateContentManifest(workspaceRoot, {
          path: manifestPath,
          sha256: yield* sha256Text(manifest),
        }).pipe(Effect.flip);
        expect(error._tag).toBe("ReleaseEvidenceDecodeError");
      }
    }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect(
    "keeps accepted durable proof clone-safe while candidate proof requires transient detail",
    () =>
      Effect.gen(function* testAcceptedAndCandidateRetentionBoundaries() {
        const workspaceRoot = yield* makeTempWorkspace;
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const { packetText } = yield* readEvidenceTexts;
        const packet = yield* decodeReleaseProofPacket(packetText);
        const acceptedSummaryPath =
          "docs/evidence/releases/HGI-203-accepted-attempt.json";
        const fixtureAttemptId = ReleaseAttemptId.make("release-2");
        const summary = {
          attemptId: fixtureAttemptId,
          candidate: {
            baseCommit: packet.candidate.baseCommit,
            contentManifest: packet.candidate.contentManifest,
            contentSha256BeforeAttempt: packet.candidate.contentSha256,
          },
          journeyEvidence: {
            "taxkit-calculator-direct": ["verification", "test"],
            "taxkit-docs-runtime": ["docs-validation", "docs-browser"],
            "taxkit-http-api": ["api-smoke"],
            "taxkit-release-closure": [
              "verification",
              "test",
              "build",
              "docs-validation",
              "packed-artifact",
              "downstream-consumer",
              "api-smoke",
              "docs-browser",
              "changeset-status",
            ],
            "taxkit-sdk-packed": [
              "build",
              "packed-artifact",
              "downstream-consumer",
            ],
          },
          lastSuccessfulCheck: "changeset-status",
          limitation: "Synthetic clone-safety fixture.",
          nonClaim: "No external operation.",
          observedExitCode: 0,
          outcomes: [
            "verification",
            "test",
            "build",
            "docs-validation",
            "packed-artifact",
            "downstream-consumer",
            "api-smoke",
            "docs-browser",
            "changeset-status",
          ].map((check) => ({
            check,
            exitCode: 0,
            stderr: {
              path: `tmp/release-readiness/${check}-stderr.log`,
              sha256: zeroSha256,
            },
            stdout: {
              path: `tmp/release-readiness/${check}-stdout.log`,
              sha256: zeroSha256,
            },
          })),
          postcondition: "The durable summary remains readable.",
          receiptPath: "tmp/release-readiness/missing-receipt.json",
          receiptSha256: zeroSha256,
          rollback: "Remove the synthetic fixture.",
          schemaVersion: 1,
          taskId: "HGI-203",
          terminalState: "success",
        };
        const summaryText = JSON.stringify(summary);
        const absoluteSummaryPath = path.join(
          workspaceRoot,
          acceptedSummaryPath
        );
        yield* fileSystem.makeDirectory(path.dirname(absoluteSummaryPath), {
          recursive: true,
        });
        yield* fileSystem.writeFileString(absoluteSummaryPath, summaryText);
        const acceptedPacket = {
          ...packet,
          attempt: {
            ...packet.attempt,
            attemptId: fixtureAttemptId,
            detailArtifacts: [
              {
                path: acceptedSummaryPath,
                sha256: yield* sha256Text(summaryText),
              },
            ],
            terminalState: "success",
          },
          lifecycle: "accepted",
        } satisfies typeof packet;

        yield* verifyAcceptedAttempt(workspaceRoot, acceptedPacket);
        const redirectedEvidence = yield* verifyAcceptedAttempt(workspaceRoot, {
          ...acceptedPacket,
          apiEvidence: "docs/documentation-audit/HGI-203-candidate.json",
        }).pipe(Effect.flip);
        expect(redirectedEvidence.operation).toBe(
          "bind-accepted-attempt-to-candidate"
        );
        const candidateError = yield* verifyAcceptedAttempt(workspaceRoot, {
          ...acceptedPacket,
          lifecycle: "candidate",
        }).pipe(Effect.flip);
        expect(candidateError.operation).toBe("read-retained-artifact");
      }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect("rejects a candidate identity that reuses accepted content", () =>
    Effect.gen(function* testAcceptedCandidateReuse() {
      const { workspaceRoot, packetText } = yield* readEvidenceTexts;
      const packet = yield* decodeReleaseProofPacket(packetText);
      const accepted = yield* readReleaseAcceptedAttemptSummary(workspaceRoot);
      const reused = yield* verifyNewReleaseCandidateIdentity(
        {
          ...packet.candidate,
          contentSha256: accepted.candidate.contentSha256BeforeAttempt,
        },
        accepted
      ).pipe(Effect.flip);
      yield* verifyNewReleaseCandidateIdentity(
        {
          ...packet.candidate,
          contentSha256: zeroSha256,
        },
        accepted
      );

      expect(reused.operation).toBe(
        "reject-reused-accepted-candidate-identity"
      );
    }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect("persists an attempt receipt once and rejects overwrite", () =>
    Effect.gen(function* testAttemptReceiptPersistence() {
      const workspaceRoot = yield* makeTempWorkspace;
      const artifact = yield* persistReleaseAttemptReceipt(
        workspaceRoot,
        failedFixtureReceipt
      );
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const retained = yield* fileSystem.readFileString(
        path.join(workspaceRoot, artifact.path)
      );
      const decoded = yield* decodeReleaseAttemptReceipt(
        retained,
        artifact.path
      );
      const overwriteError = yield* persistReleaseAttemptReceipt(
        workspaceRoot,
        failedFixtureReceipt
      ).pipe(Effect.flip);
      const afterRejectedOverwrite = yield* fileSystem.readFileString(
        path.join(workspaceRoot, artifact.path)
      );

      expect(decoded).toEqual(failedFixtureReceipt);
      expect(artifact.sha256).toMatch(/^sha256:[a-f0-9]{64}$/u);
      expect(overwriteError.operation).toBe(
        "persist-immutable-attempt-receipt"
      );
      expect(afterRejectedOverwrite).toBe(retained);
    }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect("verifies every detail and rejects missing or corrupt detail", () =>
    Effect.gen(function* testAttemptDetailVerification() {
      const workspaceRoot = yield* makeTempWorkspace;
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const detailPath = "tmp/release-readiness/verification-stdout.log";
      const absoluteDetailPath = path.join(workspaceRoot, detailPath);
      yield* fileSystem.makeDirectory(path.dirname(absoluteDetailPath), {
        recursive: true,
      });
      yield* fileSystem.writeFileString(absoluteDetailPath, "verified output");
      const detailSha256 = yield* sha256Text("verified output");
      const receipt = {
        ...failedFixtureReceipt,
        detailArtifacts: [{ path: detailPath, sha256: detailSha256 }],
      } satisfies ReleaseAttemptReceipt;
      const artifact = yield* persistReleaseAttemptReceipt(
        workspaceRoot,
        receipt
      );

      expect(
        yield* readAndVerifyReleaseAttemptReceipt(workspaceRoot, artifact)
      ).toEqual(receipt);
      yield* fileSystem.writeFileString(absoluteDetailPath, "corrupt output");
      expect(
        (yield* readAndVerifyReleaseAttemptReceipt(
          workspaceRoot,
          artifact
        ).pipe(Effect.flip)).operation
      ).toBe("verify-retained-artifact-digest");
      yield* fileSystem.remove(absoluteDetailPath);
      expect(
        (yield* readAndVerifyReleaseAttemptReceipt(
          workspaceRoot,
          artifact
        ).pipe(Effect.flip)).operation
      ).toBe("read-retained-artifact");
    }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect("reuses one presentation sidecar and rejects a conflict", () =>
    Effect.gen(function* testPresentationSidecarPersistence() {
      const workspaceRoot = yield* makeTempWorkspace;
      const sourceReceipt = yield* persistReleaseAttemptReceipt(
        workspaceRoot,
        failedFixtureReceipt
      );
      const presentation = {
        attemptId: failedFixtureReceipt.attemptId,
        nonClaim: failedFixtureReceipt.nonClaim,
        postcondition: failedFixtureReceipt.postcondition,
        schemaVersion: 1 as const,
        sourceReceipt,
        terminalState: failedFixtureReceipt.terminalState,
      };
      const first = yield* persistReleasePresentationReceipt(
        workspaceRoot,
        presentation
      );
      const second = yield* persistReleasePresentationReceipt(
        workspaceRoot,
        presentation
      );
      const conflict = yield* persistReleasePresentationReceipt(workspaceRoot, {
        ...presentation,
        nonClaim: "Conflicting presentation.",
      }).pipe(Effect.flip);

      expect(second).toEqual(first);
      expect(conflict.operation).toBe("reject-presentation-sidecar-conflict");
    }).pipe(Effect.provide(BunServices.layer))
  );
});
