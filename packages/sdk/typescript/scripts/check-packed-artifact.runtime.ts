import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Function as EffectFunction,
  Array as EffectArray,
  Console,
  Effect,
  HashSet,
  Match,
  Option,
  Record as EffectRecord,
  Schema,
  Stream,
  Boolean as EffectBoolean,
} from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { ChildProcess } from "effect/process";

import {
  ConditionalPackageExportTarget,
  DependencyRecord,
} from "../src/internal/artifact-schemas.js";

class PackedArtifactCommandError extends Schema.TaggedError<
  PackedArtifactCommandError,
  {
    readonly brand: unique symbol;
  }
>()("PackedArtifactCommandError", {
  exitCode: Schema.Option(Schema.Finite),
  reason: Schema.Literals(["start-or-read", "exit", "output-limit"]),
  stage: Schema.String,
}) {}
class PackedArtifactValidationError extends Schema.TaggedError<
  PackedArtifactValidationError,
  {
    readonly brand: unique symbol;
  }
>()("PackedArtifactValidationError", { message: Schema.String }) {}
const PackageManifest = Schema.Struct({
  dependencies: DependencyRecord,
  exports: Schema.Record(Schema.String, ConditionalPackageExportTarget),
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
      const [stdout, , exitCode] = yield* Effect.all(
        [
          handle.stdout.pipe(
            Stream.mapAccum(
              () => 0,
              (previousBytes, chunk) => {
                const bytes = previousBytes + chunk.byteLength;
                return [bytes, [{ bytes, chunk }]] as const;
              }
            ),
            Stream.mapEffect(({ bytes, chunk }) =>
              EffectBoolean.match(bytes > 1_048_576, {
                onFalse: () => Effect.succeed(chunk),
                onTrue: () =>
                  Effect.fail(
                    new PackedArtifactCommandError({
                      exitCode: Option.none(),
                      reason: "output-limit",
                      stage: label,
                    })
                  ),
              })
            ),
            Stream.decodeText,
            Stream.mkString
          ),
          Stream.runDrain(handle.stderr),
          handle.exitCode,
        ],
        { concurrency: "unbounded" }
      );
      return {
        commandLine,
        cwd,
        exitCode: Number(exitCode),
        stdout,
      };
    }).pipe(
      Effect.mapError((failure) =>
        Match.value(failure).pipe(
          Match.tag("PackedArtifactCommandError", (error) => error),
          Match.orElse(
            () =>
              new PackedArtifactCommandError({
                exitCode: Option.none(),
                reason: "start-or-read",
                stage: label,
              })
          )
        )
      )
    );
    return yield* Match.value(result.exitCode).pipe(
      Match.when(0, () => Effect.succeed(result)),
      Match.orElse(() =>
        Effect.fail(
          new PackedArtifactCommandError({
            exitCode: Option.some(result.exitCode),
            reason: "exit",
            stage: label,
          })
        )
      )
    );
  }).pipe(Effect.scoped);
export const checkPackedArtifact = Effect.gen(function* checkPackedArtifact() {
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
        Effect.catchCause(() =>
          Effect.die(
            new PackedArtifactValidationError({
              message: "Failed to remove the temporary SDK check folder.",
            })
          )
        )
      )
  );
  const artifactRootPath = path.join(smokeRootPath, "artifacts");
  const smokePackageRootPath = path.join(
    smokeRootPath,
    "node_modules",
    "taxkit"
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
  const tarballPath = yield* Schema.decodeEffect(Schema.NonEmptyString)(
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
  const packedFiles = EffectFunction.pipe(
    tarListing.stdout.split("\n"),
    EffectArray.filter((packedFile) => packedFile.startsWith("package/")),
    EffectArray.map((packedFile) => packedFile.replace(/^package\//u, ""))
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
      Effect.mapError(
        () =>
          new PackedArtifactValidationError({
            message: "Failed to read packed SDK package.json.",
          })
      ),
      Effect.flatMap((source) =>
        Schema.decodeEffect(Schema.fromJsonString(PackageManifest))(
          source
        ).pipe(
          Effect.mapError(
            () =>
              new PackedArtifactValidationError({
                message: "Failed to decode packed SDK package.json.",
              })
          )
        )
      )
    );
  const packedFileSet = HashSet.fromIterable(packedFiles);
  const exportFailures = EffectFunction.pipe(
    EffectRecord.toEntries(packageManifest.exports),
    EffectArray.flatMap(([exportPath, exportTarget]) => {
      const sourceFailures = exportTarget.source.pipe(
        Option.match({
          onNone: () => [],
          onSome: () => [
            `${exportPath} must not expose a source condition in the packed manifest.`,
          ],
        })
      );
      const targetFailures = EffectFunction.pipe(
        ["types", "default"] as const,
        EffectArray.flatMap((condition) =>
          EffectRecord.get(exportTarget, condition)
            .pipe(Option.flatten)
            .pipe(
              Option.match({
                onNone: () => [
                  `${exportPath} is missing a ${condition} export target.`,
                ],
                onSome: (target) =>
                  EffectBoolean.match(
                    HashSet.has(packedFileSet, target.replace(/^\.\//u, "")),
                    {
                      onFalse: () => [
                        `${exportPath} ${condition} export points to ${target}, which is absent from the packed artifact.`,
                      ],
                      onTrue: () => [],
                    }
                  ),
              })
            )
        )
      );
      return EffectArray.appendAll(sourceFailures, targetFailures);
    })
  );
  const dependencyFailures = EffectFunction.pipe(
    EffectRecord.toEntries(packageManifest.dependencies),
    EffectArray.flatMap(([dependencyName, range]) =>
      EffectBoolean.match(
        dependencyName.startsWith("@taxkit/") ||
          range.startsWith("workspace:") ||
          range.startsWith("catalog:"),
        {
          onFalse: () => [],
          onTrue: () => [
            `Packed runtime dependency ${dependencyName} must be external and use a concrete range, received ${range}.`,
          ],
        }
      )
    )
  );
  const packedFileFailures = EffectFunction.pipe(
    packedFiles,
    EffectArray.flatMap((packedPath) => {
      const sourceFailures = EffectBoolean.match(
        packedPath.startsWith("src/"),
        {
          onFalse: () => [],
          onTrue: () => [
            `Packed artifact must not include source file: ${packedPath}`,
          ],
        }
      );
      const testFailures = EffectBoolean.match(
        packedPath.endsWith(".test.js") ||
          packedPath.endsWith(".test.d.ts") ||
          packedPath.includes("/test/") ||
          packedPath.includes("/type-tests/"),
        {
          onFalse: () => [],
          onTrue: () => [
            `Packed artifact must not include test file: ${packedPath}`,
          ],
        }
      );
      return EffectArray.appendAll(sourceFailures, testFailures);
    })
  );
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
    path.join(smokeRootPath, "package.json"),
    '{"name":"taxkit-packed-artifact-smoke","private":true,"type":"module"}\n'
  );
  yield* fs.writeFileString(
    smokeEntrypointPath,
    `import assert from "node:assert/strict";
import { TaxKit } from "taxkit";
import * as effect from "taxkit/effect";
import { au } from "taxkit/au";
import { auEffect } from "taxkit/au/effect";
import * as schemas from "taxkit/schemas";
import * as testing from "taxkit/testing";
import * as core from "taxkit/core";
import * as http from "taxkit/http";
import { GrossPay } from "taxkit/au";
import * as australian from "taxkit/au";

assert.equal(import.meta.resolve("taxkit"), new URL("./node_modules/taxkit/dist/index.js", import.meta.url).href, "imports select the extracted archive");
assert.equal(typeof TaxKit.calculate, "function", "root SDK import");
assert.ok(core.Money, "Core entrypoint");
assert.ok(http.TaxKitApi, "HTTP contract entrypoint");
assert.equal(http.CalculatorRunResponse, schemas.CalculatorRunResponse, "one HTTP/SDK Schema identity");
assert.ok(GrossPay, "AU fact Schema import");
assert.equal(Object.hasOwn(core, "CalculatorSchemas"), false, "removed calculator namespace");
for (const name of ["PayRules", "IncomeTaxRules", "StslRules"]) {
  assert.equal(Object.hasOwn(australian, name), false, "removed AU namespace " + name);
}
assert.ok(schemas.MetadataQuery, "named metadata query import");
assert.ok(schemas.HelpQuery, "named help query import");
assert.equal(typeof effect.calculateRunRequest, "function", "Effect run import");
assert.equal(typeof effect.calculateReportRequest, "function", "Effect report request import");
assert.equal(typeof effect.calculateReport, "function", "Effect report import");
assert.equal(typeof effect.createClient, "function", "Effect client import");
assert.equal(typeof au.pay.takeHomePay, "function", "AU SDK import");
assert.equal(typeof auEffect.createClient, "function", "AU Effect SDK import");
assert.ok(schemas.CalculatorRunRequest, "schemas request import");
assert.ok(schemas.CalculatorServiceError, "schemas service error import");
assert.equal(new schemas.CalculatorCapacityExceeded().code, "calculation-capacity", "checked capacity error import");
assert.equal(new schemas.CalculatorOperationTimedOut().code, "calculation-timeout", "checked work timeout import");
assert.equal(new schemas.CalculatorRateLimited().code, "rate-limited", "canonical native rate failure import");
assert.equal(new schemas.CalculatorRateLimited().retry, "wait-then-try-manually", "canonical manual native rate retry");
assert.equal(new schemas.CalculatorAdmissionUnavailable().code, "calculation-admission-unavailable", "canonical native admission failure import");
assert.ok(schemas.TaxKitCalculationError, "schemas SDK error import");
assert.ok(testing.AuPayTakeHomeCalculation, "testing import");
assert.ok(schemas.TaxKitClientDisposedError, "closed-client error import");
assert.ok(schemas.TaxKitClientDisposeError, "disposal error import");
const client = TaxKit.createClient(au.modules.pay2025_26);
assert.equal(typeof client.dispose, "function", "caller-owned disposal");
await client.dispose();
await client.dispose();
const closed = await client.calculations.safe.calculate(testing.AuPayTakeHomeCalculation, {});
assert.equal(closed._tag, "TaxKitFailure", "closed client safe result");
assert.equal(closed.error.error._tag, "TaxKitClientDisposedError", "closed client error");
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
  Effect.mapError((error) =>
    Match.value(error).pipe(
      Match.tag(
        "PlatformError",
        () =>
          new PackedArtifactValidationError({
            message: "SDK check filesystem operation failed.",
          })
      ),
      Match.orElse((failure) => failure)
    )
  ),
  Effect.tapErrorTag("PackedArtifactCommandError", (error) =>
    Console.error(
      `Command failed: ${error.stage} (${error.reason}; exitCode: ${error.exitCode.pipe(Option.match({ onNone: () => "unavailable", onSome: String }))}).`
    )
  ),
  Effect.tapErrorTag("PackedArtifactValidationError", (error) =>
    Console.error(error.message)
  ),
  Effect.scoped
);
if (import.meta.main) {
  BunRuntime.runMain(
    checkPackedArtifact.pipe(Effect.provide(BunServices.layer))
  );
}
