import nodePath from "node:path";

import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import {
  Data,
  Match,
  Function as EffectFunction,
  Effect,
  Exit,
  FileSystem,
} from "effect";

import {
  lintFiles,
  makeIsolatedLintWorkspace,
  writeLintFixture,
} from "./cli-fixture.js";

class FixtureConsumerFailed extends Data.TaggedError("FixtureConsumerFailed") {}

it.effect.each([
  { failed: false, name: "success", outcome: Effect.void },
  {
    failed: true,
    name: "failure",
    outcome: Effect.fail(new FixtureConsumerFailed()),
  },
  { failed: true, name: "interruption", outcome: Effect.interrupt },
])("removes admitted lint fixtures after $name", ({ outcome, failed }) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const directory = yield* fs.makeTempDirectoryScoped();
    const path = nodePath.join(directory, "fixture.ts");
    const exit = yield* Effect.scoped(
      Effect.gen(function* () {
        yield* writeLintFixture({
          path,
          source: "export const value = 1;",
        });
        expect(yield* fs.exists(path)).toBeTruthy();
        yield* outcome;
      })
    ).pipe(Effect.exit);
    EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
      expect(actual).toBe(failed);
    });
    expect(!(yield* fs.exists(path))).toBeTruthy();
  }).pipe(Effect.provide(BunServices.layer))
);
it.effect(
  "retains native workspace and role fences in an isolated manifest-backed lint root",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* Effect.scoped(
        Effect.gen(function* () {
          const { configuration, workingDirectory } =
            yield* makeIsolatedLintWorkspace();
          yield* Effect.forEach(
            [
              {
                code: "",
                path: "apps/web/src/.generated-isolated-workspace.ts",
                source: 'import "@taxkit/content/schemas";',
              },
              {
                code: "package(workspace-import-boundaries)",
                path: "packages/core/src/.generated-isolated-workspace.ts",
                source: 'import "@taxkit/content/schemas";',
              },
              {
                code: "package(workspace-import-boundaries)",
                path: "apps/web/src/.generated-isolated-workspace.ts",
                source: 'import "@taxkit/content/not-exported";',
              },
              {
                code: "taxkit-package(workspace-roles)",
                path: "apps/web/src/.generated-isolated-workspace.ts",
                source: 'import "@taxkit/api-mcp/server";',
              },
            ],
            ({ path, source, code }) =>
              Effect.gen(function* () {
                const target = nodePath.join(workingDirectory, path);
                yield* fs.makeDirectory(nodePath.dirname(target), {
                  recursive: true,
                });
                yield* fs.writeFileString(target, source);
                const result = yield* lintFiles({
                  paths: [target],
                  extraArgs: [],
                  format: "unix",
                  configuration,
                  workingDirectory,
                });
                expect(result.exitCode, result.output).toBe(
                  Match.value(code).pipe(
                    Match.when("", (): 0 => 0),
                    Match.orElse((): 1 => 1)
                  )
                );
                expect(result.output).not.toContain(
                  "boundary configuration is missing or inconsistent"
                );
                if (code !== "") {
                  expect(result.output).toContain(code);
                }
              }),
            { concurrency: 1, discard: true }
          );
          return workingDirectory;
        })
      );
      expect(!(yield* fs.exists(directory))).toBeTruthy();
    }).pipe(Effect.provide(BunServices.layer)),
  60_000
);
