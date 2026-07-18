import { describe, expect, test } from "bun:test";

import * as BunServices from "@effect/platform-bun/BunServices";
import { Effect, Match, Result } from "effect";
import * as FileSystem from "effect/FileSystem";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { checkRepositoryPaths } from "./check.runtime.js";
import { RepositoryRelativeFile } from "./schemas.js";

describe("repository path runtime", () => {
  test("maps a failed tracked-file inventory to a safe typed error", async () => {
    const result = await Effect.gen(function* inventoryFailure() {
      const fileSystem = yield* FileSystem.FileSystem;
      const directory = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "taxkit-path-check-",
      });

      return yield* checkRepositoryPaths(directory).pipe(Effect.result);
    }).pipe(
      Effect.scoped,
      Effect.provide(BunServices.layer),
      Effect.runPromise
    );

    Result.match(result, {
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("RepositoryInventoryError", (failure) => {
            expect(failure.operation).toBe("list-tracked-files");
          }),
          Match.orElse(() => expect.unreachable())
        ),
      onSuccess: () => expect.unreachable(),
    });
  });

  test("maps an unreadable tracked file to its safe repository-relative location", async () => {
    const result = await Effect.gen(function* trackedFileReadFailure() {
      const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner;
      const fileSystem = yield* FileSystem.FileSystem;
      const directory = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "taxkit-path-check-",
      });
      const trackedFile = "removed-after-index.md";

      yield* childProcesses
        .exitCode(
          ChildProcess.make("git", ["init", "--quiet"], {
            cwd: directory,
            stderr: "ignore",
            stdin: "ignore",
            stdout: "ignore",
          })
        )
        .pipe(
          Effect.flatMap((exitCode) =>
            Match.value(Number(exitCode)).pipe(
              Match.when(0, () => Effect.void),
              Match.orElse(() => Effect.die("git init failed"))
            )
          )
        );
      yield* fileSystem.writeFileString(
        `${directory}/${trackedFile}`,
        "portable text"
      );
      yield* childProcesses
        .exitCode(
          ChildProcess.make("git", ["add", "--", trackedFile], {
            cwd: directory,
            stderr: "ignore",
            stdin: "ignore",
            stdout: "ignore",
          })
        )
        .pipe(
          Effect.flatMap((exitCode) =>
            Match.value(Number(exitCode)).pipe(
              Match.when(0, () => Effect.void),
              Match.orElse(() => Effect.die("git add failed"))
            )
          )
        );
      yield* fileSystem.remove(`${directory}/${trackedFile}`);

      return yield* checkRepositoryPaths(directory).pipe(Effect.result);
    }).pipe(
      Effect.scoped,
      Effect.provide(BunServices.layer),
      Effect.runPromise
    );

    Result.match(result, {
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("RepositoryFileReadError", (failure) => {
            expect(failure.file).toBe(
              RepositoryRelativeFile.make("removed-after-index.md")
            );
          }),
          Match.orElse(() => expect.unreachable())
        ),
      onSuccess: () => expect.unreachable(),
    });
  });
});
