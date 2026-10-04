import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { Array, Effect, FileSystem, Option, Record, Schema } from "effect";
import type { OxlintConfig } from "oxlint";

import oxlintConfig from "../../oxlint.config.js";
import { lintFiles, writeLintFixture } from "./cli-fixture.js";

const { join } = nodePath;
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

const antiSlopRules = [
  "no-chained-type-assertions",
  "no-conditional-empty-object-spread",
  "no-known-value-widening",
  "no-module-mocking",
  "no-object-parameters",
  "no-reflect-apply",
  "no-reflect-get",
  "no-runtime-typeof",
  "no-shape-in-symbol-names",
  "no-unknown-parameters",
  "no-unknown-returns",
  "no-unknown-type-aliases",
  "no-unsafe-dictionary-type",
  "no-widen-then-assert",
  "require-safety-comment-for-type-assertion",
] as const;

const fixtureCases = [
  {
    accepted: ["apps/web/src/lib/runtime.server.ts"],
    generated: "apps/web/src/lib/.generated-strict-runtime.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-native-at",
      "runtime-file-convention",
      "tagged-error-name",
      "error-constructor-new",
      "no-unsafe-option-unwrap",
    ],
  },
  {
    accepted: ["tools/oxlint/fixtures/strict-global-accepted.js"],
    generated: "tools/oxlint/fixtures/.generated-strict-global-rejected.js",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-global-rejected.js.txt",
    rules: [
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-unsafe-option-unwrap",
    ],
  },
  {
    accepted: ["oxlint.config.ts"],
    generated: ".generated-strict.config.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-unsafe-option-unwrap",
    ],
  },
  {
    accepted: ["tools/oxlint/cli-fixture.ts"],
    generated: "tools/oxlint/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/docs-content/src/validate.runtime.ts"],
    generated: "packages/docs-content/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/docs-fumadocs/src/live.layer.ts"],
    generated: "packages/docs-fumadocs/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/testing/src/index.ts"],
    generated: "packages/testing/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/api/http/src/client/in-process.layer.ts"],
    generated: "packages/api/http/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["tools/repository-paths/check.runtime.ts"],
    generated: "tools/repository-paths/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/governance/policy.test.ts",
      "tools/governance/check.runtime.ts",
    ],
    generated: "tools/governance/.generated-strict-rejected.test.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/core/src/graph/rule-graph.ts"],
    generated: "packages/core/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/rules/au/pay/test/rule-graph.test.ts"],
    generated: "packages/rules/au/pay/test/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "packages/calculators/__tests__/public-calculator-service.test.ts",
    ],
    generated: "packages/calculators/__tests__/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/oxlint/fixtures/effect-accepted.ts",
      "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
    ],
    generated: "tools/oxlint/fixtures/.generated-effect-rejected.ts",
    namespace: "effect",
    rejected: "tools/oxlint/fixtures/effect-rejected.ts.txt",
    rules: [
      "no-bare-effect-try-promise",
      "no-console-outside-runtime",
      "no-effect-test-global-mix",
      "no-host-imports-in-contracts",
      "no-layer-exports-in-service-files",
      "no-manual-tag",
      "no-module-level-mutable-test-state",
      "no-process-outside-boundaries",
      "no-runtime-execution-outside-boundaries",
      "no-schema-encoder-outside-egress",
      "no-switch",
      "no-throwing-schema-sync-codec",
      "no-unknown-service-contract",
      "no-unknown-tagged-error-cause",
    ],
  },
  {
    accepted: [
      "tools/oxlint/fixtures/bun-accepted.ts",
      "tools/oxlint/fixtures/bun-global-non-host-accepted.ts",
      "tools/oxlint/fixtures/bun-unrelated-accepted.ts",
    ],
    generated: "tools/oxlint/fixtures/.generated-bun-rejected.ts",
    namespace: "bun",
    rejected: "tools/oxlint/fixtures/bun-rejected.ts.txt",
    rules: ["no-host-api-outside-adapters", "no-runtime-outside-entrypoints"],
  },
  {
    accepted: ["tools/oxlint/fixtures/mdx-accepted.tsx"],
    generated: "tools/oxlint/fixtures/.generated-mdx-rejected.tsx",
    namespace: "mdx",
    rejected: "tools/oxlint/fixtures/mdx-rejected.tsx.txt",
    rules: ["no-route-local-component-registry"],
  },
  {
    accepted: ["tools/oxlint/fixtures/anti-slop-effect-accepted.test.ts"],
    generated: "tools/oxlint/fixtures/.generated-anti-slop-effect-rejected.ts",
    namespace: "anti-slop-effect",
    rejected: "tools/oxlint/fixtures/anti-slop-effect-rejected.ts.txt",
    rules: ["no-service-constructor-imports"],
  },
  {
    accepted: ["tools/oxlint/fixtures/package-accepted.ts"],
    generated: "apps/web/src/.generated-package-rejected.ts",
    namespace: "package",
    rejected: "tools/oxlint/fixtures/package-rejected.ts.txt",
    rules: ["no-cross-package-source-imports"],
  },
] as const;

const runOxlint = (path: string) =>
  Effect.gen(function* () {
    const result = yield* lintFiles([path], [], "json");
    const report = yield* Schema.decodeEffect(
      Schema.fromJsonString(
        Schema.Struct({
          diagnostics: Schema.Array(Schema.Struct({ code: Schema.String })),
          number_of_files: Schema.Int,
        })
      )
    )(result.stdout);
    return {
      codes: Array.map(report.diagnostics, (diagnostic) => diagnostic.code),
      exitCode: result.exitCode,
      files: report.number_of_files,
    };
  });

describe("portable Oxlint plugins", () => {
  test.effect("enables every anti-slop rule at error severity", () =>
    Effect.gen(function* () {
      yield* Effect.forEach(antiSlopRules, (rule) =>
        Effect.sync(() => {
          expect(
            Record.get(`anti-slop/${rule}`)(oxlintConfig.rules ?? {}).pipe(
              Option.getOrUndefined
            )
          ).toBe("error");
        })
      );
      expect(
        Record.get("anti-slop-effect/no-service-constructor-imports")(
          oxlintConfig.rules ?? {}
        ).pipe(Option.getOrUndefined)
      ).toBe("error");
    })
  );

  test.effect.each(fixtureCases)(
    "$namespace accepts its boundary fixtures ($generated)",
    (fixture) =>
      Effect.gen(function* () {
        yield* Effect.forEach(fixture.accepted, (path) =>
          Effect.gen(function* () {
            const result = yield* runOxlint(path);
            expect(result.files).toBe(1);
            expect(result.exitCode).toBe(0);
            expect(
              Array.some(result.codes, (code) =>
                code.startsWith(`${fixture.namespace}(`)
              )
            ).toBe(false);
          })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect.each(fixtureCases)(
    "$namespace rejects invalid code through the real binary ($generated)",
    (fixture) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const source = yield* fs.readFileString(
          join(repositoryRoot, fixture.rejected)
        );
        yield* writeLintFixture(
          join(repositoryRoot, fixture.generated),
          source
        );
        const result = yield* runOxlint(fixture.generated);
        expect(result.files).toBe(1);
        expect(result.exitCode).toBe(1);
        yield* Effect.forEach(fixture.rules, (rule) =>
          Effect.sync(() => {
            expect(result.codes).toContain(`${fixture.namespace}(${rule})`);
          })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
});

// Oxlint has no stdin mode; use one exact admitted fixture and a neighbouring canary.
test.effect.each([
  {
    name: "admits the Fetch result type only at its exact host",
    path: "tools/oxlint/.generated-fetch-host.ts",
    rejected: false,
    source: "export type Handler = (request: Request) => Promise<Response>;",
  },
  {
    name: "rejects an adjacent Promise signature",
    path: "tools/oxlint/.generated-ordinary.ts",
    rejected: true,
    source: "export type Handler = (request: Request) => Promise<Response>;",
  },
  {
    name: "rejects async orchestration even at the Fetch host",
    path: "tools/oxlint/.generated-fetch-host.ts",
    rejected: true,
    source: "export const handler = async () => await Promise.resolve(1);",
  },
])("$name", ({ path, source, rejected }) =>
  Effect.gen(function* () {
    yield* writeLintFixture(join(repositoryRoot, path), source);
    const result = yield* lintFiles([path]);
    expect(result.output.includes("strict-effect(no-promise-workflow)")).toBe(
      rejected
    );
    expect(result.exitCode).toBe(rejected ? 1 : 0);
  }).pipe(Effect.provide(BunServices.layer))
);

// Policy changes must review both the filename selector and the canonical admission.
test.each([
  "tools/repository-paths/check.runtime.ts",
  "tools/governance/check.runtime.ts",
  "packages/docs-content/src/validate.runtime.ts",
])("keeps the command runtime admission exact: %s", (path) => {
  expect(
    Array.filter(
      oxlintConfig.overrides ?? [],
      (entry: NonNullable<OxlintConfig["overrides"]>[number]) =>
        Array.contains(entry.files ?? [], path) &&
        Record.has<string>("strict-effect/no-runtime-outside-boundary")(
          entry.rules ?? {}
        )
    )
  ).toEqual([
    {
      files: [path],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: [path] },
        ],
      },
    },
  ]);
});
