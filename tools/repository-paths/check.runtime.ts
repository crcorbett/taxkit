import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Array, Console, Effect, Match, Option, Schema, Stream } from "effect";
import * as FileSystem from "effect/FileSystem";
import { pipe } from "effect/Function";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import {
  decodeReadableRepositoryText,
  inspectRepositoryText,
  makeRepositoryPathReport,
  renderRepositoryPathReport,
} from "./policy.js";
import {
  RepositoryFileReadError,
  RepositoryInventoryError,
  RepositoryPolicyViolationError,
  RepositoryRelativeFile,
} from "./schemas.js";

const repositoryRootUrl = new URL("../..", import.meta.url);
const TrackedFileInventory = Schema.Array(RepositoryRelativeFile);

export const checkRepositoryPaths = (repositoryRoot: string) =>
  Effect.gen(function* checkTrackedRepositoryText() {
    const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const inventory = yield* Effect.gen(function* listTrackedFiles() {
      const handle = yield* childProcesses.spawn(
        ChildProcess.make("git", ["ls-files", "-z"], {
          cwd: repositoryRoot,
          extendEnv: true,
          forceKillAfter: "2 seconds",
          stderr: "pipe",
          stdin: "ignore",
          stdout: "pipe",
        })
      );
      const [stdout, [exitCode]] = yield* Effect.all(
        [
          Stream.runCollect(handle.stdout),
          Effect.zip(handle.exitCode, Stream.runDrain(handle.stderr), {
            concurrent: true,
          }),
        ],
        { concurrency: "unbounded" }
      );

      yield* Match.value(Number(exitCode)).pipe(
        Match.when(0, () => Effect.void),
        Match.orElse((code) =>
          Effect.fail(
            new RepositoryInventoryError({
              exitCode: code,
              operation: "list-tracked-files",
            })
          )
        )
      );

      const bytes = Uint8Array.from(Array.flatMap(stdout, Array.fromIterable));
      const decoded = yield* Effect.try({
        catch: () =>
          new RepositoryInventoryError({
            operation: "decode-tracked-files",
          }),
        try: () => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      });

      return yield* pipe(
        decoded.split("\0"),
        Array.filter((file) => file.length > 0),
        Schema.decodeUnknownEffect(TrackedFileInventory),
        Effect.mapError(
          () =>
            new RepositoryInventoryError({
              operation: "decode-tracked-files",
            })
        )
      );
    }).pipe(
      Effect.scoped,
      Effect.catchTag("PlatformError", () =>
        Effect.fail(
          new RepositoryInventoryError({
            operation: "list-tracked-files",
          })
        )
      )
    );

    const inspected = yield* Effect.forEach(
      inventory,
      (file) => {
        const filePath = path.join(repositoryRoot, file);

        return fileSystem.readLink(filePath).pipe(
          Effect.map((target) => new TextEncoder().encode(target)),
          Effect.catchTag("PlatformError", () => fileSystem.readFile(filePath)),
          Effect.mapError(() => new RepositoryFileReadError({ file })),
          Effect.map((bytes) =>
            decodeReadableRepositoryText(bytes).pipe(
              Option.match({
                onNone: () => ({ binary: true, findings: [] }),
                onSome: (text) => ({
                  binary: false,
                  findings: inspectRepositoryText(file, text),
                }),
              })
            )
          )
        );
      },
      { concurrency: 16 }
    );
    const binaryFiles = Array.filter(inspected, (file) => file.binary).length;

    return makeRepositoryPathReport({
      binaryFiles,
      findings: Array.flatMap(inspected, (file) => file.findings),
      textFiles: inspected.length - binaryFiles,
      trackedFiles: inventory.length,
    });
  });

const program = Effect.gen(function* repositoryPathMain() {
  const path = yield* Path.Path;
  const repositoryRoot = yield* path.fromFileUrl(repositoryRootUrl).pipe(
    Effect.mapError(
      () =>
        new RepositoryInventoryError({
          operation: "resolve-repository-root",
        })
    )
  );

  return yield* checkRepositoryPaths(repositoryRoot);
}).pipe(
  Effect.tap((report) => Console.info(renderRepositoryPathReport(report))),
  Effect.tap((report) =>
    Match.value(report.findings.length).pipe(
      Match.when(0, () => Effect.void),
      Match.orElse(() =>
        Effect.fail(new RepositoryPolicyViolationError({ report }))
      )
    )
  ),
  Effect.tapErrorTag("RepositoryInventoryError", (error) =>
    Console.error(
      `Repository path check failed during ${error.operation}${Option.fromNullishOr(
        error.exitCode
      ).pipe(
        Option.match({
          onNone: () => "",
          onSome: (exitCode) => ` (exit ${exitCode})`,
        })
      )}.`
    )
  ),
  Effect.tapErrorTag("RepositoryFileReadError", (error) =>
    Console.error(`Repository path check could not read ${error.file}.`)
  ),
  Effect.tapErrorTag("RepositoryPolicyViolationError", () => Effect.void),
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
