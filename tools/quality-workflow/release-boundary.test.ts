import { describe, expect, test } from "bun:test";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { Effect, Schema } from "effect";

import { ReleaseBoundaryFixtureCorpus } from "./schemas.js";

const repositoryRoot = new URL("../..", import.meta.url).pathname;
const fixtures = Effect.runSync(
  Schema.decodeUnknownEffect(
    Schema.fromJsonString(ReleaseBoundaryFixtureCorpus)
  )(
    await Bun.file(
      new URL("fixtures/release-boundary-defects.json", import.meta.url)
    ).text()
  )
);

const run = async (
  cwd: string,
  executable: string,
  args: readonly string[]
) => {
  const process = Bun.spawn([executable, ...args], {
    cwd,
    env: globalThis.process.env,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [exitCode, stderr, stdout] = await Promise.all([
    process.exited,
    new Response(process.stderr).text(),
    new Response(process.stdout).text(),
  ]);
  return { exitCode, stderr, stdout };
};

const prepareWorkspace = async () => {
  const workspace = await mkdtemp(join(tmpdir(), "taxkit-hgi205-boundaries-"));
  const inventory = await run(repositoryRoot, "git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
  ]);
  expect(inventory.exitCode).toBe(0);
  for (const relativePath of inventory.stdout.trim().split("\n")) {
    if (relativePath.length === 0) {
      continue;
    }
    const destination = join(workspace, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    const source = join(repositoryRoot, relativePath);
    const sourceStat = await lstat(source);
    await (sourceStat.isSymbolicLink()
      ? readlink(source).then((link) => symlink(link, destination))
      : copyFile(source, destination));
  }
  const install = await run(workspace, "bun", [
    "install",
    "--offline",
    "--frozen-lockfile",
    "--linker=hoisted",
  ]);
  expect(install.exitCode).toBe(0);
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
  const scope = join(workspace, "node_modules", "@taxkit");
  await mkdir(scope, { recursive: true });
  for (const [name, packageRoot] of workspacePackages) {
    const alias = join(scope, name);
    await rm(alias, { force: true, recursive: true });
    await symlink(join("..", "..", packageRoot), alias, "dir");
  }
  const apiScope = join(workspace, "apps", "api", "node_modules", "@taxkit");
  await mkdir(apiScope, { recursive: true });
  for (const [name, packageRoot] of workspacePackages) {
    const alias = join(apiScope, name);
    await rm(alias, { force: true, recursive: true });
    await symlink(join("..", "..", "..", "..", packageRoot), alias, "dir");
  }
  return workspace;
};

const expected = {
  "api-contract": {
    check: "api-smoke",
    command: ["bun", "run", "--filter=api", "smoke"],
    recovery:
      "Restore the schema-derived OpenAPI document and rerun api-smoke.",
    target: "packages/api/http/src/openapi.ts",
  },
  "packed-sdk": {
    check: "packed-artifact",
    command: ["bun", "run", "--filter=@taxkit/sdk", "check-packed-artifact"],
    recovery:
      "Restore the packed root export target and rerun packed-artifact.",
    target: "packages/sdk/typescript/package.json",
  },
  "public-docs-manifest": {
    check: "docs-validation",
    command: ["bun", "run", "docs:validate"],
    recovery:
      "Restore the authored navigation source and rerun docs-validation.",
    target: "apps/docs/navigation.json",
  },
  "public-export": {
    check: "downstream-consumer",
    command: ["bun", "run", "--filter=@taxkit/sdk", "validate:downstream"],
    recovery:
      "Restore the documented browser-safe TaxKit export and rerun downstream-consumer.",
    target: "packages/sdk/typescript/src/index.ts",
  },
  "release-script": {
    check: "quality-workflow",
    command: ["bun", "run", "check:quality-workflow"],
    recovery:
      "Remove candidate evidence reads from CI mode and rerun quality-workflow.",
    target:
      "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
  },
  "workflow-semantics": {
    check: "quality-workflow",
    command: ["bun", "run", "check:quality-workflow"],
    recovery:
      "Restore the decoded canonical release command in the actual quality job.",
    target: ".github/workflows/quality.yml",
  },
} as const;

describe("HGI-205 isolated release-boundary mutations", () => {
  test("executes every real owning command and retains exact failure identity", async () => {
    for (const fixture of fixtures) {
      const workspace = await prepareWorkspace();
      try {
        const contract = expected[fixture.id];
        expect(fixture.expectedFailedCheck).toBe(contract.check);
        expect(fixture.target).toBe(contract.target);
        expect(fixture.recovery).toBe(contract.recovery);
        expect([fixture.command.executable, ...fixture.command.args]).toEqual(
          contract.command
        );
        expect(fixture.runner).toBe(
          "tools/quality-workflow/release-boundary.test.ts"
        );

        const target = join(workspace, fixture.target);
        const source = await readFile(target, "utf-8");
        expect(source.includes(fixture.mutation.search)).toBe(true);
        await writeFile(
          target,
          source.replaceAll(
            fixture.mutation.search,
            fixture.mutation.replacement
          )
        );
        if (fixture.id === "api-contract") {
          const build = await run(workspace, "bun", [
            "run",
            "build",
            "--filter=api...",
            "--force",
          ]);
          expect(build.exitCode).toBe(0);
        }
        const result = await run(
          workspace,
          fixture.command.executable,
          fixture.command.args
        );
        await writeFile(target, source);

        expect(result.exitCode).not.toBe(0);
        expect(`${result.stdout}\n${result.stderr}`).toContain(
          fixture.failureOracle
        );
      } finally {
        await rm(workspace, { force: true, recursive: true });
      }
    }
  }, 300_000);
});
