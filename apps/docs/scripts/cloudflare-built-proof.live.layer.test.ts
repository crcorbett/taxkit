import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import {
  ByteSize,
  ConfigProvider,
  Deferred,
  Effect,
  Fiber,
  FileSystem,
  Layer,
  Option,
  Path,
  Ref,
  Result,
  Sink,
  Stream,
} from "effect";
import { FetchHttpClient } from "effect/http";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { TestClock } from "effect/testing";

import {
  BuiltProofError,
  LocalCloudflareBuiltProof,
} from "./cloudflare-built-proof.boundary.js";
import {
  digestBuiltProofDirectory,
  LocalCloudflareBuiltProofLive,
  readBuiltProofOutput,
} from "./cloudflare-built-proof.live.layer.js";

it.live(
  "hashes sorted path, NUL, opaque file bytes, NUL and omits only the root README",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fs.makeTempDirectoryScoped();
      yield* fs.makeDirectory(path.join(directory, "nested"));
      yield* fs.writeFileString(path.join(directory, "z.txt"), "last");
      yield* fs.writeFileString(
        path.join(directory, "README.md"),
        "ignored explanation"
      );
      yield* fs.writeFileString(
        path.join(directory, "nested/b.txt"),
        "βeta\u0000body"
      );
      yield* fs.writeFileString(path.join(directory, "a.txt"), "alpha\n");
      // Independent Python hashlib observations of the explicit bytes above.
      expect(yield* digestBuiltProofDirectory(directory, false)).toBe(
        "5004a30f0bd80a2396ae2d87c333d95739cb7e29a97b6462ee6360c240a729f3"
      );
      expect(yield* digestBuiltProofDirectory(directory, true)).toBe(
        "e10d32ab716a77c32f08ea34133c7558b0a08de52df4984001504fb496e5e532"
      );
    }).pipe(Effect.provide(BunServices.layer))
);

it.effect("counts UTF-8 bytes across chunks at the exact output limit", () =>
  Effect.gen(function* () {
    const bytes = new TextEncoder().encode("é".repeat(524_288));
    const output = yield* readBuiltProofOutput(
      Stream.make(bytes.subarray(0, 1), bytes.subarray(1)),
      "build"
    );
    expect(output).toBe("é".repeat(524_288));
    const overflow = yield* readBuiltProofOutput(
      Stream.make(bytes, new Uint8Array([120])),
      "build"
    ).pipe(Effect.result);
    expect(overflow).toEqual(
      Result.fail(
        new BuiltProofError({ operation: "build", reason: "output-limit" })
      )
    );
  })
);

it.live(
  "output overflow closes the actual scoped process rather than leaving its pending pipe alive",
  () =>
    Effect.gen(function* () {
      const pid = yield* Ref.make(Option.none<ChildProcessSpawner.ProcessId>());
      // Deliberately raw fixture bytes run only in this observed child process.
      // The application code uses native process/stream ownership throughout.
      const result = yield* Effect.gen(function* () {
        const process = yield* ChildProcess.make(
          "bun",
          [
            "-e",
            'process.stdout.write("x".repeat(1048577));setInterval(()=>{},1000)',
          ],
          {
            extendEnv: true,
            forceKillAfter: "2 seconds",
            stderr: "pipe",
            stdin: "ignore",
            stdout: "pipe",
          }
        );
        yield* Ref.set(pid, Option.some(process.pid));
        return yield* Effect.all(
          [
            readBuiltProofOutput(process.stdout, "build"),
            Stream.runDrain(process.stderr),
            process.exitCode,
          ],
          { concurrency: 3 }
        );
      }).pipe(Effect.scoped, Effect.result);
      expect(result).toEqual(
        Result.fail(
          new BuiltProofError({ operation: "build", reason: "output-limit" })
        )
      );
      const childPid = yield* Ref.get(pid).pipe(
        Effect.flatMap(Effect.fromOption)
      );
      const probe = yield* ChildProcess.make(
        "/bin/kill",
        ["-0", String(childPid)],
        {
          stderr: "ignore",
          stdin: "ignore",
          stdout: "ignore",
        }
      );
      expect(Number(yield* probe.exitCode)).not.toBe(0);
    }).pipe(Effect.provide(BunServices.layer)),
  10_000
);

it.live(
  "the real nonzero build exit fails the closed operation before reading output metadata or acquiring Chromium",
  () =>
    Effect.gen(function* () {
      const starts = yield* Ref.make(0);
      const failedBuild = Layer.effect(
        ChildProcessSpawner.ChildProcessSpawner,
        Effect.gen(function* () {
          const native = yield* ChildProcessSpawner.ChildProcessSpawner;
          return ChildProcessSpawner.make(() =>
            Ref.update(starts, (count) => count + 1).pipe(
              Effect.andThen(
                native.spawn(
                  ChildProcess.make(
                    "bun",
                    [
                      "-e",
                      'process.stderr.write("private-fixture-value");process.exit(37)',
                    ],
                    {
                      extendEnv: true,
                      forceKillAfter: "2 seconds",
                      stderr: "pipe",
                      stdin: "ignore",
                      stdout: "pipe",
                    }
                  )
                )
              )
            )
          );
        })
      ).pipe(Layer.provide(BunServices.layer));
      const fixtureFs = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.makeNoop({ remove: () => Effect.void })
      );
      const result = yield* Effect.gen(function* () {
        const proof = yield* LocalCloudflareBuiltProof;
        return yield* proof.verifyBuiltDeployment({
          captureScreenshots: false,
        });
      }).pipe(
        Effect.provide(
          LocalCloudflareBuiltProofLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                BunServices.layer,
                FetchHttpClient.layer,
                failedBuild,
                fixtureFs
              )
            )
          )
        ),
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({ PATH: "fixture-path" })
        ),
        Effect.result
      );
      expect(result).toEqual(
        Result.fail(new BuiltProofError({ operation: "build", reason: "exit" }))
      );
      expect(yield* Ref.get(starts)).toBe(1);
    }),
  10_000
);

it.effect(
  "one total five-minute deadline interrupts a stalled build and closes its native process scope",
  () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const closed = yield* Ref.make(0);
      const stalled = Layer.succeed(
        ChildProcessSpawner.ChildProcessSpawner,
        ChildProcessSpawner.make(() =>
          Effect.acquireRelease(
            Deferred.succeed(started, true).pipe(
              Effect.as(
                ChildProcessSpawner.makeHandle({
                  all: Stream.never,
                  exitCode: Effect.never,
                  getInputFd: () => Sink.drain,
                  getOutputFd: () => Stream.empty,
                  isRunning: Effect.succeed(true),
                  kill: () => Effect.void,
                  pid: ChildProcessSpawner.ProcessId(1),
                  stderr: Stream.empty,
                  stdin: Sink.drain,
                  stdout: Stream.never,
                  unref: Effect.succeed(Effect.void),
                })
              )
            ),
            () => Ref.update(closed, (count) => count + 1)
          )
        )
      );
      const fixtureFs = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.makeNoop({ remove: () => Effect.void })
      );
      const fiber = yield* Effect.gen(function* () {
        const proof = yield* LocalCloudflareBuiltProof;
        return yield* proof.verifyBuiltDeployment({
          captureScreenshots: false,
        });
      }).pipe(
        Effect.provide(
          LocalCloudflareBuiltProofLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                BunServices.layer,
                FetchHttpClient.layer,
                stalled,
                fixtureFs
              )
            )
          )
        ),
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({ PATH: "fixture-path" })
        ),
        Effect.result,
        Effect.forkScoped
      );
      yield* Deferred.await(started);
      yield* TestClock.adjust("5 minutes");
      expect(yield* Fiber.join(fiber)).toEqual(
        Result.fail(
          new BuiltProofError({ operation: "local-worker", reason: "timeout" })
        )
      );
      expect(yield* Ref.get(closed)).toBe(1);
    })
);

it.live(
  "a file that grows beyond its metadata still stops at the native byte-stream limit",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fs.makeTempDirectoryScoped();
      const file = path.join(directory, "fixture.txt");
      yield* fs.writeFileString(file, "small initial file");
      const info = yield* fs.stat(file);
      const reads = yield* Ref.make(0);
      const chunk = new Uint8Array(65_536);
      const fixtureFs = FileSystem.makeNoop({
        glob: () => Effect.succeed(["fixture.txt"]),
        stat: () => Effect.succeed({ ...info, size: ByteSize.bytes(1) }),
        stream: () =>
          Stream.range(1, 1025).pipe(
            Stream.map(() => chunk),
            Stream.tap(() => Ref.update(reads, (count) => count + 1))
          ),
      });
      expect(
        yield* digestBuiltProofDirectory(directory, false).pipe(
          Effect.provideService(FileSystem.FileSystem, fixtureFs),
          Effect.result
        )
      ).toEqual(
        Result.fail(
          new BuiltProofError({ operation: "digest", reason: "output-limit" })
        )
      );
      expect(yield* Ref.get(reads)).toBe(1025);
    }).pipe(Effect.provide(BunServices.layer))
);
