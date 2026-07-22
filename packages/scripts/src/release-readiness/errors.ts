import { Data, Match } from "effect";

import type {
  ReleaseAttemptReceipt,
  ReleaseCheck,
  ReleaseCommandOutcome,
  ReleaseDetailArtifact,
  ReleaseTerminalState,
} from "./schemas.js";

export class ReleaseCommandExecutionError extends Data.TaggedError(
  "ReleaseCommandExecutionError"
)<{
  readonly check: ReleaseCheck;
  readonly message: string;
  readonly observedExitCode: number | null;
  readonly stderrDetail: ReleaseDetailArtifact | null;
  readonly stdoutDetail: ReleaseDetailArtifact | null;
  readonly terminalState: ReleaseTerminalState;
}> {}

export class ReleaseCheckFailedError extends Data.TaggedError(
  "ReleaseCheckFailedError"
)<{
  readonly outcome: ReleaseCommandOutcome;
}> {}

export class ReleaseAttemptFailedError extends Data.TaggedError(
  "ReleaseAttemptFailedError"
)<{
  readonly attempt: ReleaseAttemptReceipt;
}> {}

export class ReleaseEvidenceDecodeError extends Data.TaggedError(
  "ReleaseEvidenceDecodeError"
)<{
  readonly evidencePath: string;
  readonly operation: string;
}> {}

export class ReleaseWorkspacePathError extends Data.TaggedError(
  "ReleaseWorkspacePathError"
)<{
  readonly target: "repository workspace root";
}> {}

export type ReleaseReadinessError =
  | ReleaseAttemptFailedError
  | ReleaseCheckFailedError
  | ReleaseCommandExecutionError
  | ReleaseEvidenceDecodeError
  | ReleaseWorkspacePathError;

export const formatReleaseReadinessError = Match.typeTags<
  ReleaseReadinessError,
  string
>()({
  ReleaseAttemptFailedError: ({ attempt }) =>
    [
      `FAIL [${attempt.failedCheck ?? "release-readiness"}] ${attempt.terminalState}`,
      `attempt: ${attempt.attemptId}`,
      `target: ${attempt.target}`,
      `exitCode: ${attempt.observedExitCode ?? "unavailable"}`,
      `last successful check: ${attempt.lastSuccessfulCheck ?? "none"}`,
      ...attempt.detailArtifacts.map(
        (artifact) => `detail: ${artifact.path} (${artifact.sha256})`
      ),
      `provenance: ${attempt.provenance}`,
      `postcondition: ${attempt.postcondition}`,
      `recovery: ${attempt.recovery}`,
      `resume: ${attempt.resumeTrigger}`,
      `rollback: ${attempt.rollback}`,
      `limitation: ${attempt.limitation}`,
      `nonclaim: ${attempt.nonClaim}`,
    ].join("\n"),
  ReleaseCheckFailedError: ({ outcome }) =>
    [
      `FAIL [${outcome.check.id}] ${outcome.terminalState}`,
      `exitCode: ${outcome.exitCode ?? "unavailable"}`,
      `stdout detail: ${outcome.stdoutDetail?.path ?? "unavailable"}`,
      `stderr detail: ${outcome.stderrDetail?.path ?? "unavailable"}`,
      "recovery: inspect retained sanitized detail; do not rerun merely to repair presentation",
    ].join("\n"),
  ReleaseCommandExecutionError: ({
    check,
    stderrDetail,
    stdoutDetail,
    terminalState,
  }) =>
    [
      `FAIL [${check.id}] ${terminalState}`,
      `stdout detail: ${stdoutDetail?.path ?? "unavailable"}`,
      `stderr detail: ${stderrDetail?.path ?? "unavailable"}`,
      "recovery: retain this attempt; do not rerun until the named boundary has materially changed",
    ].join("\n"),
  ReleaseEvidenceDecodeError: ({ evidencePath, operation }) =>
    [
      "FAIL [release-evidence] decode retained evidence",
      `target: ${evidencePath}`,
      `operation: ${operation}`,
      "recovery: repair the retained packet or inventory; do not infer a release result",
    ].join("\n"),
  ReleaseWorkspacePathError: ({ target }) =>
    [
      "FAIL [workspace-path] Resolve repository root",
      `target: ${target}`,
      "operation: resolve-workspace-root",
      "recovery: invoke the repository-owned runtime from a valid checkout; do not expose host paths in terminal output",
    ].join("\n"),
});
