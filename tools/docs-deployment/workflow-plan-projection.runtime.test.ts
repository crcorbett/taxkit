import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it as test } from "@effect/vitest";
import {
  ConfigProvider,
  Config,
  Array as EffectArray,
  Effect,
  FileSystem,
  Match,
  Option,
  Record,
  Result,
  Schema,
  Ref,
  Stream,
} from "effect";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { workflowSha256 } from "./workflow-check.boundary.js";
import {
  calculateNativeWorkflowEvidenceIdentity,
  readNativeGitSnapshot,
} from "./workflow-evidence.js";
import { projectWorkflowPlan } from "./workflow-plan-projection.runtime.js";

const planConfig = (directory: string) => ({
  TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT: "a".repeat(40),
  TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256: "b".repeat(64),
  TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256: "c".repeat(64),
  TAXKIT_WORKFLOW_PLAN_KIND: "deploy",
  TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256: "d".repeat(64),
  TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH: `${directory}/projection.json`,
  TAXKIT_WORKFLOW_PLAN_STAGE: "pr-24",
  TAXKIT_WORKFLOW_PLAN_TEXT_PATH: `${directory}/plan.txt`,
});

const repositoryRootUrl = new URL("../..", import.meta.url);

const nativePlanFixture = Effect.fnUntraced(function* (
  stage: "pr-214" | "prod" = "pr-214"
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fs.makeTempDirectoryScoped({
    prefix: "taxkit-native-source-plan-",
  });
  const repositoryRoot = path.join(directory, "source");
  const files = [
    "alchemy.apps.run.ts",
    "apps/api/package.json",
    "apps/web/package.json",
    "apps/web/vite.config.ts",
    "bun.lock",
    "package.json",
    "packages/infrastructure/package.json",
    "packages/infrastructure/src/apps-secrets.boundary.ts",
    "packages/infrastructure/src/apps-stack.ts",
    "patches/alchemy@2.0.0-beta.80.patch",
    "tsconfig.alchemy.json",
  ];
  yield* Effect.forEach(files, (file) =>
    Effect.gen(function* () {
      yield* fs.makeDirectory(path.dirname(path.join(repositoryRoot, file)), {
        recursive: true,
      });
      yield* fs.writeFileString(
        path.join(repositoryRoot, file),
        yield* fs.readFileString(file)
      );
    })
  );
  yield* fs.makeDirectory(
    path.join(repositoryRoot, "packages/calculators/src"),
    { recursive: true }
  );
  yield* fs.writeFileString(
    path.join(repositoryRoot, "packages/calculators/src/source-fixture.ts"),
    "export const fixture = true;\n"
  );
  yield* fs.writeFileString(
    path.join(repositoryRoot, ".gitignore"),
    "node_modules/\ntmp/\n"
  );
  yield* fs.makeDirectory(path.join(repositoryRoot, "node_modules/alchemy"), {
    recursive: true,
  });
  yield* fs.writeFileString(
    path.join(repositoryRoot, "node_modules/alchemy/package.json"),
    '{"name":"alchemy","version":"2.0.0-beta.80"}\n'
  );
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  yield* Effect.forEach(
    [
      ["init", "--quiet"],
      ["add", "."],
      [
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "user.name=TaxKit fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "--quiet",
        "--no-gpg-sign",
        "-m",
        "native source fixture",
      ],
    ],
    (args) =>
      Effect.gen(function* () {
        const handle = yield* spawner.spawn(
          ChildProcess.make("git", args, {
            cwd: repositoryRoot,
            forceKillAfter: "2 seconds",
            stderr: "pipe",
            stdin: "ignore",
            stdout: "pipe",
          })
        );
        const [exitCode] = yield* Effect.all(
          [
            handle.exitCode,
            Stream.runDrain(handle.stdout),
            Stream.runDrain(handle.stderr),
          ],
          { concurrency: 3 }
        );
        expect(Number(exitCode)).toBe(0);
      })
  );
  const snapshot = yield* readNativeGitSnapshot(repositoryRoot);
  const identity = yield* calculateNativeWorkflowEvidenceIdentity(
    repositoryRoot,
    snapshot.candidateCommit
  );
  const output = path.join(repositoryRoot, "tmp/native-apps-plans", stage);
  yield* fs.makeDirectory(output, { recursive: true });
  const config = {
    ...planConfig(output),
    TAXKIT_WORKFLOW_PLAN_ACCOUNT_ID: "f9f94270a4a5af8af7010d891020922d",
    TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256: identity.alchemyPatchSha256,
    TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT: identity.candidateCommit,
    TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256: identity.configSha256,
    TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256:
      identity.deploymentInputSha256,
    TAXKIT_WORKFLOW_PLAN_GRAPH: "native-apps",
    TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH: path.join(
      output,
      "source-identity.json"
    ),
    TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256: identity.lockfileSha256,
    TAXKIT_WORKFLOW_PLAN_REPOSITORY_ROOT: repositoryRoot,
    TAXKIT_WORKFLOW_PLAN_STAGE: stage,
  };
  yield* fs.writeFileString(
    config.TAXKIT_WORKFLOW_PLAN_TEXT_PATH,
    yield* fs.readFileString(
      `tools/docs-deployment/fixtures/alchemy-beta.80/native-apps-${stage === "prod" ? "production" : "preview"}.txt`
    )
  );
  return { config, identity, repositoryRoot };
});

test.effect.each([
  [
    "configuration",
    "workflow plan projection requires the candidate, digest, stage and plan paths",
  ],
  ["read", "could not read the beta.80 Alchemy plan output"],
  ["write", "could not write the workflow plan projection"],
] as const)("returns a safe typed %s failure", ([problem, reason]) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-plan-command-",
    });
    const base = planConfig(directory);
    yield* fileSystem.writeFileString(
      base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH,
      "Plan: 1 to create\n[DocsWebsite] create\n"
    );
    const config = {
      ...base,
      TAXKIT_WORKFLOW_PLAN_KIND:
        problem === "configuration"
          ? "invalid-sentinel-value"
          : base.TAXKIT_WORKFLOW_PLAN_KIND,
      TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH:
        problem === "write"
          ? directory
          : base.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH,
      TAXKIT_WORKFLOW_PLAN_TEXT_PATH:
        problem === "read"
          ? `${directory}/missing.txt`
          : base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH,
    };
    const result = yield* projectWorkflowPlan.pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromUnknown(config)
      ),
      Effect.result
    );
    Result.match(result, {
      onFailure: (error) => {
        expect(error._tag).toBe("WorkflowPlanProjectionError");
        expect(error).toHaveProperty("reason", reason);
        expect(String(error)).not.toContain("invalid-sentinel-value");
        expect(String(error)).not.toContain(directory);
      },
      onSuccess: () => expect.unreachable(),
    });
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect.each(["pr-214", "prod"] as const)(
  "writes a checked version-three projection for %s",
  (stage) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { config: base, identity } = yield* nativePlanFixture(stage);
      const source = yield* fs.readFileString(
        `tools/docs-deployment/fixtures/alchemy-beta.80/native-apps-${stage === "prod" ? "production" : "preview"}.txt`
      );
      yield* fs.writeFileString(base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH, source);
      const digest = yield* projectWorkflowPlan.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            ...base,
            TAXKIT_WORKFLOW_PLAN_ACCOUNT_ID: "f9f94270a4a5af8af7010d891020922d",
            TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256:
              identity.alchemyPatchSha256,
            TAXKIT_WORKFLOW_PLAN_GRAPH: "native-apps",
            TAXKIT_WORKFLOW_PLAN_STAGE: stage,
            TAXKIT_WORKFLOW_PLAN_ZONE_ID:
              stage === "prod" ? "15103853342ab9f18f7894b7fae39c39" : undefined,
          })
        )
      );
      const encoded = yield* fs.readFileString(
        base.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH
      );
      expect(digest).toBe(yield* workflowSha256("workflow-plan", encoded));
      expect(encoded).toContain('"schemaVersion":3');
      expect(encoded).toContain('"stack":"TaxKitAppsCloudflare"');
      expect(encoded).toContain('"logicalId":"TaxKitApi"');
      expect(encoded).toContain('"logicalId":"TaxKitWebsite"');
      expect(encoded).toContain(
        `"alchemyPatchSha256":"${identity.alchemyPatchSha256}"`
      );
      const identityText = yield* fs.readFileString(
        base.TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH
      );
      expect(identityText).toContain('"schemaVersion":2');
      expect(identityText).toContain(
        '"path":"packages/calculators/src/source-fixture.ts"'
      );
      expect(identityText).toContain(
        yield* workflowSha256(
          "workflow-plan",
          yield* fs.readFileString("patches/alchemy@2.0.0-beta.80.patch")
        )
      );
      if (stage === "prod") {
        expect(encoded).toContain('"removalPolicy":"retain"');
        expect(encoded).toContain(
          '"zoneId":"15103853342ab9f18f7894b7fae39c39"'
        );
        expect(encoded).toContain(
          '"domains":["taxkit.dev","www.taxkit.dev","api.taxkit.dev"]'
        );
      } else {
        expect(encoded).toContain('"productionDns":"unmanaged"');
        expect(encoded).toContain('"domains":[]');
        expect(encoded).not.toContain("taxkit.dev");
        expect(encoded).not.toContain("TaxKitProductionZone");
      }
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect.each([
  "account",
  "zone",
  "missing-zone",
  "patch",
  "teardown",
  "graph",
] as const)(
  "refuses a native %s input before writing its projection",
  (problem) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { config: base, repositoryRoot } = yield* nativePlanFixture("prod");
      yield* fs.writeFileString(
        base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH,
        yield* fs.readFileString(
          "tools/docs-deployment/fixtures/alchemy-beta.80/native-apps-production.txt"
        )
      );
      const result = yield* projectWorkflowPlan.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            ...base,
            TAXKIT_WORKFLOW_PLAN_ACCOUNT_ID:
              problem === "account"
                ? "0".repeat(32)
                : "f9f94270a4a5af8af7010d891020922d",
            TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256:
              problem === "patch"
                ? "private-input-sentinel"
                : base.TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256,
            TAXKIT_WORKFLOW_PLAN_GRAPH:
              problem === "graph" ? "private-input-sentinel" : "native-apps",
            TAXKIT_WORKFLOW_PLAN_KIND:
              problem === "teardown" ? "destroy" : "deploy",
            TAXKIT_WORKFLOW_PLAN_STAGE: "prod",
            TAXKIT_WORKFLOW_PLAN_ZONE_ID: Record.get(
              {
                account: "15103853342ab9f18f7894b7fae39c39",
                graph: "15103853342ab9f18f7894b7fae39c39",
                "missing-zone": undefined,
                patch: "15103853342ab9f18f7894b7fae39c39",
                teardown: "15103853342ab9f18f7894b7fae39c39",
                zone: "0".repeat(32),
              },
              problem
            ).pipe(Option.getOrUndefined),
          })
        ),
        Effect.result
      );
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure._tag).toBe("WorkflowPlanProjectionError");
        expect(String(result.failure)).not.toContain("private-input-sentinel");
        expect(String(result.failure)).not.toContain(repositoryRoot);
      }
      expect(yield* fs.exists(base.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH)).toBe(
        false
      );
      expect(yield* fs.exists(base.TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH)).toBe(
        false
      );
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect.each([
  [
    "candidate",
    "native app plan requires an unchanged clean checkout at its candidate commit",
  ],
  [
    "config",
    "native app plan supplied digests differ from its checked source identity",
  ],
  [
    "inputs",
    "native app plan supplied digests differ from its checked source identity",
  ],
  [
    "lock",
    "native app plan supplied digests differ from its checked source identity",
  ],
  [
    "patch-digest",
    "native app plan supplied digests differ from its checked source identity",
  ],
  [
    "dirty",
    "native app plan requires an unchanged clean checkout at its candidate commit",
  ],
  [
    "untracked",
    "native app plan requires an unchanged clean checkout at its candidate commit",
  ],
  [
    "outputs-collide",
    "native app plan output paths must be distinct files inside its ignored plan directory",
  ],
  [
    "identity-overwrites-plan",
    "native app plan output paths must be distinct files inside its ignored plan directory",
  ],
  [
    "projection-overwrites-plan",
    "native app plan output paths must be distinct files inside its ignored plan directory",
  ],
  [
    "output-source",
    "native app plan output paths must be distinct files inside its ignored plan directory",
  ],
  [
    "output-symlink",
    "native app plan output paths must be distinct files inside its ignored plan directory",
  ],
  [
    "other-stage-output",
    "native app plan output paths must be distinct files inside its ignored plan directory",
  ],
  [
    "version",
    "native app plan requires an unchanged clean checkout at its candidate commit",
  ],
] as const)(
  "refuses native source/output %s before either receipt is written",
  ([problem, reason]) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const { config: base, repositoryRoot } = yield* nativePlanFixture();
      const sourcePath = path.join(
        repositoryRoot,
        "packages/calculators/src/source-fixture.ts"
      );
      const original = yield* fs.readFileString(sourcePath);
      const originalPlan = yield* fs.readFileString(
        base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH
      );
      yield* Match.value(problem).pipe(
        Match.when("dirty", () =>
          fs.writeFileString(sourcePath, "export const fixture = false;\n")
        ),
        Match.when("untracked", () =>
          fs.writeFileString(
            path.join(repositoryRoot, "packages/calculators/src/untracked.ts"),
            "export const untracked = true;\n"
          )
        ),
        Match.when("output-symlink", () =>
          fs.symlink(sourcePath, base.TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH)
        ),
        Match.when("other-stage-output", () =>
          fs.makeDirectory(
            path.join(repositoryRoot, "tmp/native-apps-plans/prod"),
            { recursive: true }
          )
        ),
        Match.when("version", () =>
          fs.writeFileString(
            path.join(repositoryRoot, "node_modules/alchemy/package.json"),
            '{"name":"alchemy","version":"2.0.0-beta.81"}\n'
          )
        ),
        Match.orElse(() => Effect.void)
      );
      const result = yield* projectWorkflowPlan.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            ...base,
            TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256:
              problem === "patch-digest"
                ? "f".repeat(64)
                : base.TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256,
            TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT:
              problem === "candidate"
                ? "f".repeat(40)
                : base.TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT,
            TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256:
              problem === "config"
                ? "f".repeat(64)
                : base.TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256,
            TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256:
              problem === "inputs"
                ? "f".repeat(64)
                : base.TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256,
            TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH: Match.value(problem).pipe(
              Match.when(
                "outputs-collide",
                () => base.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH
              ),
              Match.when("output-source", () => sourcePath),
              Match.when(
                "identity-overwrites-plan",
                () => base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH
              ),
              Match.when("other-stage-output", () =>
                path.join(
                  repositoryRoot,
                  "tmp/native-apps-plans/prod/source-identity.json"
                )
              ),
              Match.orElse(() => base.TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH)
            ),
            TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256:
              problem === "lock"
                ? "f".repeat(64)
                : base.TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256,
            TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH:
              problem === "projection-overwrites-plan"
                ? base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH
                : base.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH,
          })
        ),
        Effect.result
      );
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure).toHaveProperty("reason", reason);
        expect(String(result.failure)).not.toContain(repositoryRoot);
      }
      expect(yield* fs.exists(base.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH)).toBe(
        false
      );
      if (problem !== "output-symlink") {
        expect(yield* fs.exists(base.TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH)).toBe(
          false
        );
      }
      if (problem !== "dirty") {
        expect(yield* fs.readFileString(sourcePath)).toBe(original);
      }
      expect(
        yield* fs.readFileString(base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH)
      ).toBe(originalPlan);
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect(
  "refuses source bytes changing between capture and confirmation",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const { config, repositoryRoot } = yield* nativePlanFixture();
      const reads = yield* Ref.make(0);
      const changedPath = path.join(
        repositoryRoot,
        "patches/alchemy@2.0.0-beta.80.patch"
      );
      const changing = FileSystem.FileSystem.of({
        ...fs,
        readFile: (file) =>
          Effect.gen(function* () {
            const bytes = yield* fs.readFile(file);
            if (
              file === changedPath &&
              (yield* Ref.updateAndGet(reads, (count) => count + 1)) === 2
            ) {
              return new TextEncoder().encode("changed during capture");
            }
            return bytes;
          }),
      });
      const result = yield* projectWorkflowPlan.pipe(
        Effect.provideService(FileSystem.FileSystem, changing),
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown(config)
        ),
        Effect.result
      );
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure).toHaveProperty(
          "reason",
          "native app plan requires an unchanged clean checkout at its candidate commit"
        );
      }
      expect(yield* fs.exists(config.TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH)).toBe(
        false
      );
      expect(
        yield* fs.exists(config.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH)
      ).toBe(false);
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect.each(["preview", "production", "wrong-digest", "dirty"] as const)(
  "the actual native plan command checks %s without credentials or provider state",
  (scenario) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const { PATH } = yield* Config.schema(
        Schema.Struct({ PATH: Schema.String })
      );
      const root = yield* path.fromFileUrl(repositoryRootUrl);
      const { config, repositoryRoot } = yield* nativePlanFixture(
        scenario === "production" ? "prod" : "pr-214"
      );
      const isolatedHome = yield* fs.makeTempDirectoryScoped({
        prefix: "taxkit-native-plan-no-provider-",
      });
      if (scenario === "dirty") {
        yield* fs.writeFileString(
          path.join(
            repositoryRoot,
            "packages/calculators/src/source-fixture.ts"
          ),
          "export const fixture = false;\n"
        );
      }
      const handle = yield* spawner.spawn(
        ChildProcess.make(
          "bun",
          [
            "--no-env-file",
            "--conditions=source",
            "run",
            "tools/docs-deployment/workflow-plan-projection.runtime.ts",
          ],
          {
            cwd: root,
            env: {
              ...config,
              ALCHEMY_HOME: isolatedHome,
              BUN_OPTIONS: "--no-env-file --conditions=source",
              PATH,
              TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256:
                scenario === "preview"
                  ? undefined
                  : config.TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256,
              TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256:
                scenario === "preview"
                  ? undefined
                  : config.TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256,
              TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256:
                scenario === "preview"
                  ? undefined
                  : Match.value(scenario).pipe(
                      Match.when("wrong-digest", () => "f".repeat(64)),
                      Match.orElse(
                        () =>
                          config.TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256
                      )
                    ),
              TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256:
                scenario === "preview"
                  ? undefined
                  : config.TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256,
              TAXKIT_WORKFLOW_PLAN_ZONE_ID:
                scenario === "production"
                  ? "15103853342ab9f18f7894b7fae39c39"
                  : undefined,
            },
            extendEnv: false,
            forceKillAfter: "2 seconds",
            stderr: "pipe",
            stdin: "ignore",
            stdout: "pipe",
          }
        )
      );
      const [stdout, stderr, exitCode] = yield* Effect.all(
        [
          Stream.runCollect(handle.stdout),
          Stream.runCollect(handle.stderr),
          handle.exitCode,
        ],
        { concurrency: 3 }
      );
      const outBytes = Uint8Array.from(
        EffectArray.flatMap(stdout, EffectArray.fromIterable)
      );
      const errBytes = Uint8Array.from(
        EffectArray.flatMap(stderr, EffectArray.fromIterable)
      );
      if (scenario === "preview" || scenario === "production") {
        expect(Number(exitCode)).toBe(0);
        const encoded = yield* fs.readFileString(
          config.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH
        );
        const digest = yield* workflowSha256("workflow-plan", encoded);
        expect(outBytes).toEqual(new TextEncoder().encode(`${digest}\n`));
        expect(errBytes).toHaveLength(0);
        expect(
          yield* fs.exists(config.TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH)
        ).toBe(true);
      } else {
        expect(Number(exitCode)).toBe(1);
        expect(outBytes).toHaveLength(0);
        const reason =
          scenario === "dirty"
            ? "native app plan requires an unchanged clean checkout at its candidate commit"
            : "native app plan supplied digests differ from its checked source identity";
        expect(errBytes).toEqual(
          new TextEncoder().encode(`FAIL [workflow-plan] ${reason}\n`)
        );
        expect(
          yield* fs.exists(config.TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH)
        ).toBe(false);
        expect(
          yield* fs.exists(config.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH)
        ).toBe(false);
      }
      expect(yield* fs.readDirectory(isolatedHome)).toEqual([]);
    }).pipe(
      Effect.timeout("30 seconds"),
      Effect.scoped,
      Effect.provide(BunServices.layer)
    )
);

test.effect.each(["config", "inputs", "lock"] as const)(
  "retained v2 still requires its supplied %s digest before reading a plan",
  (missing) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped({
        prefix: "taxkit-retained-plan-digests-",
      });
      const base = planConfig(directory);
      const result = yield* projectWorkflowPlan.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            ...base,
            TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256:
              missing === "config"
                ? undefined
                : base.TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256,
            TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256:
              missing === "inputs"
                ? undefined
                : base.TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256,
            TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256:
              missing === "lock"
                ? undefined
                : base.TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256,
          })
        ),
        Effect.result
      );
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure).toHaveProperty(
          "reason",
          "workflow plan projection requires the candidate, digest, stage and plan paths"
        );
      }
      expect(yield* fs.exists(base.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH)).toBe(
        false
      );
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);
