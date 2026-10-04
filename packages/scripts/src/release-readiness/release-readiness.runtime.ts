import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Clock, Console, Effect, Layer, Schema } from "effect";
import * as Path from "effect/Path";

import { decodeReleaseReadinessCli } from "./cli.js";
import {
  formatReleaseReadinessError,
  ReleaseEvidenceDecodeError,
  ReleaseWorkspacePathError,
} from "./errors.js";
import {
  persistReleaseAttemptReceipt,
  readReleaseAcceptedAttemptSummary,
  readReleaseEvidence,
  verifyNewReleaseCandidateIdentity,
} from "./evidence.boundary.js";
import { ReleaseCommandRunnerLive } from "./live.layer.js";
import {
  createSuccessfulAttemptReceipt,
  runCiReleaseReadiness,
  runReleaseReadiness,
} from "./program.js";
import {
  createReleaseReadinessPlan,
  ReleaseAttemptId,
  renderReleaseReadinessReport,
} from "./schemas.js";

const workspaceRootUrl = new URL("../../../..", import.meta.url);
const ReleaseReadinessRuntimeLive = ReleaseCommandRunnerLive.pipe(
  Layer.provideMerge(BunServices.layer)
);

const program = Effect.gen(function* releaseReadinessMain() {
  const path = yield* Path.Path;
  const workspaceRoot = yield* path
    .fromFileUrl(workspaceRootUrl)
    .pipe(
      Effect.mapError(
        () =>
          new ReleaseWorkspacePathError({ target: "repository workspace root" })
      )
    );
  const cli = yield* decodeReleaseReadinessCli(Bun.argv.slice(2));
  if (cli.mode === "ci") {
    const report = yield* runCiReleaseReadiness(
      createReleaseReadinessPlan(workspaceRoot)
    );
    yield* Console.info(
      `CI release graph passed ${report.outcomes.length} ordered checks; postcondition=repository checks passed for this CI revision; nonclaim=no candidate, attempt receipt, publication, tag, release, deployment or provider mutation.`
    );
    return report;
  }
  const evidence = yield* readReleaseEvidence(workspaceRoot);
  if (evidence.packet.lifecycle === "accepted") {
    return yield* Effect.fail(
      new ReleaseEvidenceDecodeError({
        evidencePath: "docs/evidence/releases/HGI-203-local.json",
        operation: "prepare-new-candidate-packet-before-release-attempt",
      })
    );
  }
  const acceptedAttempt =
    yield* readReleaseAcceptedAttemptSummary(workspaceRoot);
  yield* verifyNewReleaseCandidateIdentity(
    evidence.packet.candidate,
    acceptedAttempt
  );
  const candidate = {
    baseCommit: evidence.packet.candidate.baseCommit,
    contentManifest: evidence.packet.candidate.contentManifest,
    contentSha256: evidence.packet.candidate.contentSha256,
  };
  const attemptId = yield* Schema.decodeUnknownEffect(ReleaseAttemptId)(
    `release-${yield* Clock.currentTimeMillis}`
  ).pipe(
    Effect.mapError(
      () =>
        new ReleaseEvidenceDecodeError({
          evidencePath: "tmp/release-readiness",
          operation: "construct-release-attempt-identity",
        })
    )
  );
  const report = yield* runReleaseReadiness(
    createReleaseReadinessPlan(workspaceRoot),
    attemptId,
    candidate
  ).pipe(
    Effect.tapErrorTag("ReleaseAttemptFailedError", (error) =>
      Effect.gen(function* persistFailedReleaseAttempt() {
        const artifact = yield* persistReleaseAttemptReceipt(
          workspaceRoot,
          error.attempt
        );
        yield* Console.error(formatReleaseReadinessError(error));
        yield* Console.error(`RECEIPT ${artifact.path} (${artifact.sha256})`);
      })
    )
  );
  const artifact = yield* persistReleaseAttemptReceipt(
    workspaceRoot,
    createSuccessfulAttemptReceipt(report, candidate)
  );
  yield* Console.info(renderReleaseReadinessReport(report));
  yield* Console.info(`RECEIPT ${artifact.path} (${artifact.sha256})`);

  return report;
}).pipe(
  Effect.tapErrorTag("CiReleaseCheckFailedError", (error) =>
    Console.error(formatReleaseReadinessError(error))
  ),
  Effect.tapErrorTag("ReleaseEvidenceDigestError", (error) =>
    Console.error(formatReleaseReadinessError(error))
  ),
  Effect.tapErrorTag("ReleaseEvidenceDecodeError", (error) =>
    Console.error(formatReleaseReadinessError(error))
  ),
  Effect.tapErrorTag("ReleaseReadinessCliError", (error) =>
    Console.error(formatReleaseReadinessError(error))
  ),
  Effect.tapErrorTag("ReleaseWorkspacePathError", (error) =>
    Console.error(formatReleaseReadinessError(error))
  ),
  Effect.provide(ReleaseReadinessRuntimeLive)
);

BunRuntime.runMain(program, { disableErrorReporting: true });
