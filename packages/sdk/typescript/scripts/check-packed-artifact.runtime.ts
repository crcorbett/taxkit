import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array as EffectArray,
  Console,
  Data,
  Effect,
  HashSet,
  Match,
  Option,
  Record as EffectRecord,
  Schema,
  Stream,
} from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { ChildProcess } from "effect/unstable/process";

interface CommandResult {
  readonly commandLine: string;
  readonly cwd: string;
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

class PackedArtifactCommandError extends Data.TaggedError(
  "PackedArtifactCommandError"
)<{
  readonly result: CommandResult;
}> {}

class PackedArtifactValidationError extends Data.TaggedError(
  "PackedArtifactValidationError"
)<{
  readonly message: string;
}> {}

const PackageExportTarget = Schema.Struct({
  default: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  types: Schema.optional(Schema.String),
});

const PackageManifest = Schema.Struct({
  dependencies: Schema.Record(Schema.String, Schema.String),
  exports: Schema.Record(Schema.String, PackageExportTarget),
});

const sdkRootUrl = new URL("..", import.meta.url);

const runCommand = (
  label: string,
  command: string,
  args: readonly string[],
  cwd: string
) =>
  Effect.gen(function* runPackedArtifactCommand() {
    const commandLine = EffectArray.prepend(args, command).join(" ");
    yield* Console.info(`$ ${commandLine}`);

    const result = yield* Effect.gen(function* runChildProcess() {
      const handle = yield* ChildProcess.make(command, args, {
        cwd,
        extendEnv: true,
        forceKillAfter: "2 seconds",
        stderr: "pipe",
        stdin: "ignore",
        stdout: "pipe",
      });
      const [stdout, stderr, exitCode] = yield* Effect.all(
        [
          Stream.mkString(Stream.decodeText(handle.stdout)),
          Stream.mkString(Stream.decodeText(handle.stderr)),
          handle.exitCode,
        ],
        { concurrency: "unbounded" }
      );

      return {
        commandLine,
        cwd,
        exitCode: Number(exitCode),
        stderr,
        stdout,
      } satisfies CommandResult;
    }).pipe(
      Effect.mapError(
        (cause) =>
          new PackedArtifactCommandError({
            result: {
              commandLine: `${label}: ${commandLine}`,
              cwd,
              exitCode: 1,
              stderr: String(cause),
              stdout: "",
            },
          })
      )
    );

    return yield* Match.value(result.exitCode).pipe(
      Match.when(0, () => Effect.succeed(result)),
      Match.orElse(() =>
        Effect.fail(
          new PackedArtifactCommandError({
            result,
          })
        )
      )
    );
  });

const PackedArtifactProgram = Effect.gen(function* checkPackedArtifact() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sdkRootPath = yield* path.fromFileUrl(sdkRootUrl);
  const smokeRootPath = yield* Effect.acquireRelease(
    fs.makeTempDirectory({
      directory: sdkRootPath,
      prefix: ".pack-smoke-",
    }),
    (tempPath) =>
      fs.remove(tempPath, { force: true, recursive: true }).pipe(
        Effect.tap(() => Console.info(`Cleanup result: removed ${tempPath}`)),
        Effect.catchCause((cause) =>
          Console.error(
            `Cleanup result: failed to remove ${tempPath}: ${String(cause)}`
          )
        )
      )
  );
  const artifactRootPath = path.join(smokeRootPath, "artifacts");
  const smokePackageRootPath = path.join(
    smokeRootPath,
    "node_modules",
    "@whattax",
    "sdk"
  );
  const smokeEntrypointPath = path.join(smokeRootPath, "smoke.mjs");

  yield* fs.makeDirectory(artifactRootPath, { recursive: true });
  yield* fs.makeDirectory(smokePackageRootPath, { recursive: true });

  const packOutput = yield* runCommand(
    "pack SDK artifact",
    "bun",
    ["pm", "pack", "--destination", artifactRootPath, "--quiet"],
    sdkRootPath
  );
  const tarballPath = yield* Schema.decodeUnknownEffect(Schema.NonEmptyString)(
    packOutput.stdout.trim()
  ).pipe(
    Effect.mapError(
      () =>
        new PackedArtifactValidationError({
          message: "bun pm pack returned no SDK tarball path.",
        })
    )
  );
  const tarListing = yield* runCommand(
    "list SDK artifact",
    "tar",
    ["-tzf", tarballPath],
    sdkRootPath
  );
  const packedFiles = EffectArray.map(
    EffectArray.filter(tarListing.stdout.split("\n"), (packedFile) =>
      packedFile.startsWith("package/")
    ),
    (packedFile) => packedFile.replace(/^package\//u, "")
  );

  yield* runCommand(
    "extract SDK artifact",
    "tar",
    ["-xzf", tarballPath, "--strip-components=1", "-C", smokePackageRootPath],
    sdkRootPath
  );

  const packageManifest = yield* fs
    .readFileString(path.join(smokePackageRootPath, "package.json"))
    .pipe(
      Effect.flatMap(
        Schema.decodeUnknownEffect(Schema.fromJsonString(PackageManifest))
      ),
      Effect.mapError(
        (cause) =>
          new PackedArtifactValidationError({
            message: `Failed to decode packed SDK package.json: ${cause.message}`,
          })
      )
    );
  const packedFileSet = HashSet.fromIterable(packedFiles);
  const exportFailures = EffectArray.flatMap(
    EffectRecord.toEntries(packageManifest.exports),
    ([exportPath, exportTarget]) => {
      const sourceFailures = Option.fromNullishOr(exportTarget.source).pipe(
        Option.match({
          onNone: () => [],
          onSome: () => [
            `${exportPath} must not expose a source condition in the packed manifest.`,
          ],
        })
      );
      const targetFailures = EffectArray.flatMap(
        ["types", "default"] as const,
        (condition) =>
          Option.fromNullishOr(exportTarget[condition]).pipe(
            Option.match({
              onNone: () => [
                `${exportPath} is missing a ${condition} export target.`,
              ],
              onSome: (target) =>
                HashSet.has(packedFileSet, target.replace(/^\.\//u, ""))
                  ? []
                  : [
                      `${exportPath} ${condition} export points to ${target}, which is absent from the packed artifact.`,
                    ],
            })
          )
      );

      return EffectArray.appendAll(sourceFailures, targetFailures);
    }
  );
  const dependencyFailures = EffectArray.flatMap(
    EffectRecord.toEntries(packageManifest.dependencies),
    ([dependencyName, range]) =>
      range.startsWith("workspace:") || range.startsWith("catalog:")
        ? [
            `Packed dependency ${dependencyName} must use a concrete range, received ${range}.`,
          ]
        : []
  );
  const packedFileFailures = EffectArray.flatMap(packedFiles, (packedPath) => {
    const sourceFailures = packedPath.startsWith("src/")
      ? [`Packed artifact must not include source file: ${packedPath}`]
      : [];
    const testFailures =
      packedPath.endsWith(".test.js") ||
      packedPath.endsWith(".test.d.ts") ||
      packedPath.includes("/test/") ||
      packedPath.includes("/type-tests/")
        ? [`Packed artifact must not include test file: ${packedPath}`]
        : [];

    return EffectArray.appendAll(sourceFailures, testFailures);
  });
  const failures = EffectArray.appendAll(
    EffectArray.appendAll(exportFailures, dependencyFailures),
    packedFileFailures
  );

  yield* Match.value(failures.length).pipe(
    Match.when(0, () => Effect.void),
    Match.orElse(() =>
      Effect.fail(
        new PackedArtifactValidationError({
          message: failures.join("\n"),
        })
      )
    )
  );

  yield* fs.writeFileString(
    smokeEntrypointPath,
    `import assert from "node:assert/strict";
import { WhatTax } from "@whattax/sdk";
import * as effect from "@whattax/sdk/effect";
import { au } from "@whattax/sdk/au";
import { auEffect } from "@whattax/sdk/au/effect";
import * as schemas from "@whattax/sdk/schemas";
import * as testing from "@whattax/sdk/testing";

assert.equal(typeof WhatTax.calculate, "function", "root SDK import");
assert.equal(typeof effect.calculateRunRequest, "function", "Effect run import");
assert.equal(typeof effect.calculateReportRequest, "function", "Effect report request import");
assert.equal(typeof effect.calculateReport, "function", "Effect report import");
assert.equal(typeof effect.createClient, "function", "Effect client import");
assert.equal(typeof au.pay.takeHomePay, "function", "AU SDK import");
assert.equal(typeof auEffect.createClient, "function", "AU Effect SDK import");
assert.ok(schemas.CalculatorRunRequest, "schemas request import");
assert.ok(schemas.CalculatorServiceError, "schemas service error import");
assert.ok(schemas.WhatTaxCalculationError, "schemas SDK error import");
assert.ok(testing.AuPayTakeHomeCalculation, "testing import");
`
  );
  yield* runCommand(
    "import packed SDK entrypoints",
    "bun",
    [smokeEntrypointPath],
    smokeRootPath
  );

  yield* Console.info("Packed SDK import smoke passed.");
  yield* Console.info(
    `Packed SDK artifact check passed: ${path.basename(tarballPath)} (${packedFiles.length} files)`
  );
}).pipe(
  Effect.scoped,
  Effect.tapErrorTag("PackedArtifactCommandError", (error) =>
    Console.error(
      [
        `Command failed: ${error.result.commandLine}`,
        `cwd: ${error.result.cwd}`,
        `exitCode: ${error.result.exitCode}`,
        error.result.stdout,
        error.result.stderr,
      ].join("\n")
    )
  ),
  Effect.tapErrorTag("PackedArtifactValidationError", (error) =>
    Console.error(error.message)
  )
);

BunRuntime.runMain(
  PackedArtifactProgram.pipe(Effect.provide(BunServices.layer))
);
