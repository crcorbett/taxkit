import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it as test } from "@effect/vitest";
import {
  Array,
  Config,
  Effect,
  FileSystem,
  Order,
  Path,
  Schema,
  Stream,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { parseDocument } from "yaml";

import { readWorkflowSha256 } from "./workflow-check.boundary.js";

const repositoryRootUrl = new URL("../..", import.meta.url);

const RetiredWorkflow = Schema.Struct({
  jobs: Schema.Struct({
    retired: Schema.Struct({
      "runs-on": Schema.Literal("ubuntu-latest"),
      steps: Schema.Array(
        Schema.Struct({
          name: Schema.Literal("Stop the retired docs operation"),
          run: Schema.String,
          shell: Schema.Literal("bash"),
        })
      ).check(Schema.isBetweenLength(1, 1)),
    }),
  }),
  name: Schema.String.check(Schema.isPattern(/ \(retired\)$/u)),
  on: Schema.Struct({ workflow_dispatch: Schema.Null }),
  permissions: Schema.Struct({}),
});

const stopScript = [
  "printf '%s\\n' 'The old documentation deployment is retired in this checkout.'",
  "printf '%s\\n' 'Recovery: docs/documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json'",
  "printf '%s\\n' 'New API/Website provider operations require their own reviewed procedure and approval.'",
  "exit 1",
  "",
].join("\n");

test.effect.each([
  [
    "docs-preview.yml",
    "98d3a50d4fb4c84f4473753a5a68898a45a88f9cc5f4c46b7a8bca763514dfc4",
  ],
  [
    "docs-production.yml",
    "bf3cf5f97ca6dbc32d7b797e19ef5faeae9ca9eb4a3d6e4f7ee98de040a5fa8e",
  ],
  [
    "docs-preview-teardown.yml",
    "1c0c7a7a74fdcea6dfac01c6371c8301315200ae01754fdcbf90440466b10252",
  ],
  [
    "docs-production-hosted-verify.yml",
    "82b880c5dc12c78e2fb0761545655984349e6857bd7711686508f685212682c9",
  ],
] as const)(
  "the current %s stops and its original bytes remain addressable",
  ([name, digest]) =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const root = yield* path.fromFileUrl(repositoryRootUrl);
      const source = yield* fileSystem.readFileString(
        path.join(root, ".github/workflows", name)
      );
      const document = yield* Effect.try(() =>
        parseDocument(source, { version: "1.2" }).toJS()
      );
      const workflow = yield* Schema.decodeUnknownEffect(RetiredWorkflow, {
        onExcessProperty: "error",
      })(document);
      const step = yield* Effect.fromOption(
        Array.head(workflow.jobs.retired.steps)
      );
      expect(step.run).toBe(stopScript);
      const handle = yield* spawner.spawn(
        ChildProcess.make(
          "/bin/bash",
          ["--noprofile", "--norc", "-c", step.run],
          {
            env: {},
            extendEnv: false,
            stderr: "ignore",
            stdin: "ignore",
            stdout: "ignore",
          }
        )
      );
      expect(Number(yield* handle.exitCode)).toBe(1);
      expect(
        yield* readWorkflowSha256(
          "workflow-input",
          path.join(
            root,
            "docs/evidence/deployments/retired-docs-workflows-2c5ffd40",
            `${name}.txt`
          ),
          "retained-writer-source"
        )
      ).toBe(digest);
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect.each([
  "tools/docs-deployment/retirement.runtime.ts",
  "tools/docs-deployment/local-doppler.runtime.ts",
  "tools/docs-deployment/workflow-evidence.runtime.ts",
  "docs:dev:cloudflare",
  "docs:dev:cloudflare:internal",
])(
  "the actual retired command %s stops without loading configuration or creating state",
  (command) =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const { PATH } = yield* Config.schema(
        Schema.Struct({ PATH: Schema.String })
      );
      const root = yield* path.fromFileUrl(repositoryRootUrl);
      const isolatedAlchemyHome = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "taxkit-retired-command-",
      });
      const handle = yield* spawner.spawn(
        ChildProcess.make("bun", ["--no-env-file", "run", command], {
          cwd: root,
          env: {
            ALCHEMY_HOME: isolatedAlchemyHome,
            BUN_OPTIONS: "--conditions=source --no-env-file",
            CI: "1",
            PATH,
          },
          extendEnv: false,
          forceKillAfter: "2 seconds",
          stderr: "pipe",
          stdin: "ignore",
          stdout: "pipe",
        })
      );
      const [stdout, stderr, exitCode] = yield* Effect.all(
        [
          Stream.runCollect(handle.stdout),
          Stream.runCollect(handle.stderr),
          handle.exitCode,
        ],
        { concurrency: 3 }
      );
      const output = new TextDecoder().decode(
        Uint8Array.from(
          Array.flatMap([...stdout, ...stderr], Array.fromIterable)
        )
      );
      expect(Number(exitCode)).not.toBe(0);
      expect(output).toContain(
        "The old documentation deployment is retired in this checkout."
      );
      expect(output).toContain("2026-10-07-docs-retirement-manifest.json");
      expect(output).not.toContain("FAIL [doppler-custody]");
      expect(output).not.toContain("FAIL [workflow-evidence] config=");
      expect(yield* fileSystem.readDirectory(isolatedAlchemyHome)).toEqual([]);
    }).pipe(
      Effect.timeout("30 seconds"),
      Effect.scoped,
      Effect.provide(BunServices.layer)
    )
);

test.effect(
  "the actual old Alchemy entry refuses before state or provider services",
  () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const environment = yield* Config.schema(
        Schema.Struct({ PATH: Schema.String })
      );
      const root = yield* path.fromFileUrl(repositoryRootUrl);
      const isolatedAlchemyHome = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "taxkit-retired-stack-refusal-",
      });
      const handle = yield* spawner.spawn(
        ChildProcess.make(
          "bun",
          [
            "--no-env-file",
            "run",
            "node_modules/alchemy/bin/cli.js",
            "plan",
            "--config",
            "alchemy.run.ts",
            "--env-file",
            "tools/docs-deployment/no-local-env",
            "--stage",
            "pr-1",
          ],
          {
            cwd: root,
            env: {
              ALCHEMY_HOME: isolatedAlchemyHome,
              ALCHEMY_TELEMETRY_DISABLED: "1",
              BUN_OPTIONS: "--conditions=source --no-env-file",
              CI: "1",
              PATH: environment.PATH,
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
      const output = new TextDecoder().decode(
        Uint8Array.from(
          Array.flatMap([...stdout, ...stderr], Array.fromIterable)
        )
      );
      expect(Number(exitCode)).not.toBe(0);
      expect(output).toContain("must export a default stack definition");
      expect(output).not.toContain("Plan: no resources");
      expect(output).not.toContain("No changes");
      expect(
        Array.sort(
          yield* fileSystem.readDirectory(isolatedAlchemyHome),
          Order.String
        )
      ).toEqual(["logs", "profiles"]);
      const profileNames = yield* fileSystem.readDirectory(
        path.join(isolatedAlchemyHome, "profiles")
      );
      expect(profileNames).toEqual(["default"]);
      yield* Effect.forEach(profileNames, (profileName) =>
        fileSystem
          .readDirectory(
            path.join(isolatedAlchemyHome, "profiles", profileName)
          )
          .pipe(Effect.map((entries) => expect(entries).toEqual([])))
      );
    }).pipe(
      Effect.timeout("30 seconds"),
      Effect.scoped,
      Effect.provide(BunServices.layer)
    )
);

// The saved owners keep their original bytes independently of today's stop.
test.effect.each([
  [
    "docs/evidence/deployments/retired-docs-operations-2c5ffd40/automation-register.json",
    "4d7e153db305960439c70b4040a6b8f7c4add2127836799443ffc46b02ba5c86",
  ],
  [
    "docs/evidence/deployments/retired-docs-operations-2c5ffd40/controls.json",
    "e60807ec265c918efb6b94478fd2792cddc638b06b24ebe59d6dbef4b51e366b",
  ],
  [
    "docs/evidence/deployments/retired-docs-operations-2c5ffd40/docs-deployment-journeys.json",
    "f152a1909404db8113d9c02d701be7c0183da4c8b1949e904a2f4989138a3263",
  ],
  [
    "docs/evidence/deployments/retired-docs-operations-2c5ffd40/docs-deployment.md.txt",
    "1da409682f370d6d08390b91a0ea92d2d120cd3e1943c2bbce7e35a0c0fc4aa7",
  ],
  [
    "docs/evidence/deployments/retired-docs-operations-2c5ffd40/package.json",
    "3d0677a3feb40ebc6dd8fc618dff5e23fdcce510520b72adc4f3a41f112b8205",
  ],
  [
    "docs/evidence/deployments/retired-docs-operations-2c5ffd40/local-doppler.runtime.ts.txt",
    "a4c11099ca5721c272d418ed4aa9b79084e8456a32168d7cfc06ab512fb82f53",
  ],
  [
    "docs/evidence/deployments/retired-docs-operations-2c5ffd40/workflow-evidence.runtime.ts.txt",
    "b24c40807715bc063a199e3b1c5627d397ee2ca7870ac2ecb8eeb5ba9e23a495",
  ],
] as const)(
  "retains the exact historical operation owner %s",
  ([retainedPath, digest]) =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const root = yield* path.fromFileUrl(repositoryRootUrl);
      expect(
        yield* readWorkflowSha256(
          "workflow-input",
          path.join(root, retainedPath),
          "historical-operation-owner"
        )
      ).toBe(digest);
    }).pipe(Effect.provide(BunServices.layer))
);
