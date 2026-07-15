import { describe, expect, it } from "@effect/vitest";
import { Array, Effect, HashMap, Match, Ref } from "effect";

import {
  formatReleaseReadinessError,
  ReleaseWorkspacePathError,
} from "./errors.js";
import { runReleaseReadiness } from "./program.js";
import {
  makeReleaseReadinessPlan,
  renderReleaseReadinessReport,
} from "./schemas.js";
import type { ReleaseCheckId } from "./schemas.js";
import {
  makeReleaseCommandRunnerTest,
  TestCommandOutput,
  TestCommandStartFailure,
} from "./test.layer.js";
import type { TestCommandResult } from "./test.layer.js";

const workspaceRoot = "/workspace/taxkit";
const checks = makeReleaseReadinessPlan(workspaceRoot);

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
    "runs every canonical check in order with exact arguments and cwd",
    () =>
      Effect.gen(function* testSuccessfulReleaseReadiness() {
        const memory = yield* makeReleaseCommandRunnerTest(successfulResults);
        const report = yield* runReleaseReadiness(checks).pipe(
          Effect.provide(memory.layer)
        );
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
        expect(
          Array.map(report.outcomes, (outcome) => outcome.check.id)
        ).toEqual(Array.map(checks, (check) => check.id));
        expect(renderReleaseReadinessReport(report)).toContain(
          "Release readiness passed 9 ordered checks."
        );
        expect(renderReleaseReadinessReport(report)).toContain(
          `PASS [docs-browser] bun run --filter=docs test:browser (cwd: ${workspaceRoot})`
        );
      })
  );

  it.effect("fails fast with a typed non-zero command outcome", () =>
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
      const error = yield* runReleaseReadiness(checks).pipe(
        Effect.provide(memory.layer),
        Effect.flip
      );

      Match.value(error).pipe(
        Match.tag("ReleaseCheckFailedError", (failure) => {
          expect(failure.outcome.check.id).toBe("build");
          expect(failure.outcome.exitCode).toBe(2);
          expect(formatReleaseReadinessError(failure)).toContain(
            "stderr:\nbuild failed"
          );
        }),
        Match.tag("ReleaseCommandExecutionError", () =>
          expect.unreachable("expected a non-zero command failure")
        ),
        Match.exhaustive
      );
      expect(
        Array.map(yield* Ref.get(memory.invocations), (check) => check.id)
      ).toEqual(["verification", "test", "build"]);
    })
  );

  it.effect("preserves typed process-start failures and their rendering", () =>
    Effect.gen(function* testProcessStartFailure() {
      const results = HashMap.set(
        successfulResults,
        "test",
        new TestCommandStartFailure({ message: "bun executable not found" })
      );
      const memory = yield* makeReleaseCommandRunnerTest(results);
      const error = yield* runReleaseReadiness(checks).pipe(
        Effect.provide(memory.layer),
        Effect.flip
      );

      Match.value(error).pipe(
        Match.tag("ReleaseCommandExecutionError", (failure) => {
          expect(failure.check.id).toBe("test");
          expect(formatReleaseReadinessError(failure)).toContain(
            "command: bun run test"
          );
          expect(formatReleaseReadinessError(failure)).toContain(
            "execution error: bun executable not found"
          );
        }),
        Match.tag("ReleaseCheckFailedError", () =>
          expect.unreachable("expected a process-start failure")
        ),
        Match.exhaustive
      );
      expect(
        Array.map(yield* Ref.get(memory.invocations), (check) => check.id)
      ).toEqual(["verification", "test"]);
    })
  );

  it("renders typed workspace path failures with their URL", () => {
    const error = new ReleaseWorkspacePathError({
      message: "file URL could not be converted",
      url: "file:///workspace/taxkit",
    });

    expect(formatReleaseReadinessError(error)).toContain(
      "FAIL [workspace-path] Resolve repository root"
    );
    expect(formatReleaseReadinessError(error)).toContain(
      "url: file:///workspace/taxkit"
    );
  });
});
