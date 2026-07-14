import { Array, Console, Effect, Layer, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { ReleaseCommandExecutionError } from "./errors.js";
import { ReleaseCommandOutcome } from "./schemas.js";
import { ReleaseCommandRunner } from "./service.js";

export const ReleaseCommandRunnerLive = Layer.effect(
  ReleaseCommandRunner,
  Effect.gen(function* makeReleaseCommandRunnerLive() {
    const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner;

    return {
      execute: (check) =>
        Effect.gen(function* executeReleaseCheck() {
          const commandLine = Array.prepend(check.args, check.command).join(
            " "
          );
          yield* Console.info(`RUN  [${check.id}] ${commandLine}`);

          const result = yield* Effect.gen(function* runReleaseCheckProcess() {
            const handle = yield* childProcesses.spawn(
              ChildProcess.make(check.command, check.args, {
                cwd: check.cwd,
                extendEnv: true,
                forceKillAfter: "2 seconds",
                stderr: "pipe",
                stdin: "ignore",
                stdout: "pipe",
              })
            );
            const [stdout, stderr, exitCode] = yield* Effect.all(
              [
                Stream.mkString(Stream.decodeText(handle.stdout)),
                Stream.mkString(Stream.decodeText(handle.stderr)),
                handle.exitCode,
              ],
              { concurrency: "unbounded" }
            );

            return new ReleaseCommandOutcome({
              check,
              exitCode: Number(exitCode),
              stderr,
              stdout,
            });
          }).pipe(
            Effect.scoped,
            Effect.mapError(
              (cause) =>
                new ReleaseCommandExecutionError({
                  check,
                  message: String(cause),
                })
            )
          );

          return yield* Console.info(
            `DONE [${check.id}] ${check.label} (exit ${result.exitCode})`
          ).pipe(Effect.as(result));
        }),
    };
  })
);
