import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import {
  Array as EffectArray,
  Effect,
  FileSystem,
  Match,
  Path,
  Result,
  Schema,
  Stream,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { ReleaseBoundaryFixtureCorpus } from "./schemas.js";

const repositoryRootUrl = new URL("../..", import.meta.url);

// The test scope owns each process and drains both pipes while waiting for its exit.
const runBoundaryCommand = Effect.fnUntraced(function* (
  cwd: string,
  executable: string,
  args: readonly string[],
  environment: Readonly<Record<string, string>> = {}
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const child = yield* spawner.spawn(
    ChildProcess.make(executable, args, {
      cwd,
      env: environment,
      extendEnv: true,
      stderr: "pipe",
      stdin: "ignore",
      stdout: "pipe",
    })
  );
  const [exitCode, stderr, stdout] = yield* Effect.all(
    [
      child.exitCode,
      Stream.mkString(Stream.decodeText(child.stderr)),
      Stream.mkString(Stream.decodeText(child.stdout)),
    ],
    { concurrency: "unbounded" }
  );
  return { exitCode, stderr, stdout };
});

// A scoped native server reserves an ephemeral address; it closes before the smoke command starts.
const findAvailableLoopbackPort = Effect.gen(function* () {
  const server = yield* BunHttpServer.make({ hostname: "127.0.0.1", port: 0 });
  return Match.value(server.address).pipe(
    Match.tags({
      InetAddressV4: (address) => address.port,
      InetAddressV6: (address) => address.port,
      UnixPathAddress: () => expect.unreachable(),
    }),
    Match.exhaustive
  );
}).pipe(Effect.scoped);

const prepareWorkspace = Effect.fnUntraced(function* (repositoryRoot: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const workspace = yield* fs.makeTempDirectoryScoped({
    prefix: "taxkit-hgi205-boundaries-",
  });
  const inventory = yield* runBoundaryCommand(repositoryRoot, "git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
  ]);
  expect(inventory.exitCode).toBe(0);
  yield* Effect.forEach(
    EffectArray.filter(
      inventory.stdout.trim().split("\n"),
      (relativePath) => relativePath.length > 0
    ),
    (relativePath) =>
      Effect.gen(function* () {
        const destination = path.join(workspace, relativePath);
        yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
        const source = path.join(repositoryRoot, relativePath);
        // FileSystem.stat follows links in the installed platform. readLink preserves the exact relative target.
        // Only the host's EINVAL (ordinary file) falls back to copyFile; permission/missing/other errors fail.
        yield* fs.readLink(source).pipe(
          Effect.flatMap((target) => fs.symlink(target, destination)),
          Effect.catchTag("PlatformError", (error) =>
            Match.value(error.reason._tag).pipe(
              Match.when(
                "Unknown",
                () =>
                  error.reason.method === "readLink" &&
                  Result.isSuccess(
                    Schema.decodeUnknownResult(
                      Schema.Struct({ code: Schema.Literal("EINVAL") })
                    )(error.reason.cause)
                  )
              ),
              Match.orElse(() => false)
            )
              ? fs.copyFile(source, destination)
              : Effect.fail(error)
          )
        );
      }),
    { concurrency: 16 }
  );
  const install = yield* runBoundaryCommand(workspace, "bun", [
    "install",
    "--offline",
    "--frozen-lockfile",
    "--linker=hoisted",
  ]);
  expect(
    install.exitCode,
    `Offline frozen fixture install failed in ${workspace}:\n${install.stderr}\n${install.stdout}`
  ).toBe(0);
  const workspacePackages = [
    ["api-http", "packages/api/http"],
    ["calculators", "packages/calculators"],
    ["core", "packages/core"],
    ["rules-au-income-tax", "packages/rules/au/income-tax"],
    ["rules-au-pay", "packages/rules/au/pay"],
    ["rules-au-stsl", "packages/rules/au/stsl"],
    ["scripts", "packages/scripts"],
    ["sdk", "packages/sdk/typescript"],
    ["testing", "packages/testing"],
    ["tsconfig", "packages/tsconfig"],
  ] as const;
  yield* Effect.forEach(
    [
      {
        prefix: ["..", ".."],
        scope: path.join(workspace, "node_modules", "@taxkit"),
      },
      {
        prefix: ["..", "..", "..", ".."],
        scope: path.join(workspace, "apps", "api", "node_modules", "@taxkit"),
      },
    ],
    ({ scope, prefix }) =>
      Effect.gen(function* () {
        yield* fs.makeDirectory(scope, { recursive: true });
        yield* Effect.forEach(workspacePackages, ([name, packageRoot]) =>
          Effect.gen(function* () {
            const alias = path.join(scope, name);
            yield* fs.remove(alias, { force: true, recursive: true });
            yield* fs.symlink(path.join(...prefix, packageRoot), alias);
          })
        );
      })
  );
  return workspace;
});

const expected = {
  apiContract: {
    check: "api-smoke",
    command: ["bun", "run", "--filter=api", "smoke"],
    recovery:
      "Restore the schema-derived OpenAPI document and rerun api-smoke.",
    target: "packages/api/http/src/openapi.ts",
  },
  packedSdk: {
    check: "packed-artifact",
    command: ["bun", "run", "--filter=@taxkit/sdk", "check-packed-artifact"],
    recovery:
      "Restore the packed root export target and rerun packed-artifact.",
    target: "packages/sdk/typescript/package.json",
  },
  publicDocsManifest: {
    check: "docs-validation",
    command: ["bun", "run", "docs:validate"],
    recovery:
      "Restore the authored navigation source and rerun docs-validation.",
    target: "packages/docs-content/navigation.json",
  },
  publicExport: {
    check: "downstream-consumer",
    command: ["bun", "run", "--filter=@taxkit/sdk", "validate:downstream"],
    recovery:
      "Restore the documented browser-safe TaxKit export and rerun downstream-consumer.",
    target: "packages/sdk/typescript/src/index.ts",
  },
  releaseScript: {
    check: "quality-workflow",
    command: ["bun", "run", "check:quality-workflow"],
    recovery:
      "Remove candidate evidence reads from CI mode and rerun quality-workflow.",
    target:
      "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
  },
  workflowSemantics: {
    check: "quality-workflow",
    command: ["bun", "run", "check:quality-workflow"],
    recovery:
      "Restore the decoded canonical release command in the actual quality job.",
    target: ".github/workflows/quality.yml",
  },
} as const;

describe("HGI-205 isolated release-boundary mutations", () => {
  test.effect(
    "executes every real owning command and retains exact failure identity",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const repositoryRoot = yield* path.fromFileUrl(repositoryRootUrl);
        const fixtures = yield* fs
          .readFileString(
            path.join(
              repositoryRoot,
              "tools/quality-workflow/fixtures/release-boundary-defects.json"
            )
          )
          .pipe(
            Effect.flatMap(
              Schema.decodeEffect(
                Schema.fromJsonString(ReleaseBoundaryFixtureCorpus),
                { onExcessProperty: "error" }
              )
            )
          );
        yield* Effect.forEach(fixtures, (fixture) =>
          Effect.gen(function* () {
            const workspace = yield* prepareWorkspace(repositoryRoot);
            const contract = Match.value(fixture.id).pipe(
              Match.when("api-contract", () => expected.apiContract),
              Match.when("packed-sdk", () => expected.packedSdk),
              Match.when(
                "public-docs-manifest",
                () => expected.publicDocsManifest
              ),
              Match.when("public-export", () => expected.publicExport),
              Match.when("release-script", () => expected.releaseScript),
              Match.when(
                "workflow-semantics",
                () => expected.workflowSemantics
              ),
              Match.exhaustive
            );
            expect(fixture.expectedFailedCheck).toBe(contract.check);
            expect(fixture.target).toBe(contract.target);
            expect(fixture.recovery).toBe(contract.recovery);
            expect([
              fixture.command.executable,
              ...fixture.command.args,
            ]).toEqual(contract.command);
            expect(fixture.runner).toBe(
              "tools/quality-workflow/release-boundary.test.ts"
            );
            const target = path.join(workspace, fixture.target);
            const source = yield* fs.readFileString(target);
            expect(source.includes(fixture.mutation.search)).toBe(true);
            yield* fs.writeFileString(
              target,
              source.replaceAll(
                fixture.mutation.search,
                fixture.mutation.replacement
              )
            );
            if (fixture.id === "api-contract") {
              const build = yield* runBoundaryCommand(workspace, "bun", [
                "run",
                "build",
                "--filter=api...",
                "--force",
              ]);
              expect(build.exitCode, `${build.stderr}\n${build.stdout}`).toBe(
                0
              );
            }
            const environment =
              fixture.id === "api-contract"
                ? {
                    TAXKIT_API_SMOKE_PORT: String(
                      yield* findAvailableLoopbackPort
                    ),
                  }
                : {};
            const result = yield* runBoundaryCommand(
              workspace,
              fixture.command.executable,
              fixture.command.args,
              environment
            );
            yield* fs.writeFileString(target, source);
            expect(result.exitCode).not.toBe(0);
            expect(`${result.stdout}\n${result.stderr}`).toContain(
              fixture.failureOracle
            );
          }).pipe(Effect.scoped)
        );
      }).pipe(Effect.provide(BunServices.layer)),
    300_000
  );
});
