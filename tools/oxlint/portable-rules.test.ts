import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Effect,
  FileSystem,
  Option,
  Order,
  Record,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import type { OxlintConfig } from "oxlint";

import oxlintConfig from "../../oxlint.config.js";
import {
  lintFiles,
  makeIsolatedLintWorkspace,
  writeLintFixture,
} from "./cli-fixture.js";
import { workspaceContracts } from "./workspaces.boundary.js";

describe("portable rules", () => {
  const { join } = nodePath;
  const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
  const fixtureCases = [
    {
      accepted: ["tools/oxlint/fixtures/strict-commonjs-accepted.cjs"],
      generated: ".generated-owned-source-rejected.cjs",
      namespace: "strict-effect",
      rejected: "tools/oxlint/fixtures/strict-commonjs-rejected.cjs.txt",
      rules: [
        "no-imperative-collections",
        "no-unchecked-index",
        "no-native-at",
        "error-constructor-new",
      ],
    },
    ...EffectFunction.pipe(
      [
        "bun-accepted",
        "bun-unrelated-accepted",
        "effect-accepted",
        "effect-unrelated-accepted",
      ] as const,
      Array.map((name) => ({
        accepted: ["tools/oxlint/fixtures/strict-global-accepted.js"],
        generated: `tools/oxlint/fixtures/.generated-${name}-neighbour.ts`,
        namespace: "strict-effect",
        rejected: "tools/oxlint/fixtures/strict-global-rejected.js.txt",
        rules: [
          "no-native-at",
          "tagged-error-name",
          "error-constructor-new",
          "no-unsafe-option-unwrap",
        ],
      }))
    ),
    ...EffectFunction.pipe(
      ["ts", "tsx", "js", "jsx", "mjs"] as const,
      Array.map((extension) => ({
        accepted: ["tools/oxlint/fixtures/strict-global-accepted.js"],
        generated: `.generated-owned-source-rejected.${extension}`,
        namespace: "strict-effect",
        rejected: "tools/oxlint/fixtures/strict-global-rejected.js.txt",
        rules: [
          "no-native-at",
          "tagged-error-name",
          "error-constructor-new",
          "no-unsafe-option-unwrap",
        ],
      }))
    ),
    {
      accepted: [],
      generated: "apps/api/scripts/.generated-retired-built-strict-rejected.ts",
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
      accepted: [],
      generated:
        "apps/api/scripts/.generated-retired-hosted-strict-rejected.ts",
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
      accepted: [],
      generated: "apps/web/src/.generated-retired-app-strict-rejected.ts",
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
      accepted: [],
      generated:
        "apps/web/src/lib/docs/.generated-retired-native-tests-strict-rejected.ts",
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
      accepted: [],
      generated:
        "apps/api/scripts/.generated-retired-imports-strict-rejected.ts",
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
        "tools/oxlint/binding-tracker.ts",
        "tools/oxlint/binding-tracker.test.ts",
        "tools/oxlint/host.types.ts",
        "tools/oxlint/effect-rules.ts",
        "tools/oxlint/package-rules.ts",
        "tools/oxlint/taxkit-rules.ts",
      ],
      generated: "tools/oxlint/.generated-strict-bindings.js",
      namespace: "strict-effect",
      rejected: "tools/oxlint/fixtures/strict-bindings-rejected.js.txt",
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
    }, // The shared presets own direct spellings; repository settings name the
    // exact boundaries and the native restricted-name rules close aliases.
    ...EffectFunction.pipe(
      [
        {
          namespace: "taxkit-effect",
          rules: ["inline-try-promise-callbacks"],
        },
        {
          namespace: "effect-conventions",
          rules: [
            "require-try-promise-catch",
            "no-schema-decoder-outside-ingress",
            "no-schema-encoder-outside-egress",
            "no-unknown-service-contract",
            "no-unknown-tagged-error-payload",
          ],
        },
        {
          namespace: "eslint",
          rules: [
            "no-restricted-globals",
            "no-restricted-imports",
            "no-restricted-properties",
          ],
        },
      ] as const,
      Array.map(({ namespace, rules }) => ({
        accepted: [
          "tools/oxlint/fixtures/effect-accepted.ts",
          "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
        ],
        generated: "tools/oxlint/fixtures/.generated-effect-rejected.ts",
        namespace,
        rejected: "tools/oxlint/fixtures/effect-rejected.ts.txt",
        rules,
      }))
    ),
    {
      accepted: [
        "tools/oxlint/fixtures/bun-accepted.ts",
        "tools/oxlint/fixtures/bun-unrelated-accepted.ts",
      ],
      generated: "tools/oxlint/fixtures/.generated-bun-rejected.ts",
      namespace: "eslint",
      rejected: "tools/oxlint/fixtures/bun-rejected.ts.txt",
      rules: ["no-restricted-globals", "no-restricted-properties"],
    },
    {
      accepted: ["tools/oxlint/fixtures/anti-slop-effect-accepted.test.ts"],
      generated:
        "tools/oxlint/fixtures/.generated-anti-slop-effect-rejected.ts",
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
  const runOxlint = Effect.fnUntraced(function* ({
    path,
    configuration = "oxlint.config.ts",
    workingDirectory = repositoryRoot,
  }: {
    readonly path: string;
    readonly configuration?: string;
    readonly workingDirectory?: string;
  }) {
    const result = yield* lintFiles({
      configuration,
      workingDirectory,
      paths: [path],
      extraArgs: [],
      format: "json",
    });
    const report = yield* Schema.decodeEffect(
      Schema.fromJsonString(
        Schema.Struct({
          diagnostics: Schema.Array(Schema.Struct({ code: Schema.String })),
          number_of_files: Schema.Int,
        })
      )
    )(result.stdout);
    return {
      codes: EffectFunction.pipe(
        report.diagnostics,
        Array.map((diagnostic) => diagnostic.code)
      ),
      exitCode: result.exitCode,
      files: report.number_of_files,
    };
  });

  it("keeps full source coverage and its four unexecuted fixture exclusions exact", () => {
    const strict = EffectFunction.pipe(
      oxlintConfig.overrides ?? [],
      Array.filter((entry) =>
        Array.contains(entry.files ?? [], "packages/core/**")
      )
    );
    expect(strict).toHaveLength(1);
    const scope = Array.head(strict).pipe(
      Option.getOrElse(() => ({ excludeFiles: [], files: [] }))
    );
    expect(scope.files, "Owned source extension coverage").toContain(
      "**/*.{ts,tsx,js,jsx,mjs,cjs}"
    );
    const configuration: OxlintConfig = oxlintConfig;
    const promiseScope = EffectFunction.pipe(
      configuration.overrides ?? [],
      Array.filter((entry) =>
        Record.get<string>("taxkit-effect/inline-try-promise-callbacks")(
          entry.rules ?? {}
        ).pipe(Option.exists((severity) => severity === "error"))
      )
    );
    expect(promiseScope).toHaveLength(1);
    const actual = Array.head(promiseScope).pipe(
      Option.map((entry) => entry.files),
      Option.getOrUndefined
    );
    expect(actual, "Owned Promise mapping coverage").toStrictEqual([
      "**/*.{cjs,mjs,jsx,js,tsx,ts}",
    ]);
    expect(scope.excludeFiles, "Owned-source fixture exclusions").toStrictEqual(
      [
        "tools/oxlint/fixtures/bun-accepted.ts",
        "tools/oxlint/fixtures/bun-unrelated-accepted.ts",
        "tools/oxlint/fixtures/effect-accepted.ts",
        "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
      ]
    );
  });
  describe("portable Oxlint plugins", () => {
    it.effect.each([
      "apps/web/src/.generated-promise-mapping.ts",
      "apps/web/src/.generated-retired-promise-mapping.tsx",
      "packages/infrastructure/src/.generated-promise-mapping.ts",
      ".generated-promise-mapping.js",
      ".generated-promise-mapping.jsx",
      ".generated-promise-mapping.mjs",
    ])("enforces inline Promise error mapping at $name", (path) =>
      Effect.gen(function* () {
        const fixturePath = join(repositoryRoot, path);
        yield* writeLintFixture({
          path: fixturePath,
          source: `import { Effect } from "effect";
export const rejected = Effect.tryPromise(() => Promise.resolve("bad"));
export const accepted = Effect.tryPromise({ try: () => Promise.resolve("good"), catch: () => "fixed" });`,
        });
        const result = yield* runOxlint({
          path,
        });
        expect(result.files).toBe(1);
        expect(result.exitCode).toBe(1);
        EffectFunction.pipe(
          result.codes,
          Array.filter(
            (code) => code === "effect-conventions(require-try-promise-catch)"
          ),
          (actual) => {
            expect(actual).toHaveLength(1);
          }
        );
      }).pipe(Effect.provide(BunServices.layer))
    );
    it.effect.each([
      {
        count: 2,
        name: "rejects runner calls by name, including a shadowing parameter",
        rule: "effect(no-runtime-execution-outside-main)",
        source: `import { Effect } from "effect";
export const imported = Effect.runSync(Effect.void);
export const local = (Effect) => Effect.runSync("local");`,
      },
      {
        count: 0,
        name: "clears an assigned runner when its source becomes unrelated",
        rule: "effect(no-runtime-execution-outside-main)",
        source: `import { Effect } from "effect";
let execute = Effect.runSync;
execute = (value) => value;
export const value = execute("local");`,
      },
      {
        count: 1,
        name: "resolves a Bun host alias without confusing a local parameter",
        rule: "eslint(no-restricted-globals)",
        source: `const { file: open } = Bun;
export const host = open("package.json");
export const local = (Bun) => Bun.file("local");`,
      },
      {
        count: 0,
        name: "accepts direct inline try and catch callbacks after aliasing",
        rule: "taxkit-effect(inline-try-promise-callbacks)",
        source: `import { Effect as Fx } from "effect";
const { tryPromise: attempt } = Fx;
export const value = attempt({ try: () => Promise.resolve(1), catch: () => "failed" });`,
      },
      {
        count: 1,
        name: "rejects a missing catch callback after aliasing",
        rule: "effect-conventions(require-try-promise-catch)",
        source: `import { Effect as Fx } from "effect";
const { tryPromise: attempt } = Fx;
export const value = attempt({ try: () => Promise.resolve(1) });`,
      },
      {
        count: 1,
        name: "rejects an extracted catch callback after aliasing",
        rule: "taxkit-effect(inline-try-promise-callbacks)",
        source: `import { Effect as Fx } from "effect";
const { tryPromise: attempt } = Fx;
const mapFailure = () => "failed";
export const value = attempt({ try: () => Promise.resolve(1), catch: mapFailure });`,
      },
    ])("$name", ({ source, rule, count }) =>
      Effect.gen(function* () {
        const path = "tools/oxlint/.generated-binding-policy.ts";
        const fixturePath = join(repositoryRoot, path);
        yield* writeLintFixture({
          path: fixturePath,
          source,
        });
        const result = yield* runOxlint({
          path,
        });
        expect(result.files).toBe(1);
        EffectFunction.pipe(
          result.codes,
          Array.filter((code) => code === rule),
          (actual) => {
            expect(actual).toHaveLength(count);
          }
        );
        EffectFunction.pipe(
          result.codes,
          Array.some((code) => code.includes("plugin")),
          (actual) => {
            expect(!actual).toBeTruthy();
          }
        );
      }).pipe(Effect.provide(BunServices.layer))
    );
    // Each path starts a real process. Give each file its own ordinary test
    // deadline rather than sharing one deadline across a growing file group.
    it.effect.each(
      EffectFunction.pipe(
        fixtureCases,
        Array.flatMap((fixture) =>
          EffectFunction.pipe(
            fixture.accepted,
            Array.map((path) => ({
              namespace: fixture.namespace,
              path,
            }))
          )
        )
      )
    )(
      "$namespace accepts its boundary fixture ($path)",
      ({ namespace, path }) =>
        Effect.gen(function* () {
          const result = yield* runOxlint({
            path,
          });
          expect(result.files).toBe(1);
          const violations = EffectFunction.pipe(
            result.codes,
            Array.filter((code) => code.startsWith(`${namespace}(`))
          );
          expect(violations).toStrictEqual([]);
        }).pipe(Effect.provide(BunServices.layer)),
      // The largest native suites take more than five seconds to lint.
      30_000
    );
    it.effect.each(fixtureCases)(
      "$namespace rejects invalid code through the real binary ($generated)",
      (fixture) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const source = yield* fs.readFileString(
            join(repositoryRoot, fixture.rejected)
          );
          const fixturePath = join(repositoryRoot, fixture.generated);
          yield* writeLintFixture({
            path: fixturePath,
            source,
          });
          const result = yield* runOxlint({
            path: fixture.generated,
          });
          expect(result.files).toBe(1);
          expect(result.exitCode).toBe(1);
          yield* EffectFunction.pipe(
            fixture.rules,
            Effect.forEach((rule: string) =>
              Effect.sync(() => {
                expect(
                  result.codes,
                  `Required lint rule: ${fixture.namespace}/${rule}`
                ).toContain(`${fixture.namespace}(${rule})`);
              })
            )
          );
        }).pipe(Effect.provide(BunServices.layer))
    );
  });
  // Folders come from the checked workspace inventory and the root tool
  // folders, so a new package or test folder is covered without editing this
  // file. `bun run lint` proves the real sources in those folders are accepted.
  const strictRules = [
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
  ];
  it.effect(
    "strict-effect rejects invalid code in every workspace and tool folder",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const source = yield* fs.readFileString(
          join(
            repositoryRoot,
            "tools/oxlint/fixtures/strict-collections-rejected.ts.txt"
          )
        );
        const tools = yield* fs.readDirectory(join(repositoryRoot, "tools"));
        const candidates = [
          ...EffectFunction.pipe(
            workspaceContracts,
            Array.flatMap(({ owner }) =>
              EffectFunction.pipe(
                ["src", "test", "scripts"],
                Array.map((folder) => `${owner}/${folder}`)
              )
            )
          ),
          ...EffectFunction.pipe(
            tools,
            Array.map((folder) => `tools/${folder}`)
          ),
          "tools/apps-local/test",
        ];
        const folders = yield* EffectFunction.pipe(
          candidates,
          Effect.filter((folder) =>
            fs.stat(join(repositoryRoot, folder)).pipe(
              Effect.map((info) => info.type === "Directory"),
              Effect.orElseSucceed(() => false)
            )
          )
        );
        const paths = EffectFunction.pipe(
          folders,
          Array.sort(Order.String),
          Array.map((folder) => `${folder}/.generated-strict-rejected.ts`)
        );
        expect(paths.length).toBeGreaterThan(40);
        yield* Effect.forEach(
          paths,
          (path) =>
            writeLintFixture({ path: join(repositoryRoot, path), source }),
          { discard: true }
        );
        // Small batches keep each JSON report well inside what the child
        // process stream delivers before Oxlint exits.
        const reports = yield* Effect.forEach(
          Array.chunksOf(paths, 6),
          (batch) =>
            lintFiles({ format: "json", paths: batch }).pipe(
              Effect.tap((result) =>
                Effect.sync(() => {
                  expect(result.exitCode).toBe(1);
                })
              ),
              Effect.flatMap((result) =>
                Schema.decodeEffect(
                  Schema.fromJsonString(
                    Schema.Struct({
                      diagnostics: Schema.Array(
                        Schema.Struct({
                          code: Schema.String,
                          filename: Schema.String,
                        })
                      ),
                      number_of_files: Schema.Int,
                    })
                  )
                )(result.stdout)
              )
            )
        );
        const diagnostics = EffectFunction.pipe(
          reports,
          Array.flatMap((batch) => batch.diagnostics)
        );
        EffectFunction.pipe(
          reports,
          Array.reduce(0, (total, batch) => total + batch.number_of_files),
          (files) => {
            expect(files).toBe(paths.length);
          }
        );
        EffectFunction.pipe(
          paths,
          Array.map((path) => ({
            missing: EffectFunction.pipe(
              strictRules,
              Array.filter(
                (rule) =>
                  !EffectFunction.pipe(
                    diagnostics,
                    Array.some(
                      (diagnostic) =>
                        diagnostic.filename.endsWith(path) &&
                        diagnostic.code === `strict-effect(${rule})`
                    )
                  )
              )
            ),
            path,
          })),
          Array.filter(({ missing }) => missing.length > 0),
          (uncovered) => {
            expect(uncovered).toStrictEqual([]);
          }
        );
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer)),
    120_000
  );
  // The preset's collection rule owns both former local rules: `switch` and
  // module-level `let` in a test each report once, and no local rule repeats it.
  it.effect(
    "reports switch and module-level test state once through the preset",
    () =>
      Effect.gen(function* () {
        const path = "packages/core/test/.generated-imperative-state.test.ts";
        yield* writeLintFixture({
          path: join(repositoryRoot, path),
          source: `import { describe, expect, it } from "@effect/vitest";

let shared = 0;

describe("probe", () => {
  it("reads shared state", () => {
    switch (shared) {
      default:
        expect(shared).toBe(0);
    }
  });
});
`,
        });
        const result = yield* runOxlint({ path });
        expect(result.exitCode).toBe(1);
        EffectFunction.pipe(
          result.codes,
          Array.filter(
            (code) =>
              code === "strict-effect(no-imperative-collections)" ||
              code.startsWith("taxkit-effect(")
          ),
          (actual) => {
            expect(actual).toStrictEqual([
              "strict-effect(no-imperative-collections)",
              "strict-effect(no-imperative-collections)",
            ]);
          }
        );
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer)),
    30_000
  );
  // One lint pass: a directive naming the decoder rule, or switching off the
  // guard itself, fails; an ordinary directive and plain code pass.
  it.effect.each([
    {
      name: "a decoder-rule directive",
      rejected: true,
      source: `import { Schema } from "effect";
// oxlint-disable-next-line effect-conventions/no-schema-decoder-outside-ingress
export const value = Schema.decodeUnknownSync(Schema.String)("x");
`,
    },
    {
      name: "a file-wide guard directive",
      rejected: true,
      source: `/* oxlint-disable taxkit/protected-rule-directives */
import { Schema } from "effect";
export const value = Schema.String;
`,
    },
    {
      name: "an unrelated directive",
      rejected: false,
      source: `import { Schema } from "effect";
// oxlint-disable-next-line typescript/no-explicit-any -- probe
export const value = Schema.String;
`,
    },
  ])("guards decoder placement against $name", ({ rejected, source }) =>
    Effect.gen(function* () {
      const path = "packages/core/src/.generated-protected-directive.ts";
      yield* writeLintFixture({ path: join(repositoryRoot, path), source });
      const result = yield* runOxlint({ path });
      EffectFunction.pipe(
        result.codes,
        Array.contains("taxkit(protected-rule-directives)"),
        (actual) => {
          expect(actual).toBe(rejected);
        }
      );
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
  // Oxlint has no stdin mode; use one exact admitted fixture and a neighbouring canary.
  it.effect.each([
    {
      name: "admits the Fetch result type only at its exact host",
      path: "tools/oxlint/.generated-fetch-host.ts",
      rejected: false,
      source:
        "export type Handler = (request: Request) => ReturnType<typeof fetch>;",
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
      const fixturePath = join(repositoryRoot, path);
      yield* writeLintFixture({
        path: fixturePath,
        source,
      });
      const result = yield* lintFiles({
        paths: [path],
      });
      EffectFunction.pipe(
        result.output.includes("strict-effect(no-promise-workflow)"),
        (actual) => {
          expect(actual).toBe(rejected);
        }
      );
      expect(result.exitCode).toBe(
        EffectBoolean.match(rejected, {
          onFalse: (): 0 => 0,
          onTrue: (): 1 => 1,
        })
      );
    }).pipe(Effect.provide(BunServices.layer))
  );
  // Policy changes must review both the filename selector and the canonical admission.
  it.effect.each([
    {
      name: "admits an assignment only at the exact synthetic host target",
      path: "tools/oxlint/.generated-collection-host.ts",
      rejected: false,
      source:
        "const host = { value: 0 }; export const onHostEvent = () => { host.value = 1; };",
    },
    {
      name: "rejects that assignment in the neighbouring file",
      path: "tools/oxlint/.generated-collection-neighbour.ts",
      rejected: true,
      source:
        "const host = { value: 0 }; export const onHostEvent = () => { host.value = 1; };",
    },
    {
      name: "rejects an unrelated assignment target at the synthetic host",
      path: "tools/oxlint/.generated-collection-host.ts",
      rejected: true,
      source:
        "const host = { other: 0, value: 0 }; export const onHostEvent = () => { host.other = 1; };",
    },
    {
      name: "admits one method only at the exact synthetic host receiver",
      path: "tools/oxlint/.generated-collection-host.ts",
      rejected: false,
      source:
        "const host: number[] = []; export const onHostEvent = () => { host.push(1); };",
    },
    {
      name: "rejects that method in the neighbouring file",
      path: "tools/oxlint/.generated-collection-neighbour.ts",
      rejected: true,
      source:
        "const host: number[] = []; export const onHostEvent = () => { host.push(1); };",
    },
    {
      name: "rejects an unrelated method at the synthetic host",
      path: "tools/oxlint/.generated-collection-host.ts",
      rejected: true,
      source:
        "const host = [1]; export const onHostEvent = () => host.map((value) => value + 1);",
    },
    {
      name: "rejects a different receiver at the synthetic host",
      path: "tools/oxlint/.generated-collection-host.ts",
      rejected: true,
      source:
        "const other: number[] = []; export const onHostEvent = () => { other.push(1); };",
    },
    {
      name: "rejects loops even at the admitted synthetic host",
      path: "tools/oxlint/.generated-collection-host.ts",
      rejected: true,
      source: "for (const value of [1]) { void value; }",
    },
  ])("$name", ({ path, rejected, source }) =>
    Effect.gen(function* () {
      const fixturePath = join(repositoryRoot, path);
      yield* writeLintFixture({
        path: fixturePath,
        source,
      });
      const result = yield* runOxlint({
        path,
      });
      expect(result.files).toBe(1);
      const actual = Array.contains(
        result.codes,
        "strict-effect(no-imperative-collections)"
      );
      expect(actual, "Strict collection admission canary").toBe(rejected);
      expect(result.exitCode).toBe(
        EffectBoolean.match(rejected, {
          onFalse: (): 0 => 0,
          onTrue: (): 1 => 1,
        })
      );
    }).pipe(Effect.provide(BunServices.layer))
  );

  it.each([
    "apps/web/vite.config.ts",
    "apps/web/src/lib/runtime.server.ts",
    "apps/web/src/lib/runtime.client.ts",
    "tools/apps-local/native-pair-build.runtime.ts",
    "apps/web/src/entry.server.ts",
    "apps/api/src/index.ts",
    "apps/api/scripts/smoke-public-routes.runtime.ts",
    "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
    "packages/sdk/typescript/scripts/assemble-package.runtime.ts",
    "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
    "packages/sdk/typescript/src/client.runtime.ts",
    "tools/repository-paths/check.runtime.ts",
    "tools/documentation/check.runtime.ts",
  ])("keeps the execution runtime admission exact: %s", (path) => {
    EffectFunction.pipe(
      oxlintConfig.overrides ?? [],
      Array.filter(
        (entry: NonNullable<OxlintConfig["overrides"]>[number]) =>
          Array.contains(entry.files ?? [], path) &&
          Record.get<string>("strict-effect/no-runtime-outside-boundary")(
            entry.rules ?? {}
          ).pipe(Option.exists(Array.isArray))
      ),
      (actual) => {
        expect(actual).toStrictEqual([
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
      }
    );
  });
  const PromiseAdmission = Schema.Tuple([
    Schema.Literal("error"),
    Schema.Struct({
      allowedFiles: Schema.Array(Schema.String),
      promiseOnlyFiles: Schema.optionalKey(Schema.Array(Schema.String)),
    }),
  ]);

  it("keeps every Promise admission exact and listed once", () => {
    const admissions = EffectFunction.pipe(
      oxlintConfig.overrides ?? [],
      Array.filter((entry: NonNullable<OxlintConfig["overrides"]>[number]) =>
        Record.get<string>("strict-effect/no-promise-workflow")(
          entry.rules ?? {}
        ).pipe(Option.exists(Array.isArray))
      )
    );
    // One override owns production adapters, host-contract tests and the CLI
    // fixture; each admitted path is named exactly, never by glob.
    EffectFunction.pipe(
      admissions,
      Array.map((entry) => entry.files),
      (actual) => {
        // One override owns production adapters, host-contract tests and the CLI
        // fixture; each admitted path is named exactly, never by glob.
        expect(actual).toStrictEqual([
          ["tools/oxlint/.generated-fetch-host.ts"],
          expect.arrayContaining([
            "apps/web/src/lib/host/binding.adapter.layer.ts",
            "apps/web/src/entry.server.ts",
            "packages/sdk/typescript/src/client.runtime.ts",
          ]),
        ]);
      }
    );
    const listed = EffectFunction.pipe(
      admissions,
      Array.map((entry: NonNullable<OxlintConfig["overrides"]>[number]) => ({
        files: EffectFunction.pipe(entry.files ?? [], Array.sort(Order.String)),
        named: Record.get<string>("strict-effect/no-promise-workflow")(
          entry.rules ?? {}
        ).pipe(
          Option.filter(Schema.is(PromiseAdmission)),
          Option.map(([, options]) =>
            EffectFunction.pipe(
              Array.appendAll(
                options.allowedFiles,
                options.promiseOnlyFiles ?? []
              ),
              Array.sort(Order.String)
            )
          )
        ),
      }))
    );
    EffectFunction.pipe(
      listed,
      Array.map(({ named }) => named),
      (actual) => {
        expect(actual).toStrictEqual(
          EffectFunction.pipe(
            listed,
            Array.map(({ files }) => Option.some(files))
          )
        );
      }
    );
    EffectFunction.pipe(
      listed,
      Array.flatMap(({ files }) => files),
      Array.some((path) => path.includes("*")),
      (actual) => {
        expect(!actual).toBeTruthy();
      }
    );
  });
  describe("exact native RPC lint boundaries", () => {
    it.effect("rejects decoding beside the native app stage ingress", () =>
      Effect.gen(function* () {
        const path =
          "packages/infrastructure/src/.generated-app-decoder-neighbour.ts";
        const fixturePath = join(repositoryRoot, path);
        yield* writeLintFixture({
          path: fixturePath,
          source:
            'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
        });
        const result = yield* runOxlint({
          path,
        });
        expect(result.files).toBe(1);
        expect(result.exitCode).not.toBe(0);
        expect(result.codes).toContain(
          "effect-conventions(no-schema-decoder-outside-ingress)"
        );
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
    );
    it.effect("rejects decoding in a neighbouring transport source file", () =>
      Effect.gen(function* () {
        const path = "packages/api/mcp/src/.generated-decoder-neighbour.ts";
        const fixturePath = join(repositoryRoot, path);
        yield* writeLintFixture({
          path: fixturePath,
          source:
            'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
        });
        const result = yield* runOxlint({
          path,
        });
        expect(result.files).toBe(1);
        expect(result.exitCode).not.toBe(0);
        expect(result.codes).toContain(
          "effect-conventions(no-schema-decoder-outside-ingress)"
        );
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
    );
    it.effect.each([
      ...EffectFunction.pipe(
        [
          "apps/web/src/lib/docs/search-location.ingress.ts",
          "apps/web/test/http/negotiation.boundary.test.ts",
          "apps/web/src/lib/http/negotiation.ingress.ts",
          "apps/web/src/lib/http/image.ingress.ts",
          "apps/web/test/http/image.boundary.test.ts",
        ],
        Array.flatMap((path) => [
          {
            path,
            rejected: false,
            rule: "effect-conventions(no-schema-decoder-outside-ingress)",
            source:
              'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
          },
          {
            path,
            rejected: true,
            rule: "effect-conventions(no-schema-encoder-outside-egress)",
            source:
              'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
          },
          {
            path,
            rejected: true,
            rule: "strict-effect(no-runtime-outside-boundary)",
            source:
              'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
          },
        ])
      ),
      ...EffectFunction.pipe(
        [
          {
            rejected: false,
            rule: "effect-conventions(no-schema-encoder-outside-egress)",
            source:
              'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
          },
          {
            rejected: true,
            rule: "effect-conventions(no-schema-decoder-outside-ingress)",
            source:
              'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
          },
          {
            rejected: true,
            rule: "strict-effect(no-runtime-outside-boundary)",
            source:
              'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
          },
        ],
        Array.map((fixture) => ({
          ...fixture,
          path: "packages/content/src/publication.egress.ts",
        }))
      ),
      ...EffectFunction.pipe(
        [
          "apps/web/src/lib/docs/components.tsx",
          "apps/web/src/lib/docs/page.view.tsx",
          "apps/web/src/lib/docs/search.view.tsx",
          "apps/web/src/lib/seo/head.ts",
          "apps/web/src/routes/search.tsx",
          "apps/web/src/routes/$.tsx",
        ],
        Array.flatMap((path) => [
          {
            path,
            rejected: true,
            rule: "effect-conventions(no-schema-decoder-outside-ingress)",
            source:
              'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
          },
          {
            path,
            rejected: true,
            rule: "effect-conventions(no-schema-encoder-outside-egress)",
            source:
              'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
          },
          {
            path,
            rejected: true,
            rule: "strict-effect(no-runtime-outside-boundary)",
            source:
              'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
          },
        ])
      ),
      {
        path: "apps/web/src/lib/host/binding.adapter.layer.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/web/src/lib/pages/loader-context.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/web/src/lib/pages/loader-context.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/web/src/lib/pages/loader-context.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "tools/apps-local/test/native-pair-calculator-browser.checks.ts",
        rejected: false,
        rule: "strict-effect(no-imperative-collections)",
        source:
          'declare const calculatorInput: { readonly fill: (value: string) => void };\nexport const fill = () => { calculatorInput.fill("67000"); };',
      },
      {
        path: "tools/apps-local/test/native-pair-calculator-browser.checks.ts",
        rejected: false,
        rule: "strict-effect(no-imperative-collections)",
        source:
          'declare const plainCalculatorInput: { readonly fill: (value: string) => void };\nexport const fill = () => { plainCalculatorInput.fill("67000"); };',
      },
      {
        path: "apps/web/src/lib/calculators/calculator-page.view.tsx",
        rejected: true,
        rule: "strict-effect(no-imperative-collections)",
        source:
          'declare const calculatorInput: { readonly fill: (value: string) => void };\nexport const fill = () => { calculatorInput.fill("67000"); };',
      },
      {
        path: "tools/apps-local/test/native-pair-calculator-browser.checks.ts",
        rejected: false,
        rule: "strict-effect(no-imperative-collections)",
        source:
          'declare const savedPayInput: { readonly fill: (value: string) => void };\nexport const fill = () => { savedPayInput.fill("2000"); };',
      },
      {
        path: "tools/apps-local/test/native-pair-calculator-browser.checks.ts",
        rejected: true,
        rule: "strict-effect(no-imperative-collections)",
        source:
          'declare const unrelatedInput: { readonly fill: (value: string) => void };\nexport const filled = unrelatedInput.fill("2000");',
      },
      {
        path: "apps/web/src/lib/calculators/take-home.view.tsx",
        rejected: true,
        rule: "strict-effect(no-imperative-collections)",
        source:
          'declare const savedPayInput: { readonly fill: (value: string) => void };\nexport const fill = () => { savedPayInput.fill("2000"); };',
      },
      {
        path: "tools/apps-local/test/native-local-development.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-local-development.boundary.test.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-local-development.boundary.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "tools/apps-local/test/native-cancellation.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-cancellation.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-cancellation.boundary.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "tools/apps-local/test/native-settings-failure.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-settings-failure.boundary.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "apps/web/src/lib/host/config.ingress.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/web/src/lib/host/config.ingress.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "apps/web/src/lib/calculators/page.atoms.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "apps/web/src/lib/calculators/page.atoms.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/web/src/lib/pages/loaders.ts",
        rejected: false,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "apps/web/src/lib/pages/loaders.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/web/src/lib/pages/loaders.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/web/src/router.tsx",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/web/src/entry.server.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/web/src/entry.server.ts",
        rejected: true,
        rule: "strict-effect(no-imperative-collections)",
        source:
          "export const run = () => { const values = [1]; values.push(2); return values; };",
      },
      {
        path: "apps/api/test/worker.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/api/test/worker.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-pair-content.checks.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/api/http/test/request-body.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/api/src/worker.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-settings-failure.boundary.test.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/api/http/src/handlers/calculators.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/api/test/worker.boundary.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/core/src/primitives/date.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/core/test/date.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/core/test/date.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/core/test/money.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/core/src/primitives/date.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/core/src/primitives/money.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/core/src/primitives/money.effect.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/core/src/calculators/definition.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/core/src/errors/input-validation-error.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/core/src/primitives/money.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/core/src/primitives/tax.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/core/test/money.test.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/core/src/primitives/date.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/core/test/date.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/core/test/money.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/rules/au/income-tax/test/rule-graph.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/rules/au/income-tax/test/rule-graph.test.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/rules/au/income-tax/test/rule-graph.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/rules/au/pay/test/rule-graph.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/rules/au/pay/test/rule-graph.test.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/rules/au/pay/test/rule-graph.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/rules/au/stsl/test/rule-graph.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/rules/au/stsl/test/rule-graph.test.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/rules/au/stsl/test/rule-graph.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/sdk/typescript/test/effect.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/sdk/typescript/test/effect.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeEffect(Schema.String);',
      },
      {
        path: "packages/sdk/typescript/test/effect.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/core/test/domain-absence.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/core/test/domain-absence.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeEffect(Schema.String);',
      },
      {
        path: "packages/core/test/domain-absence.boundary.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/rules/au/income-tax/test/annual-tax.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/rules/au/income-tax/test/annual-tax.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeEffect(Schema.String);',
      },
      {
        path: "packages/rules/au/income-tax/test/annual-tax.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/rules/au/stsl/test/take-home-pay-stsl.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/rules/au/stsl/test/take-home-pay-stsl.test.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeEffect(Schema.String);',
      },
      {
        path: "packages/rules/au/stsl/test/take-home-pay-stsl.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/infrastructure/src/secrets.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/infrastructure/test/native-domains-provider.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeEffect(Schema.String);',
      },
      {
        path: "packages/infrastructure/test/native-domains-provider.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/infrastructure/test/native-domains-provider.boundary.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "tools/infrastructure/apps-stack.test.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeEffect(Schema.String);',
      },
      {
        path: "tools/infrastructure/apps-stack.test.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/infrastructure/src/secrets.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/infrastructure/src/secrets.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/observability/src/edge-identity.boundary.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/observability/src/edge-identity.boundary.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/observability/src/edge-identity.boundary.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/api/src/worker.application.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/api/src/worker.application.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "apps/api/src/worker.application.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/api/src/worker-admission.layer.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/api/src/worker-admission.layer.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "apps/api/src/worker-admission.layer.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/api/test/mcp-client.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/api/test/mcp-client.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/api/test/mcp-client.boundary.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "tools/apps-local/test/native-mcp.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-mcp.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-mcp.boundary.test.ts",
        rejected: false,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/api/mcp/src/handlers.layer.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/api/mcp/src/request.service.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownOption(Schema.String);',
      },
      {
        path: "packages/webmcp/test/registration.test.ts",
        rejected: false,
        rule: "strict-effect(no-promise-workflow)",
        source:
          'import { Predicate, Schema } from "effect";\n\nexport const Callback = Schema.declare<ReturnType<typeof globalThis.fetch>>(Predicate.isPromise);',
      },
      {
        path: "packages/webmcp/test/registration.test.ts",
        rejected: true,
        rule: "strict-effect(no-promise-workflow)",
        source: "export const run = async () => 1;",
      },
      {
        path: "packages/webmcp/test/registration.test.ts",
        rejected: true,
        rule: "strict-effect(no-promise-workflow)",
        source: "export const run = new Promise<void>((resolve) => resolve());",
      },
      {
        path: "packages/webmcp/test/registration.test.ts",
        rejected: true,
        rule: "strict-effect(no-promise-workflow)",
        source:
          "export const run = (source: Promise<number>) => source.then((value) => value);",
      },
      {
        path: "apps/web/src/lib/browser-atoms.ts",
        rejected: true,
        rule: "strict-effect(no-promise-workflow)",
        source: "export const run = (source: Promise<number>) => source;",
      },
      {
        path: "packages/webmcp/src/model-context.adapter.layer.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/webmcp/src/model-context.adapter.layer.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/webmcp/src/model-context.adapter.layer.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "apps/web/src/lib/browser-atoms.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/web/src/lib/browser-atoms.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/web/src/lib/browser-atoms.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/webmcp/test/registration.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-browser-tools.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-browser-tools.boundary.test.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "tools/apps-local/test/native-browser-tools.boundary.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/api/mcp/src/handlers.layer.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/api/mcp/src/handlers.layer.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "apps/api/test/rate-admission.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/api/test/rate-admission.boundary.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "apps/api/test/rate-admission.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "apps/api/test/worker-admission.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "apps/api/test/worker-admission.boundary.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "apps/api/test/worker-admission.boundary.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/calculators/test/calculation-admission.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
      {
        path: "packages/calculators/test/calculation-admission.test.ts",
        rejected: true,
        rule: "strict-effect(no-runtime-outside-boundary)",
        source:
          'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
      },
      {
        path: "packages/calculators/test/calculation-admission.test.ts",
        rejected: false,
        rule: "effect-conventions(no-schema-encoder-outside-egress)",
        source:
          'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
      },
      {
        path: "packages/calculators/src/admission.layer.ts",
        rejected: true,
        rule: "effect-conventions(no-schema-decoder-outside-ingress)",
        source:
          'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
      },
    ])("keeps $rule exact at $path", ({ path, source, rejected, rule }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const workspace = yield* makeIsolatedLintWorkspace();
        const target = join(workspace.workingDirectory, path);
        yield* fs.makeDirectory(nodePath.dirname(target), { recursive: true });
        yield* fs.writeFileString(target, source);
        const result = yield* runOxlint({ path, ...workspace });
        expect(result.files).toBe(1);
        if (rejected) {
          expect(result.exitCode).not.toBe(0);
          expect(result.codes).toContain(rule);
        } else {
          const actual = result.exitCode;
          const message = result.codes.join(", ");
          expect(actual, message).toBe(0);
          expect(result.codes).not.toContain(rule);
        }
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
    );
  });
});
