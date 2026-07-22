import {
  Array as EffectArray,
  Effect,
  FileSystem,
  Order,
  Schema,
} from "effect";
import * as Path from "effect/Path";

import { ReleaseEvidenceDecodeError } from "./errors.js";
import {
  ReleaseAcceptedAttemptSummary,
  ReleaseAttemptReceipt,
  ReleaseEvidenceArtifact,
  ReleaseJourneyInventory,
  ReleasePresentationReceipt,
  ReleaseProofPacket,
} from "./schemas.js";
import type {
  ReleaseAcceptedAttemptSummary as ReleaseAcceptedAttemptSummaryType,
  ReleaseAttemptReceipt as ReleaseAttemptReceiptType,
  ReleasePresentationReceipt as ReleasePresentationReceiptType,
  ReleaseProofPacket as ReleaseProofPacketType,
} from "./schemas.js";

const acceptedAttemptPath =
  "docs/evidence/releases/HGI-203-accepted-attempt.json";
const journeyInventoryPath = "docs/verification/critical-journeys.json";
const proofPacketPath = "docs/evidence/releases/HGI-203-local.json";
const candidateEvidenceExclusions = [
  "docs/evidence/releases/HGI-203-content-manifest.txt",
  "docs/evidence/releases/HGI-203-local.json",
  "docs/evidence/releases/HGI-203-accepted-attempt.json",
  "docs/evidence/releases/HGI-203-failed-attempts.json",
  "docs/documentation-audit/HGI-203-candidate.json",
] as const;

export const sha256Text = (text: string) =>
  Effect.promise(async () => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text)
    );
    const hex = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");

    return `sha256:${hex}`;
  });

export const decodeReleaseJourneyInventory = (text: string) =>
  Schema.decodeUnknownEffect(Schema.fromJsonString(ReleaseJourneyInventory))(
    text
  ).pipe(
    Effect.mapError(
      () =>
        new ReleaseEvidenceDecodeError({
          evidencePath: journeyInventoryPath,
          operation: "decode-five-journey-inventory",
        })
    )
  );

export const decodeReleaseProofPacket = (text: string) =>
  Schema.decodeUnknownEffect(Schema.fromJsonString(ReleaseProofPacket))(
    text
  ).pipe(
    Effect.mapError(
      () =>
        new ReleaseEvidenceDecodeError({
          evidencePath: proofPacketPath,
          operation: "decode-release-proof-packet",
        })
    )
  );

export const decodeReleaseAttemptReceipt = (
  text: string,
  evidencePath: string
) =>
  Schema.decodeUnknownEffect(Schema.fromJsonString(ReleaseAttemptReceipt))(
    text
  ).pipe(
    Effect.mapError(
      () =>
        new ReleaseEvidenceDecodeError({
          evidencePath,
          operation: "decode-attempt-receipt",
        })
    )
  );

export const decodeReleaseAcceptedAttemptSummary = (text: string) =>
  Schema.decodeUnknownEffect(
    Schema.fromJsonString(ReleaseAcceptedAttemptSummary)
  )(text).pipe(
    Effect.mapError(
      () =>
        new ReleaseEvidenceDecodeError({
          evidencePath: acceptedAttemptPath,
          operation: "decode-accepted-attempt-summary",
        })
    )
  );

export const readReleaseAcceptedAttemptSummary = (workspaceRoot: string) =>
  Effect.gen(function* readAcceptedAttemptSummary() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const summaryText = yield* fileSystem
      .readFileString(path.join(workspaceRoot, acceptedAttemptPath))
      .pipe(
        Effect.mapError(
          () =>
            new ReleaseEvidenceDecodeError({
              evidencePath: acceptedAttemptPath,
              operation: "read-accepted-attempt-summary",
            })
        )
      );

    return yield* decodeReleaseAcceptedAttemptSummary(summaryText);
  });

export const verifyNewReleaseCandidateIdentity = (
  candidate: ReleaseProofPacketType["candidate"],
  accepted: ReleaseAcceptedAttemptSummaryType
) =>
  candidate.baseCommit === accepted.candidate.baseCommit &&
  candidate.contentManifest === accepted.candidate.contentManifest &&
  candidate.contentSha256 === accepted.candidate.contentSha256BeforeAttempt
    ? Effect.fail(
        new ReleaseEvidenceDecodeError({
          evidencePath: acceptedAttemptPath,
          operation: "reject-reused-accepted-candidate-identity",
        })
      )
    : Effect.void;

const verifyRetainedArtifact = (
  workspaceRoot: string,
  artifact: { readonly path: string; readonly sha256: string }
) =>
  Effect.gen(function* verifyReleaseEvidenceArtifact() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const content = yield* fileSystem
      .readFileString(path.join(workspaceRoot, artifact.path))
      .pipe(
        Effect.mapError(
          () =>
            new ReleaseEvidenceDecodeError({
              evidencePath: artifact.path,
              operation: "read-retained-artifact",
            })
        )
      );
    const actualSha256 = yield* sha256Text(content);

    if (actualSha256 !== artifact.sha256) {
      return yield* new ReleaseEvidenceDecodeError({
        evidencePath: artifact.path,
        operation: "verify-retained-artifact-digest",
      });
    }

    return content;
  });

export const verifyCandidateContentManifest = (
  workspaceRoot: string,
  artifact: { readonly path: string; readonly sha256: string }
) =>
  Effect.gen(function* verifyChangedContentManifest() {
    const manifest = yield* verifyRetainedArtifact(workspaceRoot, artifact);
    const entries = manifest
      .split("\n")
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const match = /^([a-f0-9]{64}) {2}(.+)$/u.exec(line);
        return match === null
          ? null
          : { path: match[2] ?? "", sha256: `sha256:${match[1]}` };
      });
    const malformed = entries.some((entry) => entry === null);
    const parsedArtifacts = entries.filter(
      (entry): entry is { readonly path: string; readonly sha256: string } =>
        entry !== null
    );
    const artifacts = yield* Effect.forEach(
      parsedArtifacts,
      (entry) =>
        Schema.decodeUnknownEffect(ReleaseEvidenceArtifact)(entry).pipe(
          Effect.mapError(
            () =>
              new ReleaseEvidenceDecodeError({
                evidencePath: artifact.path,
                operation: "decode-candidate-content-manifest-artifact",
              })
          )
        ),
      { concurrency: 1 }
    );
    const paths = artifacts.map(({ path }) => path);
    const sortedPaths = EffectArray.sort(paths, Order.String);

    if (
      malformed ||
      artifacts.length === 0 ||
      new Set(paths).size !== paths.length ||
      paths.some((entry, index) => entry !== sortedPaths[index])
    ) {
      return yield* new ReleaseEvidenceDecodeError({
        evidencePath: artifact.path,
        operation: "decode-sorted-candidate-content-manifest",
      });
    }
    yield* Effect.forEach(
      artifacts,
      (entry) => verifyRetainedArtifact(workspaceRoot, entry),
      { concurrency: 1, discard: true }
    );

    return artifacts;
  });

export const readAndVerifyReleaseAttemptReceipt = (
  workspaceRoot: string,
  input: { readonly path: string; readonly sha256: string }
) =>
  Effect.gen(function* readVerifiedReleaseAttemptReceipt() {
    const artifact = yield* Schema.decodeUnknownEffect(ReleaseEvidenceArtifact)(
      input
    ).pipe(
      Effect.mapError(
        () =>
          new ReleaseEvidenceDecodeError({
            evidencePath: input.path,
            operation: "decode-attempt-receipt-artifact",
          })
      )
    );
    const receiptText = yield* verifyRetainedArtifact(workspaceRoot, artifact);
    const receipt = yield* decodeReleaseAttemptReceipt(
      receiptText,
      artifact.path
    );
    yield* Effect.forEach(
      receipt.detailArtifacts,
      (detail) => verifyRetainedArtifact(workspaceRoot, detail),
      { concurrency: 1, discard: true }
    );

    return receipt;
  });

export const persistReleaseAttemptReceipt = (
  workspaceRoot: string,
  receipt: ReleaseAttemptReceiptType
) =>
  Effect.gen(function* persistReleaseAttemptEvidence() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const receiptDirectory = path.join(
      workspaceRoot,
      "tmp",
      "release-readiness"
    );
    const relativeReceiptPath = `tmp/release-readiness/${receipt.attemptId}.json`;
    const receiptPath = path.join(workspaceRoot, relativeReceiptPath);
    const encoded = yield* Schema.encodeUnknownEffect(
      Schema.fromJsonString(ReleaseAttemptReceipt)
    )(receipt).pipe(
      Effect.mapError(
        () =>
          new ReleaseEvidenceDecodeError({
            evidencePath: relativeReceiptPath,
            operation: "encode-attempt-receipt",
          })
      )
    );
    yield* fileSystem.makeDirectory(receiptDirectory, { recursive: true });
    yield* Effect.gen(function* writeImmutableAttemptReceipt() {
      const file = yield* fileSystem.open(receiptPath, { flag: "wx" });
      yield* file.writeAll(new TextEncoder().encode(encoded));
      yield* file.sync;
    }).pipe(Effect.scoped);
    const retained = yield* fileSystem.readFileString(receiptPath);
    yield* decodeReleaseAttemptReceipt(retained, relativeReceiptPath);

    return {
      path: relativeReceiptPath,
      sha256: yield* sha256Text(retained),
    };
  }).pipe(
    Effect.catchTag(
      "PlatformError",
      () =>
        new ReleaseEvidenceDecodeError({
          evidencePath: `tmp/release-readiness/${receipt.attemptId}.json`,
          operation: "persist-immutable-attempt-receipt",
        })
    )
  );

export const persistReleasePresentationReceipt = (
  workspaceRoot: string,
  receipt: ReleasePresentationReceiptType
) =>
  Effect.gen(function* persistReleasePresentationEvidence() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const relativePath = `tmp/release-readiness/${receipt.attemptId}-presentation.json`;
    const absolutePath = path.join(workspaceRoot, relativePath);
    const encoded = yield* Schema.encodeUnknownEffect(
      Schema.fromJsonString(ReleasePresentationReceipt)
    )(receipt).pipe(
      Effect.mapError(
        () =>
          new ReleaseEvidenceDecodeError({
            evidencePath: relativePath,
            operation: "encode-presentation-receipt",
          })
      )
    );
    const exists = yield* fileSystem.exists(absolutePath);

    if (exists) {
      const retained = yield* fileSystem.readFileString(absolutePath);
      if (retained !== encoded) {
        return yield* new ReleaseEvidenceDecodeError({
          evidencePath: relativePath,
          operation: "reject-presentation-sidecar-conflict",
        });
      }
    } else {
      yield* Effect.gen(function* writeImmutablePresentationReceipt() {
        const file = yield* fileSystem.open(absolutePath, { flag: "wx" });
        yield* file.writeAll(new TextEncoder().encode(encoded));
        yield* file.sync;
      }).pipe(Effect.scoped);
    }
    const retained = yield* fileSystem.readFileString(absolutePath);
    yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(ReleasePresentationReceipt)
    )(retained).pipe(
      Effect.mapError(
        () =>
          new ReleaseEvidenceDecodeError({
            evidencePath: relativePath,
            operation: "decode-presentation-receipt",
          })
      )
    );

    return { path: relativePath, sha256: yield* sha256Text(retained) };
  }).pipe(
    Effect.catchTag(
      "PlatformError",
      () =>
        new ReleaseEvidenceDecodeError({
          evidencePath: `tmp/release-readiness/${receipt.attemptId}-presentation.json`,
          operation: "persist-presentation-receipt",
        })
    )
  );

export const verifyAcceptedAttempt = (
  workspaceRoot: string,
  packet: ReleaseProofPacket
) =>
  Effect.gen(function* verifyAcceptedReleaseAttempt() {
    const summary = yield* readReleaseAcceptedAttemptSummary(workspaceRoot);
    const summaryArtifact = packet.attempt.detailArtifacts[0] ?? null;
    const packetEvidencePaths = [
      packet.packedConsumerEvidence,
      packet.apiEvidence,
      packet.docsEvidence,
      ...packet.journeyResults.map((journey) => journey.evidencePath),
    ];

    if (
      packet.attempt.detailArtifacts.length !== 1 ||
      summaryArtifact?.path !== acceptedAttemptPath ||
      summary.candidate.baseCommit !== packet.candidate.baseCommit ||
      summary.candidate.contentManifest !== packet.candidate.contentManifest ||
      summary.candidate.contentSha256BeforeAttempt !==
        packet.candidate.contentSha256 ||
      summary.attemptId !== packet.attempt.attemptId ||
      summary.terminalState !== packet.attempt.terminalState ||
      packet.journeyResults.some((journey) => journey.status !== "passed") ||
      packetEvidencePaths.some(
        (evidencePath) => evidencePath !== acceptedAttemptPath
      )
    ) {
      return yield* new ReleaseEvidenceDecodeError({
        evidencePath: acceptedAttemptPath,
        operation: "bind-accepted-attempt-to-candidate",
      });
    }
    if (summaryArtifact !== null) {
      yield* verifyRetainedArtifact(workspaceRoot, summaryArtifact);
    }
    yield* packet.lifecycle === "accepted"
      ? Effect.void
      : Effect.gen(function* verifyTransientAcceptedAttemptDetails() {
          const receipt = yield* readAndVerifyReleaseAttemptReceipt(
            workspaceRoot,
            {
              path: summary.receiptPath,
              sha256: summary.receiptSha256,
            }
          );
          const summaryDetails = EffectArray.flatMap(
            summary.outcomes,
            (outcome) => [outcome.stdout, outcome.stderr]
          );

          if (
            receipt.attemptId !== summary.attemptId ||
            receipt.candidate.baseCommit !== summary.candidate.baseCommit ||
            receipt.candidate.contentManifest !==
              summary.candidate.contentManifest ||
            receipt.candidate.contentSha256 !==
              summary.candidate.contentSha256BeforeAttempt ||
            receipt.terminalState !== "success" ||
            receipt.observedExitCode !== 0 ||
            receipt.lastSuccessfulCheck !== "changeset-status" ||
            receipt.detailArtifacts.length !== summaryDetails.length
          ) {
            return yield* new ReleaseEvidenceDecodeError({
              evidencePath: summary.receiptPath,
              operation: "verify-accepted-attempt-receipt-fields",
            });
          }
          yield* Effect.forEach(
            EffectArray.zip(receipt.detailArtifacts, summaryDetails),
            ([receiptDetail, summaryDetail]) =>
              receiptDetail.path === summaryDetail.path &&
              receiptDetail.sha256 === summaryDetail.sha256
                ? Effect.void
                : new ReleaseEvidenceDecodeError({
                    evidencePath: summary.receiptPath,
                    operation: "verify-accepted-detail-inventory",
                  }),
            { concurrency: 1, discard: true }
          );

          return receipt;
        });

    return summary;
  });

export const verifyReleaseEvidence = (
  workspaceRoot: string,
  packet: ReleaseProofPacket,
  inventoryText: string
) =>
  Effect.gen(function* verifyReleaseEvidenceBoundary() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const inventorySha256 = yield* sha256Text(inventoryText);

    if (
      packet.journeyInventory !== journeyInventoryPath ||
      packet.journeyInventorySha256 !== inventorySha256
    ) {
      return yield* new ReleaseEvidenceDecodeError({
        evidencePath: proofPacketPath,
        operation: "verify-journey-inventory-path-and-digest",
      });
    }
    if (
      packet.candidate.exclusions.length !==
        candidateEvidenceExclusions.length ||
      packet.candidate.exclusions.some(
        (entry, index) => entry !== candidateEvidenceExclusions[index]
      )
    ) {
      return yield* new ReleaseEvidenceDecodeError({
        evidencePath: proofPacketPath,
        operation: "verify-candidate-evidence-exclusions",
      });
    }
    yield* verifyCandidateContentManifest(workspaceRoot, {
      path: packet.candidate.contentManifest,
      sha256: packet.candidate.contentSha256,
    });
    yield* Effect.forEach(
      [
        ...packet.packageDigests,
        ...packet.buildDigests,
        ...packet.exportDigests,
      ],
      ({ sha256, target }) =>
        verifyRetainedArtifact(workspaceRoot, { path: target, sha256 }),
      { concurrency: 1, discard: true }
    );
    yield* Effect.forEach(
      packet.retainedEvidence,
      (evidencePath) =>
        fileSystem.readFile(path.join(workspaceRoot, evidencePath)).pipe(
          Effect.mapError(
            () =>
              new ReleaseEvidenceDecodeError({
                evidencePath,
                operation: "read-retained-evidence",
              })
          ),
          Effect.asVoid
        ),
      { concurrency: 1 }
    );
    yield* packet.attempt.terminalState === "success"
      ? verifyAcceptedAttempt(workspaceRoot, packet)
      : Effect.forEach(
          packet.attempt.detailArtifacts,
          (artifact) => verifyRetainedArtifact(workspaceRoot, artifact),
          { concurrency: 1, discard: true }
        );

    return packet;
  });

export const readReleaseEvidence = (workspaceRoot: string) =>
  Effect.gen(function* readReleaseEvidenceBoundary() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const inventoryText = yield* fileSystem
      .readFileString(path.join(workspaceRoot, journeyInventoryPath))
      .pipe(
        Effect.mapError(
          () =>
            new ReleaseEvidenceDecodeError({
              evidencePath: journeyInventoryPath,
              operation: "read-five-journey-inventory",
            })
        )
      );
    const packetText = yield* fileSystem
      .readFileString(path.join(workspaceRoot, proofPacketPath))
      .pipe(
        Effect.mapError(
          () =>
            new ReleaseEvidenceDecodeError({
              evidencePath: proofPacketPath,
              operation: "read-release-proof-packet",
            })
        )
      );
    const inventory = yield* decodeReleaseJourneyInventory(inventoryText);
    const packet = yield* decodeReleaseProofPacket(packetText);
    yield* verifyReleaseEvidence(workspaceRoot, packet, inventoryText);

    return { inventory, packet };
  });
