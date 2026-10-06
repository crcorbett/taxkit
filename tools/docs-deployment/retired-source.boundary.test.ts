import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { Array, Effect, FileSystem, Path, Result } from "effect";

import { readDeploymentSha256 } from "./input.boundary.js";
import { readRetiredDocsSourceBundle } from "./retired-source.boundary.js";
import {
  retiredDocsSourceBundleByteLimit,
  retiredDocsSourceBundlePath,
} from "./retired-source.schemas.js";

const repositoryRootUrl = new URL("../..", import.meta.url);

describe("retained docs source addressability", () => {
  test.effect(
    "reads and reconstructs all 49 original sources in a scoped directory",
    () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* path.fromFileUrl(repositoryRootUrl);
        const bundle = yield* readRetiredDocsSourceBundle(root);
        const isolated = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "taxkit-retained-docs-source-",
        });
        expect(bundle.sourceFiles).toHaveLength(49);
        expect(bundle.sourceCommit).toBe(
          "5d5544d0af639b430d53536c9bfbbbf9e37e8516"
        );
        const oldAssetHeaders = yield* Effect.fromOption(
          Array.findFirst(
            bundle.sourceFiles,
            (source) => source.path === "apps/docs/public/_headers"
          )
        );
        expect(oldAssetHeaders.text).toBe(
          "/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n"
        );
        yield* Effect.forEach(bundle.sourceFiles, (source) =>
          Effect.gen(function* reconstructRetainedDocsSource() {
            const target = path.join(isolated, source.path);
            yield* fileSystem.makeDirectory(path.dirname(target), {
              recursive: true,
            });
            yield* fileSystem.writeFileString(target, source.text);
            expect(yield* fileSystem.readFileString(target)).toBe(source.text);
            expect(yield* readDeploymentSha256(isolated, source.path)).toBe(
              source.sha256
            );
            expect((yield* fileSystem.stat(target)).size).toBe(
              BigInt(source.bytes)
            );
          })
        );
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );

  test.effect.each(["changed", "oversized", "missing"] as const)(
    "refuses a %s bundle with a safe error",
    (fault) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* path.fromFileUrl(repositoryRootUrl);
        const isolated = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "taxkit-retained-docs-refusal-",
        });
        const target = path.join(isolated, retiredDocsSourceBundlePath);
        if (fault !== "missing") {
          yield* fileSystem.makeDirectory(path.dirname(target), {
            recursive: true,
          });
          const text =
            fault === "oversized"
              ? "x".repeat(retiredDocsSourceBundleByteLimit + 1)
              : `${yield* fileSystem.readFileString(
                  path.join(root, retiredDocsSourceBundlePath)
                )}TAXKIT_SECRET_SENTINEL`;
          yield* fileSystem.writeFileString(target, text);
        }
        const result = yield* readRetiredDocsSourceBundle(isolated).pipe(
          Effect.result
        );
        Result.match(result, {
          onFailure: (error) => {
            expect(error._tag).toBe("RetiredDocsSourceError");
            expect(error.operation).toBe(
              fault === "missing" ? "read-bundle" : "verify-bundle"
            );
            expect(String(error)).not.toContain(isolated);
            expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
          },
          onSuccess: () => expect.unreachable(),
        });
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
});
