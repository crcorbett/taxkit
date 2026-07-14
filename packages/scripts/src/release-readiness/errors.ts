import { Data, Match } from "effect";

import type { ReleaseCheck, ReleaseCommandOutcome } from "./schemas.js";

export class ReleaseCommandExecutionError extends Data.TaggedError(
  "ReleaseCommandExecutionError"
)<{
  readonly check: ReleaseCheck;
  readonly message: string;
}> {}

export class ReleaseCheckFailedError extends Data.TaggedError(
  "ReleaseCheckFailedError"
)<{
  readonly outcome: ReleaseCommandOutcome;
}> {}

export class ReleaseWorkspacePathError extends Data.TaggedError(
  "ReleaseWorkspacePathError"
)<{
  readonly message: string;
  readonly url: string;
}> {}

export type ReleaseReadinessError =
  | ReleaseCheckFailedError
  | ReleaseCommandExecutionError
  | ReleaseWorkspacePathError;

export const formatReleaseReadinessError = Match.typeTags<
  ReleaseReadinessError,
  string
>()({
  ReleaseCheckFailedError: ({ outcome }) =>
    [
      `FAIL [${outcome.check.id}] ${outcome.check.label}`,
      `command: ${outcome.check.command} ${outcome.check.args.join(" ")}`,
      `cwd: ${outcome.check.cwd}`,
      `exitCode: ${outcome.exitCode}`,
      `stdout:\n${outcome.stdout}`,
      `stderr:\n${outcome.stderr}`,
    ].join("\n"),
  ReleaseCommandExecutionError: ({ check, message }) =>
    [
      `FAIL [${check.id}] ${check.label}`,
      `command: ${check.command} ${check.args.join(" ")}`,
      `cwd: ${check.cwd}`,
      `execution error: ${message}`,
    ].join("\n"),
  ReleaseWorkspacePathError: ({ message, url }) =>
    [
      "FAIL [workspace-path] Resolve repository root",
      `url: ${url}`,
      `path error: ${message}`,
    ].join("\n"),
});
