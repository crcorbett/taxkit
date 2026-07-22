import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Array, Console, Effect, Match, Stream } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import {
  readHgi206Json,
  repositoryRootFromUrl,
  restoreChangedPaths,
} from "./input.boundary.js";
import {
  Candidate,
  Failed,
  FixtureCorpus,
  hgi206Paths,
  Hgi206CommandError,
  Hgi206InputError,
  JourneyDetail,
  Manifest,
  ObservationCorpus,
  Receipt,
  receiptPaths,
  Results,
  Scenarios,
  targetCommit,
} from "./schemas.js";
import type {
  JourneyDetail as JourneyDetailType,
  Receipt as ReceiptType,
} from "./schemas.js";
import {
  renderManifestAggregateSource,
  validateHgi206Evidence,
} from "./service.js";

const repositoryRootUrl = new URL("../../..", import.meta.url);

const sha256 = (source: string) =>
  Effect.sync(() =>
    new Bun.CryptoHasher("sha256").update(source).digest("hex")
  );

const readHash = (repositoryRoot: string, target: string) =>
  Effect.gen(function* readHgi206Hash() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const resolvedTarget = path.isAbsolute(target)
      ? target
      : path.join(repositoryRoot, target);
    const source = yield* fileSystem
      .readFileString(resolvedTarget)
      .pipe(Effect.mapError(() => new Hgi206InputError({ target })));

    return yield* sha256(source);
  });

const listChangedPaths = (repositoryRoot: string) =>
  Effect.gen(function* listChangedHgi206Paths() {
    const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner;
    const inventories = yield* Effect.forEach(
      [
        {
          arguments: ["diff", "--name-only", "-z", targetCommit, "--"],
          target: `git diff --name-only ${targetCommit}`,
        },
        {
          arguments: ["ls-files", "-z", "--others", "--exclude-standard"],
          target: "git ls-files --others --exclude-standard",
        },
      ],
      ({ arguments: commandArguments, target }) =>
        Effect.gen(function* readGitPathInventory() {
          const handle = yield* childProcesses.spawn(
            ChildProcess.make("git", commandArguments, {
              cwd: repositoryRoot,
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
            { concurrency: 1 }
          );
          yield* Match.value(Number(exitCode)).pipe(
            Match.when(0, () => Effect.void),
            Match.orElse((code) =>
              Effect.fail(new Hgi206CommandError({ exitCode: code, target }))
            )
          );

          return yield* restoreChangedPaths(
            Uint8Array.from(Array.flatMap(stdout, Array.fromIterable))
          );
        }).pipe(Effect.scoped),
      { concurrency: 1 }
    );

    return [...new Set(inventories.flat())].toSorted();
  }).pipe(Effect.scoped);

export const checkHgi206 = (repositoryRoot: string) =>
  Effect.gen(function* checkHgi206Program() {
    const manifest = yield* readHgi206Json(
      repositoryRoot,
      hgi206Paths.manifest,
      Manifest
    );
    const candidate = yield* readHgi206Json(
      repositoryRoot,
      hgi206Paths.candidate,
      Candidate
    );
    const failed = yield* readHgi206Json(
      repositoryRoot,
      hgi206Paths.failed,
      Failed
    );
    const fixtures = yield* readHgi206Json(
      repositoryRoot,
      hgi206Paths.fixtures,
      FixtureCorpus
    );
    const observations = yield* readHgi206Json(
      repositoryRoot,
      hgi206Paths.observations,
      ObservationCorpus
    );
    const results = yield* readHgi206Json(
      repositoryRoot,
      hgi206Paths.results,
      Results
    );
    const scenarios = yield* readHgi206Json(
      repositoryRoot,
      hgi206Paths.scenarios,
      Scenarios
    );
    const receipts = yield* Effect.forEach(
      receiptPaths,
      (target) =>
        readHgi206Json(repositoryRoot, target, Receipt).pipe(
          Effect.map((receipt): readonly [string, ReceiptType] => [
            target,
            receipt,
          ])
        ),
      { concurrency: 1 }
    );
    const details = yield* Effect.forEach(
      receipts,
      ([, receipt]) =>
        readHgi206Json(repositoryRoot, receipt.detailPath, JourneyDetail).pipe(
          Effect.map((detail): readonly [string, JourneyDetailType] => [
            receipt.detailPath,
            detail,
          ])
        ),
      { concurrency: 1 }
    );
    const hashPaths = [
      ...new Set([
        ...manifest.files.map((member) => member.path),
        hgi206Paths.failed,
        hgi206Paths.fixtures,
        hgi206Paths.observations,
        hgi206Paths.results,
        ...receiptPaths,
        ...receipts.map(([, receipt]) => receipt.detailPath),
      ]),
    ].toSorted();
    const hashes = yield* Effect.forEach(
      hashPaths,
      (target) =>
        readHash(repositoryRoot, target).pipe(
          Effect.map((hash): readonly [string, string] => [target, hash])
        ),
      { concurrency: 1 }
    );
    const hashMap = new Map(hashes);
    const changedPaths = yield* listChangedPaths(repositoryRoot);
    const manifestAggregate = yield* sha256(
      renderManifestAggregateSource(manifest.files, hashMap)
    );
    const changedPathDigest = yield* sha256(
      changedPaths
        .toSorted()
        .map((path) => `${path}\n`)
        .join("")
    );

    return yield* validateHgi206Evidence({
      candidate,
      changedPathDigest,
      changedPaths,
      failed,
      fixtures,
      hashes: hashMap,
      journeyDetails: new Map(details),
      manifest,
      manifestAggregate,
      observations,
      receipts: new Map(receipts),
      results,
      scenarios,
    });
  });

const program = Effect.gen(function* hgi206Main() {
  const repositoryRoot = yield* repositoryRootFromUrl(repositoryRootUrl);
  const report = yield* checkHgi206(repositoryRoot);
  yield* Console.info(
    `HGI-206 self-check passed: manifest=${report.manifestDigest}; changed-paths=${report.changedPathDigest}; contradictions=${report.resultCount}.`
  );
}).pipe(
  Effect.tapErrorTag("Hgi206CommandError", (error) =>
    Console.error(
      `FAIL [command] target=${error.target}; recovery=repair local command execution; details=git status; postcondition=changed-path inventory is observable (exit ${error.exitCode}).`
    )
  ),
  Effect.tapErrorTag("Hgi206InputError", (error) =>
    Console.error(
      `FAIL [input] target=${error.target}; recovery=repair the Schema-decoded HGI-206 evidence contract; details=${error.target}; postcondition=all ingress decodes.`
    )
  ),
  Effect.tapErrorTag("Hgi206InvariantError", (error) =>
    Console.error(
      `FAIL [${error.invariant}] target=${error.target}; recovery=${error.recovery}; details=${error.detailsPath}; postcondition=${error.postcondition}.`
    )
  ),
  Effect.scoped,
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
