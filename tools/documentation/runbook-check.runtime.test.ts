import { describe, expect, test } from "bun:test";

describe("runbook validator terminal output", () => {
  test("keeps a pre-receipt boundary failure bounded and free of home paths", () => {
    const missingFixture = new URL(
      "../../../private-runbook-fixture/",
      import.meta.url
    );
    const result = Bun.spawnSync({
      cmd: [
        "bun",
        "--conditions=source",
        "--eval",
        [
          'import * as BunRuntime from "@effect/platform-bun/BunRuntime";',
          'import { Effect } from "effect";',
          'import { runbookValidationOutcome } from "./tools/documentation/runbook-check.runtime.ts";',
          `const outcome = runbookValidationOutcome(new URL(${JSON.stringify(missingFixture.href)}));`,
          "BunRuntime.runMain(outcome.pipe(Effect.tap((ok) => Effect.sync(() => { process.exitCode = ok ? 0 : 1; }))));",
        ].join("\n"),
      ],
      cwd: new URL("../..", import.meta.url).pathname,
      stderr: "pipe",
      stdout: "pipe",
    });
    const output = new TextDecoder().decode(result.stderr);

    expect(result.exitCode).toBe(1);
    expect(output.length).toBeLessThan(1000);
    expect(output).toContain("operation=read-runbook-contract");
    expect(output).toContain("target=repository-local runbook contract");
    expect(output).toContain("recovery=");
    expect(output).toContain("nonclaim=");
    expect(output).not.toContain(missingFixture.pathname);
    expect(output).not.toMatch(/\/Users\/[^/\s]+\//u);
    expect(output).not.toContain("RunbookValidationError:");
  });
});
