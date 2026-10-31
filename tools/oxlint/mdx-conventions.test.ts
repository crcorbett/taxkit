import nodePath from "node:path";

import { BunServices } from "@effect/platform-bun";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem } from "effect";

import { lintFiles, makeIsolatedLintWorkspace } from "./cli-fixture.js";

it.effect.each([
  {
    exitCode: 1,
    name: "ternary",
    rule: "no-ternary",
    path: "packages/mdx/src/branching.ts",
    source: 'export const choose = (value: boolean) => value ? "yes" : "no";',
  },
  {
    exitCode: 0,
    name: "native Boolean matching",
    rule: "",
    path: "packages/mdx/src/branching.ts",
    source:
      'import { Boolean } from "effect";\n\nexport const choose = (value: boolean) => Boolean.match(value, { onFalse: () => "no", onTrue: () => "yes" });',
  },
])(
  "enforces MDX branching conventions for $name",
  ({ source, exitCode, rule, path }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { configuration, workingDirectory } =
        yield* makeIsolatedLintWorkspace();
      const target = nodePath.join(workingDirectory, path);
      yield* fs.makeDirectory(nodePath.dirname(target), { recursive: true });
      yield* fs.writeFileString(target, source);
      const result = yield* lintFiles(
        [target],
        [],
        "unix",
        configuration,
        workingDirectory
      );
      expect(result.exitCode, result.output).toBe(exitCode);
      expect(result.output).toContain(rule);
    }).pipe(Effect.provide(BunServices.layer), Effect.scoped)
);
