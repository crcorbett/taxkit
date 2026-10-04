import { fileURLToPath } from "node:url";

import { Effect, FileSystem, Stream } from "effect";
import * as ChildProcess from "effect/process/ChildProcess";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const oxlint = fileURLToPath(
  new URL("../../node_modules/.bin/oxlint", import.meta.url)
);

/** Runs the repository's actual lint binary within the caller's test scope. */
export const lintFiles = Effect.fn("OxlintFixture.lintFiles")(function* (
  paths: readonly string[],
  extraArgs: readonly string[] = [],
  format: "json" | "unix" = "unix",
  configuration = "oxlint.config.ts"
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const child = yield* spawner.spawn(
    ChildProcess.make(
      oxlint,
      [
        "-c",
        configuration,
        "--disable-nested-config",
        "--no-error-on-unmatched-pattern",
        `--format=${format}`,
        ...extraArgs,
        ...paths,
      ],
      { cwd: repositoryRoot, stderr: "pipe", stdout: "pipe" }
    )
  );
  const [exitCode, stdout, stderr] = yield* Effect.all(
    [
      child.exitCode,
      Stream.mkString(Stream.decodeText(child.stdout)),
      Stream.mkString(Stream.decodeText(child.stderr)),
    ],
    { concurrency: "unbounded" }
  );
  return { exitCode, output: `${stdout}${stderr}`, stdout };
});

/** Removes an exact configured fixture on success, failure or interruption. */
export const writeLintFixture = Effect.fn("OxlintFixture.writeLintFixture")(
  function* (path: string, source: string) {
    const fs = yield* FileSystem.FileSystem;
    yield* Effect.acquireRelease(Effect.succeed(path), (ownedPath) =>
      fs.remove(ownedPath, { force: true }).pipe(Effect.orDie)
    );
    yield* fs.writeFileString(path, source);
    return path;
  }
);

/** The platform owns unique temporary names and their scoped removal. */
export const writeTemporaryLintFixture = Effect.fn(
  "OxlintFixture.writeTemporaryLintFixture"
)(function* (source: string, extension = "ts", directory?: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* fs.makeTempFileScoped({
    directory,
    prefix: ".generated-taxkit-lint-",
    suffix: `.${extension}`,
  });
  yield* fs.writeFileString(path, source);
  return path;
});
