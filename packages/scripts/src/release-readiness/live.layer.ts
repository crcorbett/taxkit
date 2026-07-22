import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array as EffectArray,
  Console,
  Effect,
  FileSystem,
  Layer,
  Ref,
  Result,
  Stream,
} from "effect";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { ReleaseCommandExecutionError } from "./errors.js";
import { sha256Text } from "./evidence.boundary.js";
import {
  releaseExcerptLimit,
  ReleaseCommandOutcome,
  ReleaseDetailArtifact,
} from "./schemas.js";
import type { ReleaseCheck, ReleaseTerminalState } from "./schemas.js";
import { ReleaseCommandRunner } from "./service.js";

type RedactionMode =
  | "credential-separator"
  | "credential-value"
  | "credential-value-start"
  | "home-user"
  | "normal";

const sensitiveMarker =
  /(^|[\s"'=(]|file:\/\/|[A-Za-z][A-Za-z0-9_.-]*:)(?:\/(?:Users|home)\/|\/[A-Za-z]:\/(?:Users|home)\/|[A-Za-z]:[\\/](?:Users|home)[\\/]|\\\\[^\\/\s]+[\\/](?:Users|home)[\\/])|ghp_|github_pat_|sk-|\b(?:authorization|token|api[_-]?key|secret|password|bearer)\b/iu;

export const makeReleaseOutputRedactor = () => {
  let mode: RedactionMode = "normal";
  let pending = "";
  let separatorWhitespace = "";

  // oxlint-disable-next-line eslint/complexity -- one bounded streaming state machine prevents helper sprawl and cross-chunk leaks
  const process = (final: boolean): string => {
    let output = "";

    while (pending.length > 0) {
      if (mode === "credential-separator") {
        const character = pending[0] ?? "";
        pending = pending.slice(1);
        if (character === ":" || character === "=") {
          output += `${separatorWhitespace}${character}`;
          separatorWhitespace = "";
          mode = "credential-value-start";
        } else if (/\s/u.test(character)) {
          separatorWhitespace += character;
        } else {
          output += `${separatorWhitespace}<redacted>`;
          separatorWhitespace = "";
          mode = "credential-value";
        }
        continue;
      }

      if (mode === "credential-value-start") {
        const character = pending[0] ?? "";
        pending = pending.slice(1);
        if (/\s/u.test(character)) {
          output += character;
        } else {
          output += "<redacted>";
          mode = "credential-value";
        }
        continue;
      }

      if (mode === "credential-value") {
        const character = pending[0] ?? "";
        pending = pending.slice(1);
        if (/\s/u.test(character)) {
          output += character;
          mode = "normal";
        }
        continue;
      }

      if (mode === "home-user") {
        const character = pending[0] ?? "";
        pending = pending.slice(1);
        if (character === "/" || character === "\\" || /\s/u.test(character)) {
          output += character;
          mode = "normal";
        }
        continue;
      }

      const marker = sensitiveMarker.exec(pending);
      if (marker) {
        output += pending.slice(0, marker.index);
        pending = pending.slice(marker.index + marker[0].length);
        const normalizedMarker = marker[0].toLowerCase();
        const [, homeBoundary] = marker;
        if (homeBoundary !== undefined) {
          output += `${homeBoundary}<home>`;
          mode = "home-user";
        } else if (
          normalizedMarker === "ghp_" ||
          normalizedMarker === "github_pat_" ||
          normalizedMarker === "sk-"
        ) {
          output += "<redacted>";
          mode = "credential-value";
        } else {
          output += marker[0];
          mode =
            normalizedMarker === "bearer"
              ? "credential-value-start"
              : "credential-separator";
        }
        continue;
      }

      if (final) {
        output += pending;
        pending = "";
      } else {
        const safeLength = Math.max(0, pending.length - 256);
        output += pending.slice(0, safeLength);
        pending = pending.slice(safeLength);
      }
      break;
    }

    if (final && mode === "credential-separator") {
      output += separatorWhitespace;
      separatorWhitespace = "";
    }

    return output;
  };

  return {
    end: () => process(true),
    write: (chunk: string) => {
      pending += chunk;
      return process(false);
    },
  };
};

export const ReleaseCommandRunnerLive = Layer.effect(
  ReleaseCommandRunner,
  Effect.gen(function* makeReleaseCommandRunnerLive() {
    const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    return {
      execute: (check: ReleaseCheck) =>
        Effect.gen(function* executeReleaseCheck() {
          const commandLine = EffectArray.prepend(
            check.args,
            check.command
          ).join(" ");
          const detailDirectory = path.join(
            check.cwd,
            "tmp",
            "release-readiness"
          );
          yield* fileSystem.makeDirectory(detailDirectory, { recursive: true });
          yield* Console.info(`RUN  [${check.id}] ${commandLine}`);

          const handle = yield* childProcesses
            .spawn(
              ChildProcess.make(check.command, check.args, {
                cwd: check.cwd,
                extendEnv: true,
                forceKillAfter: "2 seconds",
                stderr: "pipe",
                stdin: "ignore",
                stdout: "pipe",
              })
            )
            .pipe(
              Effect.mapError(
                () =>
                  new ReleaseCommandExecutionError({
                    check,
                    message: "process did not start",
                    observedExitCode: null,
                    stderrDetail: null,
                    stdoutDetail: null,
                    terminalState: "start-failure",
                  })
              )
            );

          const drain = (
            channel: "stderr" | "stdout",
            stream: Stream.Stream<Uint8Array, unknown>
          ) =>
            Effect.gen(function* drainReleaseOutput() {
              const detailFile = yield* fileSystem.makeTempFile({
                directory: detailDirectory,
                prefix: `${check.id}-${channel}-`,
                suffix: ".log",
              });
              const detailPath = path.relative(check.cwd, detailFile);
              const excerpt = yield* Ref.make("");
              const redactor = makeReleaseOutputRedactor();
              const encoder = new TextEncoder();

              yield* Effect.gen(function* writeSanitizedDetail() {
                const file = yield* fileSystem.open(detailFile, { flag: "w" });
                const write = (text: string) =>
                  text.length === 0
                    ? Effect.void
                    : file
                        .writeAll(encoder.encode(text))
                        .pipe(
                          Effect.andThen(
                            Ref.update(excerpt, (current) =>
                              `${current}${text}`.slice(0, releaseExcerptLimit)
                            )
                          )
                        );

                yield* Stream.runForEach(Stream.decodeText(stream), (chunk) =>
                  write(redactor.write(chunk))
                );
                yield* write(redactor.end());
                yield* file.sync;
              }).pipe(Effect.scoped);

              const retained = yield* fileSystem.readFileString(detailFile);
              const digest = yield* sha256Text(retained);

              return {
                artifact: new ReleaseDetailArtifact({
                  path: detailPath,
                  sha256: digest,
                }),
                excerpt: yield* Ref.get(excerpt),
              };
            }).pipe(
              Effect.mapError(
                () =>
                  new ReleaseCommandExecutionError({
                    check,
                    message: `${channel} detail could not be retained`,
                    observedExitCode: null,
                    stderrDetail: null,
                    stdoutDetail: null,
                    terminalState: "early-pipe-close",
                  })
              )
            );

          const [stderrResult, stdoutResult, exitResult] = yield* Effect.all(
            [
              drain("stderr", handle.stderr).pipe(Effect.result),
              drain("stdout", handle.stdout).pipe(Effect.result),
              handle.exitCode.pipe(
                Effect.mapError(
                  () =>
                    new ReleaseCommandExecutionError({
                      check,
                      message: "process exit could not be observed",
                      observedExitCode: null,
                      stderrDetail: null,
                      stdoutDetail: null,
                      terminalState: "interrupted",
                    })
                ),
                Effect.result
              ),
            ],
            { concurrency: "unbounded" }
          );
          const observedExitCode = Result.isSuccess(exitResult)
            ? Number(exitResult.success)
            : null;
          const stderrDetail = Result.isSuccess(stderrResult)
            ? stderrResult.success.artifact
            : null;
          const stdoutDetail = Result.isSuccess(stdoutResult)
            ? stdoutResult.success.artifact
            : null;

          if (Result.isFailure(exitResult)) {
            return yield* new ReleaseCommandExecutionError({
              check,
              message: exitResult.failure.message,
              observedExitCode,
              stderrDetail,
              stdoutDetail,
              terminalState: "interrupted",
            });
          }
          if (Result.isFailure(stderrResult)) {
            return yield* new ReleaseCommandExecutionError({
              check,
              message: stderrResult.failure.message,
              observedExitCode,
              stderrDetail,
              stdoutDetail,
              terminalState: stderrResult.failure.terminalState,
            });
          }
          if (Result.isFailure(stdoutResult)) {
            return yield* new ReleaseCommandExecutionError({
              check,
              message: stdoutResult.failure.message,
              observedExitCode,
              stderrDetail,
              stdoutDetail,
              terminalState: stdoutResult.failure.terminalState,
            });
          }
          const stderr = stderrResult.success;
          const stdout = stdoutResult.success;
          const exitCode = exitResult.success;
          const terminalState: ReleaseTerminalState =
            Number(exitCode) === 0 ? "success" : "non-zero-exit";
          const result = new ReleaseCommandOutcome({
            check,
            exitCode: Number(exitCode),
            stderrDetail: stderr.artifact,
            stderrExcerpt: stderr.excerpt,
            stdoutDetail: stdout.artifact,
            stdoutExcerpt: stdout.excerpt,
            terminalState,
          });

          return yield* Console.info(
            `DONE [${check.id}] ${check.label} (exit ${result.exitCode})`
          ).pipe(Effect.as(result));
        }).pipe(
          Effect.scoped,
          Effect.catchTag(
            "PlatformError",
            () =>
              new ReleaseCommandExecutionError({
                check,
                message: "release evidence filesystem boundary failed",
                observedExitCode: null,
                stderrDetail: null,
                stdoutDetail: null,
                terminalState: "missing-detail",
              })
          )
        ),
    };
  })
).pipe(Layer.provide(BunServices.layer));
