import { describe, expect, test } from "bun:test";

import * as BunServices from "@effect/platform-bun/BunServices";
import { docsWorkerMemo } from "@taxkit/infrastructure/website";
import { hashDirectory } from "alchemy/Command/Memo";
import { Effect } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

describe("native Alchemy docs memo", () => {
  test("invalidates for both sibling docs workspaces", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "taxkit-docs-memo-",
        });
        const docsRoot = path.join(root, "apps", "docs");

        for (const workspace of docsWorkerMemo.workspaces) {
          const workspaceRoot = path.resolve(docsRoot, workspace.cwd);
          const sourcePath = path.join(workspaceRoot, "src", "memo-input.txt");
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
        }
      }).pipe(Effect.provide(BunServices.layer), Effect.scoped)
    );
  });
});
