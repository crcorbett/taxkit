import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import {
  Cause,
  Crypto,
  Deferred,
  Effect,
  Exit,
  Fiber,
  FileSystem,
  Layer,
  Match,
  PlatformError,
  Ref,
  Schema,
  Sink,
  Stream,
} from "effect";
import { forEach as forEachArray } from "effect/Array";
import * as Path from "effect/Path";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

import { ReleaseCommandRunnerLive } from "./live.layer.js";
import { ReleaseCheck } from "./schemas.js";
import { ReleaseCommandRunner } from "./service.js";

const workspaceRoot = new URL("../../../..", import.meta.url);

describe("release readiness live layer", () => {
  it.effect(
    "retains complete sanitized process streams with bounded excerpts",
    () =>
      Effect.gen(function* testLiveReleaseOutputBoundary() {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const repositoryRoot = yield* path.fromFileUrl(workspaceRoot);
        const runner = yield* ReleaseCommandRunner;
        const separator = String.fromCodePoint(47);
        const macHome = ["", "Users", "example", "mac-project"].join(separator);
        const linuxHome = ["", "home", "alice", "linux-project"].join(
          separator
        );
        const windowsSeparator = String.fromCodePoint(92);
        const windowsHome = ["C:", "Users", "alice", "windows-project"].join(
          windowsSeparator
        );
        const uncHome = [
          "",
          "",
          "server",
          "Users",
          "alice",
          "unc-project",
        ].join(windowsSeparator);
        const fileUrlMacHome = `file:${separator}${separator}${macHome}`;
        const fileUrlLinuxHome = `file:${separator}${separator}${linuxHome}`;
        const diagnosticMacHome = `path:${macHome}`;
        const diagnosticLinuxHome = `path:${linuxHome}`;
        const diagnosticWindowsHome = `path:${windowsHome}`;
        const diagnosticUncHome = `path:${uncHome}`;
        const stdoutFixture = `safe token = visible-secret ${macHome} ${linuxHome} ${windowsHome} ${uncHome} ${fileUrlMacHome} ${fileUrlLinuxHome} ${diagnosticMacHome} ${diagnosticLinuxHome} ${diagnosticWindowsHome} ${diagnosticUncHome}\n${"bounded-padding-".repeat(128)}tail-marker\n`;
        const stdoutLiteral = yield* Schema.encodeEffect(
          Schema.fromJsonString(Schema.String)
        )(stdoutFixture);
        const outcome = yield* runner.execute(
          new ReleaseCheck({
            args: [
              "-e",
              `process.stdout.write(${stdoutLiteral}); process.stderr.write("Authorization: Bearer bearer-secret\\n")`,
            ],
            command: "bun",
            cwd: repositoryRoot,
            id: "verification",
            label: "Live process boundary fixture",
          })
        );

        expect(outcome.terminalState).toBe("success");
        expect(outcome.stdoutExcerpt.length).toBeLessThanOrEqual(4096);
        expect(outcome.stderrExcerpt.length).toBeLessThanOrEqual(4096);
        expect(outcome.stdoutExcerpt).toContain("tail-marker");
        expect(outcome.stdoutDetail).not.toBeNull();
        expect(outcome.stderrDetail).not.toBeNull();

        if (outcome.stdoutDetail !== null && outcome.stderrDetail !== null) {
          const stdout = yield* fileSystem.readFileString(
            path.join(repositoryRoot, outcome.stdoutDetail.path)
          );
          const stderr = yield* fileSystem.readFileString(
            path.join(repositoryRoot, outcome.stderrDetail.path)
          );

          expect(stdout).toContain("safe token = <redacted>");
          expect(stdout).toContain("<home>/mac-project");
          expect(stdout).toContain("<home>/linux-project");
          expect(stdout).toContain(
            ["<home>", "windows-project"].join(windowsSeparator)
          );
          expect(stdout).toContain(
            ["<home>", "unc-project"].join(windowsSeparator)
          );
          expect(stdout).not.toContain("visible-secret");
          forEachArray(
            [
              macHome,
              linuxHome,
              windowsHome,
              uncHome,
              fileUrlMacHome,
              fileUrlLinuxHome,
              diagnosticMacHome,
              diagnosticLinuxHome,
              diagnosticWindowsHome,
              diagnosticUncHome,
            ],
            (sensitivePath) => {
              expect(stdout).not.toContain(sensitivePath);
              expect(outcome.stdoutExcerpt).not.toContain(sensitivePath);
              const user = sensitivePath.includes("example")
                ? "example"
                : "alice";
              const rawHomePrefix = sensitivePath.slice(
                0,
                sensitivePath.indexOf(user) + user.length
              );
              expect(stdout).not.toContain(rawHomePrefix);
              expect(outcome.stdoutExcerpt).not.toContain(rawHomePrefix);
            }
          );
          expect(stderr).toContain("Authorization: <redacted>");
          expect(stderr).not.toContain("bearer-secret");
        }
      }).pipe(
        Effect.provide(
          ReleaseCommandRunnerLive.pipe(Layer.provideMerge(BunServices.layer))
        )
      )
  );
});

const commandFixture = new ReleaseCheck({
  args: [],
  command: "controlled-command",
  cwd: "/unused-fixture-root",
  id: "verification",
  label: "Controlled command lifecycle",
});
const nativeFault = PlatformError.badArgument({
  description: "TAXKIT_SECRET_SENTINEL",
  method: "controlled-native-fault",
  module: "ChildProcessSpawner",
});

it.effect.each(["start", "stderr", "stdout", "exit", "digest"] as const)(
  "preserves native %s failure and closes its process scope",
  (failure) =>
    Effect.gen(function* testCommandFailureBoundary() {
      const fileSystem = yield* FileSystem.FileSystem;
      const root = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "taxkit-release-runner-",
      });
      const closed = yield* Ref.make(0);
      const handle = ChildProcessSpawner.makeHandle({
        all: Stream.empty,
        exitCode:
          failure === "exit"
            ? Effect.fail(nativeFault)
            : Effect.succeed(ChildProcessSpawner.ExitCode(2)),
        getInputFd: () => Sink.drain,
        getOutputFd: () => Stream.empty,
        isRunning: Effect.succeed(false),
        kill: () => Effect.void,
        pid: ChildProcessSpawner.ProcessId(1),
        stderr:
          failure === "stderr"
            ? Stream.fail(nativeFault)
            : Stream.make(new TextEncoder().encode("safe stderr")),
        stdin: Sink.drain,
        stdout:
          failure === "stdout"
            ? Stream.fail(nativeFault)
            : Stream.make(new TextEncoder().encode("safe stdout")),
        unref: Effect.succeed(Effect.void),
      });
      const spawner = ChildProcessSpawner.make(() =>
        failure === "start"
          ? Effect.fail(nativeFault)
          : Effect.acquireRelease(Effect.succeed(handle), () =>
              Ref.update(closed, (count) => count + 1)
            )
      );
      const runnerLayer = ReleaseCommandRunnerLive.pipe(
        Layer.provide(
          Layer.merge(
            BunServices.layer,
            Layer.merge(
              Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, spawner),
              failure === "digest"
                ? Layer.succeed(
                    Crypto.Crypto,
                    Crypto.make({
                      digest: () => Effect.fail(nativeFault),
                      randomBytes: (size) => new Uint8Array(size),
                    })
                  )
                : Layer.empty
            )
          )
        )
      );
      const error = yield* ReleaseCommandRunner.pipe(
        Effect.flatMap((runner) =>
          runner.execute(new ReleaseCheck({ ...commandFixture, cwd: root }))
        ),
        Effect.provide(runnerLayer),
        Effect.flip
      );
      expect(error._tag).toBe("ReleaseCommandExecutionError");
      expect(error.terminalState).toBe(
        Match.value(failure).pipe(
          Match.when("start", () => "start-failure"),
          Match.when("exit", () => "interrupted"),
          Match.orElse(() => "early-pipe-close")
        )
      );
      expect(error.observedExitCode).toBe(
        failure === "start" || failure === "exit" ? null : 2
      );
      expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
      expect(yield* Ref.get(closed)).toBe(failure === "start" ? 0 : 1);
      if (failure === "stderr") {
        expect(error.stderrDetail).toBeNull();
        expect(error.stdoutDetail).not.toBeNull();
      }
      if (failure === "digest") {
        expect(error.stdoutDetail).toBeNull();
        expect(error.stderrDetail).toBeNull();
      }
      if (failure === "stdout") {
        expect(error.stdoutDetail).toBeNull();
        expect(error.stderrDetail).not.toBeNull();
      }
    }).pipe(Effect.provide(BunServices.layer))
);

it.effect("interrupts both output streams and closes the command scope", () =>
  Effect.gen(function* testCommandInterruption() {
    const fileSystem = yield* FileSystem.FileSystem;
    const root = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-release-interruption-",
    });
    const started = yield* Deferred.make<boolean>();
    const startedCount = yield* Ref.make(0);
    const streamClosures = yield* Ref.make(0);
    const commandClosures = yield* Ref.make(0);
    const blockedStream = Stream.fromEffect(
      Effect.acquireRelease(
        Ref.updateAndGet(startedCount, (count) => count + 1).pipe(
          Effect.flatMap((count) =>
            count === 2 ? Deferred.succeed(started, true) : Effect.void
          )
        ),
        () => Ref.update(streamClosures, (count) => count + 1)
      ).pipe(Effect.andThen(Effect.never))
    );
    const scopedBlockedStream = blockedStream.pipe(Stream.scoped);
    const handle = ChildProcessSpawner.makeHandle({
      all: Stream.empty,
      exitCode: Effect.never,
      getInputFd: () => Sink.drain,
      getOutputFd: () => Stream.empty,
      isRunning: Effect.succeed(true),
      kill: () => Effect.void,
      pid: ChildProcessSpawner.ProcessId(1),
      stderr: scopedBlockedStream,
      stdin: Sink.drain,
      stdout: scopedBlockedStream,
      unref: Effect.succeed(Effect.void),
    });
    const runnerLayer = ReleaseCommandRunnerLive.pipe(
      Layer.provide(
        Layer.merge(
          BunServices.layer,
          Layer.succeed(
            ChildProcessSpawner.ChildProcessSpawner,
            ChildProcessSpawner.make(() =>
              Effect.acquireRelease(Effect.succeed(handle), () =>
                Ref.update(commandClosures, (count) => count + 1)
              )
            )
          )
        )
      )
    );
    const fiber = yield* ReleaseCommandRunner.pipe(
      Effect.flatMap((runner) =>
        runner.execute(new ReleaseCheck({ ...commandFixture, cwd: root }))
      ),
      Effect.provide(runnerLayer),
      Effect.forkScoped
    );
    yield* Deferred.await(started);
    yield* Fiber.interrupt(fiber);
    const exit = yield* Fiber.await(fiber);
    expect(Exit.isFailure(exit)).toBe(true);
    Exit.match(exit, {
      onFailure: (cause) => expect(Cause.hasInterruptsOnly(cause)).toBe(true),
      onSuccess: () => expect.fail("Interrupted command cannot succeed."),
    });
    expect(yield* Ref.get(streamClosures)).toBe(2);
    expect(yield* Ref.get(commandClosures)).toBe(1);
  }).pipe(Effect.provide(BunServices.layer))
);

it.effect(
  "fails safely before spawning when the detail directory cannot be created",
  () =>
    Effect.gen(function* testCommandDirectoryFailure() {
      const fileSystem = yield* FileSystem.FileSystem;
      const runnerLayer = ReleaseCommandRunnerLive.pipe(
        Layer.provide(
          Layer.merge(
            BunServices.layer,
            Layer.merge(
              Layer.succeed(FileSystem.FileSystem, {
                ...fileSystem,
                makeDirectory: () => Effect.fail(nativeFault),
              }),
              Layer.succeed(
                ChildProcessSpawner.ChildProcessSpawner,
                ChildProcessSpawner.make(() =>
                  Effect.die(
                    "Must not spawn before making the detail directory."
                  )
                )
              )
            )
          )
        )
      );
      const error = yield* ReleaseCommandRunner.pipe(
        Effect.flatMap((runner) => runner.execute(commandFixture)),
        Effect.provide(runnerLayer),
        Effect.flip
      );
      expect(error.terminalState).toBe("missing-detail");
      expect(error.observedExitCode).toBeNull();
      expect(error.stdoutDetail).toBeNull();
      expect(error.stderrDetail).toBeNull();
      expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
    }).pipe(Effect.provide(BunServices.layer))
);
