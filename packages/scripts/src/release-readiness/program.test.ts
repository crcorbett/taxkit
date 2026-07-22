import { describe, expect, it } from "@effect/vitest";
import { Array, Effect, HashMap, Ref } from "effect";

import {
  formatReleaseReadinessError,
  ReleaseWorkspacePathError,
} from "./errors.js";
import { makeReleaseOutputRedactor } from "./live.layer.js";
import { runCiReleaseReadiness, runReleaseReadiness } from "./program.js";
import {
  makeReleaseReadinessPlan,
  ReleaseAttemptId,
  renderReleaseReadinessReport,
} from "./schemas.js";
import type { ReleaseCheckId, ReleaseTerminalState } from "./schemas.js";
import {
  makeReleaseCommandRunnerTest,
  TestCommandOutput,
  TestCommandStartFailure,
} from "./test.layer.js";
import type { TestCommandResult } from "./test.layer.js";

const workspaceRoot = "/workspace/taxkit";
const checks = makeReleaseReadinessPlan(workspaceRoot);
const candidate = {
  baseCommit: "e63a7b60c369ca880a49dce5d1ffddcf49a6365e",
  contentManifest: "docs/evidence/releases/HGI-203-content-manifest.txt",
  contentSha256: `sha256:${"0".repeat(64)}`,
} as const;

const successfulResults = Array.reduce(
  checks,
  HashMap.empty<ReleaseCheckId, TestCommandResult>(),
  (results, check) =>
    HashMap.set(
      results,
      check.id,
      new TestCommandOutput({
        exitCode: 0,
        stderr: "",
        stdout: `${check.id} passed`,
      })
    )
);

describe("release readiness", () => {
  it.effect(
    "runs CI as a report-only graph with no candidate or attempt receipt claim",
    () =>
      Effect.gen(function* testCiReportBoundary() {
        const memory = yield* makeReleaseCommandRunnerTest(successfulResults);
        const report = yield* runCiReleaseReadiness(checks).pipe(
          Effect.provide(memory.layer)
        );

        expect(report.mode).toBe("ci");
        expect(report.outcomes).toHaveLength(9);
        expect(JSON.stringify(report)).not.toContain("candidate");
        expect(JSON.stringify(report)).not.toContain("receipt");
        expect(yield* Ref.get(memory.invocations)).toHaveLength(9);
      })
  );

  it.effect(
    "runs every canonical check once in order with exact arguments and cwd",
    () =>
      Effect.gen(function* testSuccessfulReleaseReadiness() {
        const memory = yield* makeReleaseCommandRunnerTest(successfulResults);
        const report = yield* runReleaseReadiness(
          checks,
          ReleaseAttemptId.make("release-1"),
          candidate
        ).pipe(Effect.provide(memory.layer));
        const invocations = yield* Ref.get(memory.invocations);

        expect(
          Array.map(invocations, ({ args, command, cwd, id }) => [
            id,
            command,
            args,
            cwd,
          ])
        ).toEqual([
          ["verification", "bun", ["run", "verification"], workspaceRoot],
          ["test", "bun", ["run", "test"], workspaceRoot],
          ["build", "bun", ["run", "build"], workspaceRoot],
          ["docs-validation", "bun", ["run", "docs:validate"], workspaceRoot],
          [
            "packed-artifact",
            "bun",
            ["run", "--filter=@taxkit/sdk", "check-packed-artifact"],
            workspaceRoot,
          ],
          [
            "downstream-consumer",
            "bun",
            ["run", "--filter=@taxkit/sdk", "validate:downstream"],
            workspaceRoot,
          ],
          ["api-smoke", "bun", ["run", "--filter=api", "smoke"], workspaceRoot],
          [
            "docs-browser",
            "bun",
            ["run", "--filter=docs", "test:browser"],
            workspaceRoot,
          ],
          [
            "changeset-status",
            "bun",
            ["run", "changeset", "status", "--verbose"],
            workspaceRoot,
          ],
        ]);
        expect(renderReleaseReadinessReport(report)).toContain(
          "Release readiness passed 9 ordered checks once"
        );
        expect(renderReleaseReadinessReport(report)).not.toContain(
          workspaceRoot
        );
      })
  );

  it.effect("fails fast with the true non-zero exit and retained detail", () =>
    Effect.gen(function* testFailedReleaseCheck() {
      const results = HashMap.set(
        successfulResults,
        "build",
        new TestCommandOutput({
          exitCode: 2,
          stderr: "build failed",
          stdout: "partial build output",
        })
      );
      const memory = yield* makeReleaseCommandRunnerTest(results);
      const error = yield* runReleaseReadiness(
        checks,
        ReleaseAttemptId.make("release-1"),
        candidate
      ).pipe(Effect.provide(memory.layer), Effect.flip);

      expect(error.attempt.failedCheck).toBe("build");
      expect(error.attempt.lastSuccessfulCheck).toBe("test");
      expect(error.attempt.observedExitCode).toBe(2);
      expect(formatReleaseReadinessError(error)).toContain(
        "tmp/release-readiness/build-stderr.log"
      );
      expect(
        Array.map(yield* Ref.get(memory.invocations), (check) => check.id)
      ).toEqual(["verification", "test", "build"]);
    })
  );

  it.effect(
    "preserves process-start failure without invoking later checks",
    () =>
      Effect.gen(function* testProcessStartFailure() {
        const results = HashMap.set(
          successfulResults,
          "test",
          new TestCommandStartFailure({ message: "bun executable not found" })
        );
        const memory = yield* makeReleaseCommandRunnerTest(results);
        const error = yield* runReleaseReadiness(
          checks,
          ReleaseAttemptId.make("release-1"),
          candidate
        ).pipe(Effect.provide(memory.layer), Effect.flip);

        expect(error.attempt.failedCheck).toBe("test");
        expect(error.attempt.lastSuccessfulCheck).toBe("verification");
        expect(error.attempt.observedExitCode).toBeNull();
        expect(error.attempt.terminalState).toBe("start-failure");
        expect(
          Array.map(yield* Ref.get(memory.invocations), (check) => check.id)
        ).toEqual(["verification", "test"]);
      })
  );

  for (const terminalState of [
    "interrupted",
    "early-pipe-close",
    "missing-detail",
    "corrupt-detail",
    "false-success",
  ] satisfies readonly ReleaseTerminalState[]) {
    it.effect(`preserves ${terminalState} without a presentation rerun`, () =>
      Effect.gen(function* testTerminalFailure() {
        const results = HashMap.set(
          successfulResults,
          "verification",
          terminalState === "interrupted" ||
            terminalState === "early-pipe-close"
            ? new TestCommandStartFailure({
                message: terminalState,
                terminalState,
              })
            : new TestCommandOutput({
                exitCode: 0,
                stderr: "",
                stdout: "",
                terminalState,
              })
        );
        const memory = yield* makeReleaseCommandRunnerTest(results);
        const error = yield* runReleaseReadiness(
          checks,
          ReleaseAttemptId.make("release-1"),
          candidate
        ).pipe(Effect.provide(memory.layer), Effect.flip);
        const rendered = formatReleaseReadinessError(error);
        expect(rendered).toContain(terminalState);
        expect(rendered).toContain("do not rerun");
        expect(yield* Ref.get(memory.invocations)).toHaveLength(1);
      })
    );
  }

  it("redacts credentials and home paths across every chunk boundary", () => {
    const separator = String.fromCodePoint(47);
    const macHome = ["", "Users", "cooper", "mac-project"].join(separator);
    const linuxHome = ["", "home", "alice", "linux-project"].join(separator);
    const windowsSeparator = String.fromCodePoint(92);
    const windowsHome = ["C:", "Users", "alice", "windows-project"].join(
      windowsSeparator
    );
    const uncHome = ["", "", "server", "Users", "alice", "unc-project"].join(
      windowsSeparator
    );
    const input = `safe token = abc123 ${macHome} ${linuxHome} ${windowsHome} ${uncHome} Authorization: Bearer bearer-secret ghp_1234567890 github_pat_1234567890 sk-1234567890 done`;

    for (let split = 0; split <= input.length; split += 1) {
      const redactor = makeReleaseOutputRedactor();
      const output = `${redactor.write(input.slice(0, split))}${redactor.write(
        input.slice(split)
      )}${redactor.end()}`;
      expect(output).toContain("safe");
      expect(output).toContain("token = <redacted>");
      expect(output).toContain("<home>/mac-project");
      expect(output).toContain("<home>/linux-project");
      expect(output).toContain(
        ["<home>", "windows-project"].join(windowsSeparator)
      );
      expect(output).toContain(
        ["<home>", "unc-project"].join(windowsSeparator)
      );
      expect(output).not.toContain("abc123");
      expect(output).not.toContain("bearer-secret");
      expect(output).not.toContain("cooper");
      expect(output).not.toContain("alice");
      expect(output).not.toContain("ghp_1234567890");
      expect(output).not.toContain("github_pat_1234567890");
      expect(output).not.toContain("sk-1234567890");
    }
  });

  it("redacts diagnostic and file URL home paths across every chunk boundary", () => {
    const separator = String.fromCodePoint(47);
    const windowsSeparator = String.fromCodePoint(92);
    const cases = [
      {
        input: `file:${separator}${separator}${separator}Users${separator}alice${separator}mac-project`,
        retainedSuffix: `${separator}mac-project`,
      },
      {
        input: `file:${separator}${separator}${separator}home${separator}alice${separator}linux-project`,
        retainedSuffix: `${separator}linux-project`,
      },
      {
        input: `path:${separator}Users${separator}alice${separator}mac-project`,
        retainedSuffix: `${separator}mac-project`,
      },
      {
        input: `path:${separator}home${separator}alice${separator}linux-project`,
        retainedSuffix: `${separator}linux-project`,
      },
      {
        input: `path:C:${windowsSeparator}Users${windowsSeparator}alice${windowsSeparator}windows-project`,
        retainedSuffix: `${windowsSeparator}windows-project`,
      },
      {
        input: `path:${windowsSeparator}${windowsSeparator}server${windowsSeparator}Users${windowsSeparator}alice${windowsSeparator}unc-project`,
        retainedSuffix: `${windowsSeparator}unc-project`,
      },
    ] as const;

    for (const fixture of cases) {
      for (let split = 0; split <= fixture.input.length; split += 1) {
        const redactor = makeReleaseOutputRedactor();
        const output = `${redactor.write(
          fixture.input.slice(0, split)
        )}${redactor.write(fixture.input.slice(split))}${redactor.end()}`;

        expect(output).toContain(`<home>${fixture.retainedSuffix}`);
        expect(output).not.toContain(fixture.input);
        expect(output).not.toContain(
          fixture.input.slice(
            0,
            fixture.input.indexOf("alice") + "alice".length
          )
        );
        expect(output).not.toContain("alice");
      }
    }
  });

  it("preserves ordinary relative path text", () => {
    const relative = String.raw`docs/Users/alice docs/home/alice ./home/alice home/alice Users/alice C:Users\alice identifier_home/alice`;
    const redactor = makeReleaseOutputRedactor();
    const output = `${redactor.write(relative)}${redactor.end()}`;

    expect(output).toBe(relative);
  });

  it("retains multi-megabyte safe output without applying the excerpt cap", () => {
    const input = "safe-output-line\n".repeat(131_072);
    const redactor = makeReleaseOutputRedactor();
    let output = "";
    for (let offset = 0; offset < input.length; offset += 4096) {
      output += redactor.write(input.slice(offset, offset + 4096));
    }
    output += redactor.end();
    expect(output).toBe(input);
    expect(output.length).toBeGreaterThan(1024 * 1024);
  });

  it("renders typed workspace path failures without host-path disclosure", () => {
    const error = new ReleaseWorkspacePathError({
      target: "repository workspace root",
    });
    const rendered = formatReleaseReadinessError(error);
    const separator = String.fromCodePoint(47);
    const usersPath = ["", "Users", ""].join(separator);
    const homePath = ["", "home", ""].join(separator);
    const workspacePath = ["", "workspace", ""].join(separator);

    expect(rendered).toContain("FAIL [workspace-path] Resolve repository root");
    expect(rendered).toContain("target: repository workspace root");
    expect(rendered).not.toContain("file:");
    expect(rendered).not.toContain(usersPath);
    expect(rendered).not.toContain(homePath);
    expect(rendered).not.toContain(workspacePath);
  });
});
