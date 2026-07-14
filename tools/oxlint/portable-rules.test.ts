import { afterEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "../..");
const oxlint = join(repositoryRoot, "node_modules/.bin/oxlint");

const generatedFixtures = [
  "tools/oxlint/fixtures/.generated-effect-rejected.ts",
  "tools/oxlint/fixtures/.generated-bun-rejected.ts",
  "tools/oxlint/fixtures/.generated-mdx-rejected.tsx",
] as const;

const fixtureCases = [
  {
    accepted: [
      "tools/oxlint/fixtures/effect-accepted.ts",
      "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
    ],
    generated: generatedFixtures[0],
    namespace: "effect",
    rejected: "tools/oxlint/fixtures/effect-rejected.ts.txt",
    rules: [
      "no-console-outside-runtime",
      "no-effect-test-global-mix",
      "no-host-imports-in-contracts",
      "no-layer-exports-in-service-files",
      "no-manual-tag",
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
    generated: generatedFixtures[1],
    namespace: "bun",
    rejected: "tools/oxlint/fixtures/bun-rejected.ts.txt",
    rules: ["no-host-api-outside-adapters", "no-runtime-outside-entrypoints"],
  },
  {
    accepted: ["tools/oxlint/fixtures/mdx-accepted.tsx"],
    generated: generatedFixtures[2],
    namespace: "mdx",
    rejected: "tools/oxlint/fixtures/mdx-rejected.tsx.txt",
    rules: ["no-route-local-component-registry"],
  },
] as const;

const runOxlint = (path: string) => {
  const result = Bun.spawnSync({
    cmd: [
      oxlint,
      "-c",
      "oxlint.config.ts",
      "--disable-nested-config",
      "--no-error-on-unmatched-pattern",
      path,
    ],
    cwd: repositoryRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    exitCode: result.exitCode,
    output: `${new TextDecoder().decode(result.stdout)}${new TextDecoder().decode(result.stderr)}`,
  };
};

afterEach(async () => {
  await Promise.all(
    generatedFixtures.map((path) =>
      rm(join(repositoryRoot, path), { force: true })
    )
  );
});

describe("portable Oxlint plugins", () => {
  for (const fixture of fixtureCases) {
    test(`${fixture.namespace} rules accept boundary and unrelated-local fixtures`, () => {
      for (const path of fixture.accepted) {
        const result = runOxlint(path);

        expect(result.exitCode).toBe(0);
        expect(result.output).not.toContain(`${fixture.namespace}(`);
      }
    });

    test(`${fixture.namespace} rules reject invalid code through the real binary`, async () => {
      const source = await Bun.file(
        join(repositoryRoot, fixture.rejected)
      ).text();
      await Bun.write(join(repositoryRoot, fixture.generated), source);

      const result = runOxlint(fixture.generated);

      expect(result.exitCode).toBe(1);
      for (const rule of fixture.rules) {
        expect(result.output).toContain(`${fixture.namespace}(${rule})`);
      }
    });
  }
});
