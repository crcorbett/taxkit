import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array,
  Console,
  Effect,
  FileSystem,
  Match,
  Option,
  Path,
  Record,
  Schema,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { DependencySectionsManifest } from "./schemas.js";

class SdkImportReadError extends Schema.TaggedError<SdkImportReadError>()(
  "SdkImportReadError",
  {
    operation: Schema.Literals([
      "sdk-manifest",
      "http-manifest",
      "entrypoint",
      "search",
    ]),
    reason: Schema.Literals(["read", "decode", "search"]),
  }
) {}

class SdkImportPolicyError extends Schema.TaggedError<SdkImportPolicyError>()(
  "SdkImportPolicyError",
  { failures: Schema.Array(Schema.String) }
) {}

const blockedHttpApiPackageNames = [
  "@taxkit/api-http",
  "@taxkit/http-api",
] as const;

// This command checks direct source references. The packed/browser checks own
// the separate claim about the complete dependency graph.
export const checkSdkImportBoundaries = (sdkRoot: string) =>
  Effect.gen(function* checkDirectSdkImports() {
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
      Array.flatMap(blockedHttpApiPackageNames, (packageName) =>
        Array.some(Record.values(sdkManifest), (section) =>
          section.pipe(
            Option.flatMap((dependencies) =>
              Record.get(dependencies, packageName)
            ),
            Option.isSome
          )
        )
          ? [`SDK package metadata must not depend on ${packageName}.`]
          : []
      ),
      Array.some(Record.values(httpManifest), (section) =>
        section.pipe(
          Option.flatMap((dependencies) =>
            Record.get(dependencies, "@taxkit/sdk")
          ),
          Option.isSome
        )
      )
        ? []
        : [
            "HTTP API package metadata must depend on @taxkit/sdk for the transport integration direction.",
          ]
    );
    const sourceFailures = yield* Effect.forEach(
      blockedHttpApiPackageNames,
      (packageName) =>
        processes
          .exitCode(
            ChildProcess.make(
              "rg",
              ["-q", "--fixed-strings", packageName, path.join(sdkRoot, "src")],
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
    );
    const entrypoints = ["index.ts", "au.ts", "schemas/index.ts"] as const;
    const entrypointFailures = yield* Effect.forEach(
      entrypoints,
      (entrypoint) =>
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
              entrypoint === "index.ts" &&
                (source.includes("@taxkit/rules-au-") ||
                  source.includes("./au"))
                ? [
                    "Root SDK entrypoint must not import AU packages or subpaths.",
                  ]
                : [],
              source.includes("node:") ||
                source.includes("bun:") ||
                source.includes('from "bun"') ||
                source.includes("from 'bun'")
                ? [
                    `Browser-safe SDK entrypoint imports a server-only module: src/${entrypoint}`,
                  ]
                : []
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
      yield* checkSdkImportBoundaries(root);
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
