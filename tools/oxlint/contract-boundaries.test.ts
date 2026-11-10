import nodePath from "node:path";

import { BunServices } from "@effect/platform-bun";
import { expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Effect,
  FileSystem,
  Schema,
} from "effect";

import { lintFiles, makeIsolatedLintWorkspace } from "./cli-fixture.js";

const { dirname, join } = nodePath;
// Contract files are matched by name, so each case is written at an exact
// production-style path inside an isolated copy of the lint configuration.
it.effect.each([
  {
    count: 3,
    name: "rejects Node, Bun and Effect platform imports in a service contract",
    path: "packages/analytics/src/service.ts",
    rule: "eslint(no-restricted-imports)",
    source: `import { readFile } from "node:fs/promises";
import { Database } from "bun:sqlite";
import * as BunPlatform from "@effect/platform-bun";
export const contract = { BunPlatform, Database, readFile };`,
  },
  {
    count: 1,
    name: "keeps the shared host-import rule on direct Node imports",
    path: "packages/analytics/src/schemas.ts",
    rule: "effect-conventions(no-host-api-in-contract)",
    source: `import { readFile } from "node:fs/promises";
export const contract = { readFile };`,
  },
  {
    count: 3,
    name: "rejects declared, renamed and re-exported Layers from a service file",
    path: "packages/analytics/src/service.ts",
    rule: "eslint(no-restricted-exports)",
    source: `import { Layer } from "effect";
const RuntimeLayer = Layer.empty;
export const DirectLive = Layer.empty;
export { RuntimeLayer as DemoLive };
export { ExternalTest } from "./external.layer";`,
  },
  {
    count: 1,
    name: "keeps the shared Layer-export rule on declared Layers",
    path: "packages/analytics/src/service.ts",
    rule: "effect-conventions(no-layer-export-in-service)",
    source: `import { Layer } from "effect";
export const DirectLive = Layer.empty;`,
  },
  {
    count: 0,
    name: "accepts a Layer export outside service contracts",
    path: "packages/analytics/src/live.layer.ts",
    rule: "eslint(no-restricted-exports)",
    source: `import { Layer } from "effect";
export const AnalyticsLive = Layer.empty;`,
  },
  {
    count: 0,
    name: "accepts Node imports outside contracts",
    path: "packages/analytics/src/live.layer.ts",
    rule: "eslint(no-restricted-imports)",
    source: `import { readFile } from "node:fs/promises";
export const host = { readFile };`,
  },
])("$name", ({ path, source, rule, count }) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const { configuration, workingDirectory } =
      yield* makeIsolatedLintWorkspace();
    const target = join(workingDirectory, path);
    yield* fs.makeDirectory(dirname(target), { recursive: true });
    yield* fs.writeFileString(target, source);
    const result = yield* lintFiles({
      configuration,
      format: "json",
      paths: [target],
      workingDirectory,
    });
    const report = yield* Schema.decodeEffect(
      Schema.fromJsonString(
        Schema.Struct({
          diagnostics: Schema.Array(Schema.Struct({ code: Schema.String })),
          number_of_files: Schema.Int,
        })
      )
    )(result.stdout);
    expect(report.number_of_files).toBe(1);
    EffectFunction.pipe(
      report.diagnostics,
      Array.filter((finding) => finding.code === rule),
      (actual) => {
        expect(actual, result.stdout).toHaveLength(count);
      }
    );
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);
