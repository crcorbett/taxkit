import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { docsWorkerMemo } from "@taxkit/infrastructure/website";
import { hashDirectory } from "alchemy/Command/Memo";
import { Effect } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

describe("native Alchemy docs memo", () => {
  test.effect("invalidates for both sibling docs workspaces", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "taxkit-docs-memo-",
      });
      const docsRoot = path.join(root, "apps", "docs");

      yield* Effect.forEach(
        docsWorkerMemo.workspaces,
        (workspace) =>
          Effect.gen(function* () {
            const workspaceRoot = path.resolve(docsRoot, workspace.cwd);
            const sourcePath = path.join(
              workspaceRoot,
              "src",
              "memo-input.txt"
            );
            yield* fileSystem.makeDirectory(path.dirname(sourcePath), {
              recursive: true,
            });
            yield* fileSystem.writeFileString(sourcePath, "before");
            const before = yield* hashDirectory({
              cwd: workspaceRoot,
              memo: {
                include: workspace.include,
                lockfile: workspace.lockfile,
              },
            });
            yield* fileSystem.writeFileString(sourcePath, "after");
            const after = yield* hashDirectory({
              cwd: workspaceRoot,
              memo: {
                include: workspace.include,
                lockfile: workspace.lockfile,
              },
            });

            expect(after).not.toBe(before);
          }),
        { concurrency: 1 }
      );
    }).pipe(Effect.provide(BunServices.layer), Effect.scoped)
  );
});
