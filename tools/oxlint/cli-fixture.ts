import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import { Array, Effect, FileSystem, Stream } from "effect";
import * as ChildProcess from "effect/process/ChildProcess";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

import { workspaceContracts } from "./workspaces.boundary.js";

const { dirname, join } = nodePath;
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const oxlint = fileURLToPath(
  new URL("../../node_modules/.bin/oxlint", import.meta.url)
);

/** Runs the repository's actual lint binary within the caller's test scope. */
export const lintFiles = Effect.fn("OxlintFixture.lintFiles")(function* (
  paths: readonly string[],
  extraArgs: readonly string[] = [],
  format: "json" | "unix" = "unix",
  configuration = "oxlint.config.ts",
  workingDirectory: string = repositoryRoot
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
      { cwd: workingDirectory, stderr: "pipe", stdout: "pipe" }
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

/** Copies the real lint owners into a scoped root for exact production-path fixtures. */
export const makeIsolatedLintWorkspace = Effect.fn(
  "OxlintFixture.makeIsolatedLintWorkspace"
)(function* () {
  const fs = yield* FileSystem.FileSystem;
  // macOS exposes temp files under /var while child processes use /private/var.
  // Use one physical root for the child cwd, config and checked source paths.
  const workingDirectory = yield* fs
    .makeTempDirectoryScoped({
      prefix: "taxkit-lint-workspace-",
    })
    .pipe(Effect.flatMap((directory) => fs.realPath(directory)));
  yield* fs.makeDirectory(join(workingDirectory, "tools"));
  yield* fs.copy(
    join(repositoryRoot, "tools/oxlint"),
    join(workingDirectory, "tools/oxlint")
  );
  yield* Effect.forEach(
    [
      "oxlint.config.ts",
      "package.json",
      ...Array.map(workspaceContracts, ({ owner }) => `${owner}/package.json`),
    ],
    (path) =>
      Effect.gen(function* () {
        const target = join(workingDirectory, path);
        yield* fs.makeDirectory(dirname(target), { recursive: true });
        yield* fs.copyFile(join(repositoryRoot, path), target);
      }),
    { concurrency: 1, discard: true }
  );
  yield* fs.symlink(
    join(repositoryRoot, "node_modules"),
    join(workingDirectory, "node_modules")
  );
  return {
    configuration: join(workingDirectory, "oxlint.config.ts"),
    workingDirectory,
  };
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
)(function* (
  source: string,
  extension = "ts",
  directory: string = fileURLToPath(new URL("fixtures", import.meta.url))
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* fs.makeTempFileScoped({
    directory,
    prefix: ".generated-taxkit-lint-",
    suffix: `.${extension}`,
  });
  yield* fs.writeFileString(path, source);
  return path;
});
