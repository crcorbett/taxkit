import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Config, Console, Effect } from "effect";
import * as Path from "effect/Path";

import {
  formatReleaseReadinessError,
  ReleaseEvidenceDecodeError,
  ReleaseWorkspacePathError,
} from "./errors.js";
import {
  persistReleasePresentationReceipt,
  readAndVerifyReleaseAttemptReceipt,
} from "./evidence.boundary.js";
import { ReleasePresentationConfig } from "./schemas.js";

const workspaceRootUrl = new URL("../../../..", import.meta.url);

const program = Effect.gen(function* presentReleaseAttempt() {
  const path = yield* Path.Path;
  const workspaceRoot = yield* path
    .fromFileUrl(workspaceRootUrl)
    .pipe(
      Effect.mapError(
        () =>
          new ReleaseWorkspacePathError({ target: "repository workspace root" })
      )
    );
  const config = yield* Config.schema(ReleasePresentationConfig).pipe(
    Effect.mapError(
      () =>
        new ReleaseEvidenceDecodeError({
          evidencePath: "RELEASE_ATTEMPT_PATH and RELEASE_ATTEMPT_SHA256",
          operation: "decode-presentation-config",
        })
    )
  );
  const receipt = yield* readAndVerifyReleaseAttemptReceipt(workspaceRoot, {
    path: config.RELEASE_ATTEMPT_PATH,
    sha256: config.RELEASE_ATTEMPT_SHA256,
  });
  const presentation = yield* persistReleasePresentationReceipt(workspaceRoot, {
    attemptId: receipt.attemptId,
    nonClaim: receipt.nonClaim,
    postcondition: receipt.postcondition,
    schemaVersion: 1,
    sourceReceipt: {
      path: config.RELEASE_ATTEMPT_PATH,
      sha256: config.RELEASE_ATTEMPT_SHA256,
    },
    terminalState: receipt.terminalState,
  });

  yield* Console.info(
    [
      `PRESENT [${receipt.attemptId}] ${receipt.terminalState}`,
      `source: ${config.RELEASE_ATTEMPT_PATH} (${config.RELEASE_ATTEMPT_SHA256})`,
      `last successful check: ${receipt.lastSuccessfulCheck ?? "none"}`,
      `postcondition: ${receipt.postcondition}`,
      `nonclaim: ${receipt.nonClaim}`,
      `sidecar: ${presentation.path} (${presentation.sha256})`,
    ].join("\n")
  );
}).pipe(
  Effect.tapErrorTag("ReleaseEvidenceDecodeError", (error) =>
    Console.error(formatReleaseReadinessError(error))
  ),
  Effect.tapErrorTag("ReleaseWorkspacePathError", (error) =>
    Console.error(formatReleaseReadinessError(error))
  ),
  Effect.provide(BunServices.layer)
);

BunRuntime.runMain(program, { disableErrorReporting: true });
