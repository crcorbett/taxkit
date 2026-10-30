import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Function as EffectFunction,
  Array,
  Console,
  Effect,
  FileSystem,
  Match,
  Option,
  Path,
  Record,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { DependencySectionsManifest } from "../src/internal/artifact-schemas.js";

class SdkImportReadError extends Schema.TaggedError<
  SdkImportReadError,
  {
    readonly brand: unique symbol;
  }
>()("SdkImportReadError", {
  operation: Schema.Literals([
    "sdk-manifest",
    "http-manifest",
    "entrypoint",
    "search",
  ]),
  reason: Schema.Literals(["read", "decode", "search"]),
}) {}
class SdkImportPolicyError extends Schema.TaggedError<
  SdkImportPolicyError,
  {
    readonly brand: unique symbol;
  }
>()("SdkImportPolicyError", { failures: Schema.Array(Schema.String) }) {}
const blockedHttpApiPackageNames = [
  "@taxkit/api-http",
  "@taxkit/http-api",
] as const;
// This command checks direct source references. The packed/browser checks own
// the separate claim about the complete dependency graph.
export const checkSdkImportBoundaries = Effect.fnUntraced(function* ({
  sdkRoot,
}: {
  readonly sdkRoot: string;
}) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const processes = yield* ChildProcessSpawner.ChildProcessSpawner;
  const manifestJson = Schema.fromJsonString(DependencySectionsManifest);
  const sdkManifest = yield* fs
    .readFileString(path.join(sdkRoot, "package.json"))
    .pipe(
      Effect.mapError(
        () =>
          new SdkImportReadError({
            operation: "sdk-manifest",
            reason: "read",
          })
      ),
      Effect.flatMap((source) =>
        Schema.decodeEffect(manifestJson)(source).pipe(
          Effect.mapError(
            () =>
              new SdkImportReadError({
                operation: "sdk-manifest",
                reason: "decode",
              })
          )
        )
      )
    );
  const httpManifest = yield* fs
    .readFileString(path.resolve(sdkRoot, "../../api/http/package.json"))
    .pipe(
      Effect.mapError(
        () =>
          new SdkImportReadError({
            operation: "http-manifest",
            reason: "read",
          })
      ),
      Effect.flatMap((source) =>
        Schema.decodeEffect(manifestJson)(source).pipe(
          Effect.mapError(
            () =>
              new SdkImportReadError({
                operation: "http-manifest",
                reason: "decode",
              })
          )
        )
      )
    );
  const metadataFailures = Array.appendAll(
    sdkManifest.dependencies.pipe(
      Option.match({
        onNone: () => [],
        onSome: (dependencies) =>
          EffectFunction.pipe(
            Record.keys(dependencies),
            Array.flatMap((name) =>
              EffectBoolean.match(name.startsWith("@taxkit/"), {
                onFalse: () => [],
                onTrue: () => [
                  `SDK runtime metadata must not depend on ${name}.`,
                ],
              })
            )
          ),
      })
    ),
    EffectBoolean.match(
      EffectFunction.pipe(
        Record.values(httpManifest),
        Array.some((section) =>
          EffectFunction.pipe(
            ["taxkit", "@taxkit/sdk"],
            Array.some((packageName) =>
              section.pipe(
                Option.flatMap((dependencies) =>
                  Record.get(dependencies, packageName)
                ),
                Option.isSome
              )
            )
          )
        )
      ),
      {
        onFalse: () => [],
        onTrue: () => [
          "HTTP must not depend on the SDK assembly, including through tests.",
        ],
      }
    )
  );
  const sourceFailures = yield* EffectFunction.pipe(
    blockedHttpApiPackageNames,
    Effect.forEach((packageName) =>
      processes
        .exitCode(
          ChildProcess.make(
            "rg",
            [
              "-q",
              "--glob",
              "!http.ts",
              "--glob",
              "!http-parity.test.ts",
              "--fixed-strings",
              packageName,
              path.join(sdkRoot, "src"),
            ],
            {
              forceKillAfter: "2 seconds",
              stderr: "ignore",
              stdin: "ignore",
              stdout: "ignore",
            }
          )
        )
        .pipe(
          Effect.mapError(
            () =>
              new SdkImportReadError({
                operation: "search",
                reason: "search",
              })
          ),
          Effect.flatMap((code) =>
            Match.value(Number(code)).pipe(
              Match.when(0, () =>
                Effect.succeed([`SDK source must not import ${packageName}.`])
              ),
              Match.when(1, () => Effect.succeed([])),
              Match.orElse(() =>
                Effect.fail(
                  new SdkImportReadError({
                    operation: "search",
                    reason: "search",
                  })
                )
              )
            )
          )
        )
    )
  );
  const entrypoints = [
    "index.ts",
    "au.ts",
    "schemas/index.ts",
    "core.ts",
    "http.ts",
  ] as const;
  const entrypointFailures = yield* EffectFunction.pipe(
    entrypoints,
    Effect.forEach((entrypoint) =>
      fs.readFileString(path.join(sdkRoot, "src", entrypoint)).pipe(
        Effect.mapError(
          () =>
            new SdkImportReadError({
              operation: "entrypoint",
              reason: "read",
            })
        ),
        Effect.map((source) =>
          Array.appendAll(
            EffectBoolean.match(
              entrypoint === "index.ts" &&
                (source.includes("@taxkit/rules-au-") ||
                  source.includes("./au")),
              {
                onFalse: () => [],
                onTrue: () => [
                  "Root SDK entrypoint must not import AU packages or subpaths.",
                ],
              }
            ),
            EffectBoolean.match(
              source.includes("node:") ||
                source.includes("bun:") ||
                source.includes('from "bun"') ||
                source.includes("from 'bun'"),
              {
                onFalse: () => [],
                onTrue: () => [
                  `Browser-safe SDK entrypoint imports a server-only module: src/${entrypoint}`,
                ],
              }
            )
          )
        )
      )
    )
  );
  const failures = Array.appendAll(
    Array.appendAll(metadataFailures, Array.flatten(sourceFailures)),
    Array.flatten(entrypointFailures)
  );
  return yield* Match.value(failures.length).pipe(
    Match.when(0, () => Effect.void),
    Match.orElse(() => Effect.fail(new SdkImportPolicyError({ failures })))
  );
});
if (import.meta.main) {
  BunRuntime.runMain(
    Effect.gen(function* sdkImportCommand() {
      const path = yield* Path.Path;
      const root = yield* path.fromFileUrl(new URL("..", import.meta.url));
      yield* checkSdkImportBoundaries({
        sdkRoot: root,
      });
      yield* Console.info("SDK import boundaries passed.");
    }).pipe(
      Effect.tapErrorTag("SdkImportPolicyError", (error) =>
        Effect.forEach(error.failures, Console.error, { discard: true })
      ),
      Effect.tapErrorTag("SdkImportReadError", (error) =>
        Console.error(
          `SDK import check could not complete: ${error.operation} (${error.reason}).`
        )
      ),
      Effect.provide(BunServices.layer)
    )
  );
}
