import {
  Array as EffectArray,
  Console,
  Crypto,
  Effect,
  FileSystem,
  Layer,
  Ref,
  Result,
  Stream,
} from "effect";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { ReleaseCommandExecutionError } from "./errors.js";
import { sha256Text } from "./evidence.boundary.js";
import { releaseOutputRedactor } from "./output-redaction.js";
import {
  releaseExcerptLimit,
  ReleaseCommandOutcome,
  ReleaseDetailArtifact,
} from "./schemas.js";
import type { ReleaseCheck, ReleaseTerminalState } from "./schemas.js";
import { ReleaseCommandRunner } from "./service.js";

export const ReleaseCommandRunnerLive = Layer.effect(
  ReleaseCommandRunner,
  Effect.gen(function* makeReleaseCommandRunnerLive() {
    const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const crypto = yield* Crypto.Crypto;

    return {
      execute: Effect.fn("ReleaseCommandRunner.execute")(
        (check: ReleaseCheck) =>
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
            yield* fileSystem.makeDirectory(detailDirectory, {
              recursive: true,
            });
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
                const redactor = yield* releaseOutputRedactor;
                const encoder = new TextEncoder();

                yield* Effect.gen(function* writeSanitizedDetail() {
                  const file = yield* fileSystem.open(detailFile, {
                    flag: "w",
                  });
                  const write = (text: string) =>
                    text.length === 0
                      ? Effect.void
                      : file
                          .writeAll(encoder.encode(text))
                          .pipe(
                            Effect.andThen(
                              Ref.update(excerpt, (current) =>
                                `${current}${text}`.slice(-releaseExcerptLimit)
                              )
                            )
                          );

                  yield* Stream.runForEach(Stream.decodeText(stream), (chunk) =>
                    redactor.write(chunk).pipe(Effect.flatMap(write))
                  );
                  yield* redactor.end.pipe(Effect.flatMap(write));
                  yield* file.sync;
                }).pipe(Effect.scoped);

                const retained = yield* fileSystem.readFileString(detailFile);
                const digest = yield* sha256Text(retained).pipe(
                  Effect.provideService(Crypto.Crypto, crypto)
                );

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
              return yield* Effect.fail(
                new ReleaseCommandExecutionError({
                  check,
                  message: exitResult.failure.message,
                  observedExitCode,
                  stderrDetail,
                  stdoutDetail,
                  terminalState: "interrupted",
                })
              );
            }
            if (Result.isFailure(stderrResult)) {
              return yield* Effect.fail(
                new ReleaseCommandExecutionError({
                  check,
                  message: stderrResult.failure.message,
                  observedExitCode,
                  stderrDetail,
                  stdoutDetail,
                  terminalState: stderrResult.failure.terminalState,
                })
              );
            }
            if (Result.isFailure(stdoutResult)) {
              return yield* Effect.fail(
                new ReleaseCommandExecutionError({
                  check,
                  message: stdoutResult.failure.message,
                  observedExitCode,
                  stderrDetail,
                  stdoutDetail,
                  terminalState: stdoutResult.failure.terminalState,
                })
              );
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
            Effect.catchTag("PlatformError", () =>
              Effect.fail(
                new ReleaseCommandExecutionError({
                  check,
                  message: "release evidence filesystem boundary failed",
                  observedExitCode: null,
                  stderrDetail: null,
                  stdoutDetail: null,
                  terminalState: "missing-detail",
                })
              )
            )
          )
      ),
    };
  })
);
