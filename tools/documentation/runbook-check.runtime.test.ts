import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import {
  Array,
  Effect,
  FileSystem,
  Option,
  Path,
  Schema,
  Stream,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { RunbookContract, RunbookValidationReceipt } from "./schemas.js";

describe("runbook validator terminal output", () => {
  test.effect.each([
    {
      kind: "missing",
      name: "keeps a pre-receipt boundary failure bounded and free of home paths",
    },
    {
      kind: "violation",
      name: "keeps a policy failure nonzero after writing its complete receipt",
    },
  ])("$name", ({ kind }) =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const fs = yield* FileSystem.FileSystem;
      const root = yield* path.fromFileUrl(new URL("../..", import.meta.url));
      const fixtureRoot =
        kind === "missing"
          ? yield* path.fromFileUrl(
              new URL("../../../private-runbook-fixture/", import.meta.url)
            )
          : yield* fs.makeTempDirectoryScoped({
              prefix: "taxkit-runbook-policy-",
            });
      if (kind === "violation") {
        yield* Effect.forEach(
          [
            "docs",
            "tools/documentation/runbook-contract.json",
            "package.json",
            "packages/sdk/typescript/package.json",
          ],
          (relativePath) =>
            fs
              .makeDirectory(
                path.dirname(path.join(fixtureRoot, relativePath)),
                { recursive: true }
              )
              .pipe(
                Effect.andThen(
                  fs.copy(
                    path.join(root, relativePath),
                    path.join(fixtureRoot, relativePath)
                  )
                )
              )
        );
        const contract = yield* fs
          .readFileString(
            path.join(fixtureRoot, "tools/documentation/runbook-contract.json")
          )
          .pipe(
            Effect.flatMap(
              Schema.decodeEffect(Schema.fromJsonString(RunbookContract))
            )
          );
        const recovery = Array.findFirst(
          contract.runbooks,
          (runbook) => runbook.id === "recovery"
        ).pipe(Option.getOrElse(() => expect.unreachable()));
        const recoveryPath = path.join(fixtureRoot, recovery.path);
        const text = yield* fs.readFileString(recoveryPath);
        yield* fs.writeFileString(
          recoveryPath,
          text.replace("## Non-claims", "## Missing section fixture")
        );
      }
      const missingFixture = yield* path.toFileUrl(fixtureRoot);
      const encodedUrl = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.String)
      )(missingFixture.href);
      const child = yield* spawner.spawn(
        ChildProcess.make(
          "bun",
          [
            "--conditions=source",
            "--eval",
            [
              'import * as BunRuntime from "@effect/platform-bun/BunRuntime";',
              'import * as BunServices from "@effect/platform-bun/BunServices";',
              'import { Effect } from "effect";',
              'import { runbookValidationOutcome } from "./tools/documentation/runbook-check.runtime.ts";',
              'import { RunbookValidationError } from "./tools/documentation/schemas.ts";',
              `const outcome = runbookValidationOutcome(new URL(${encodedUrl}));`,
              'BunRuntime.runMain(outcome.pipe(Effect.flatMap((ok) => ok ? Effect.void : Effect.fail(new RunbookValidationError({ operation: "fixture-result" }))), Effect.provide(BunServices.layer)), { disableErrorReporting: true });',
            ].join("\n"),
          ],
          {
            cwd: root,
            extendEnv: true,
            stderr: "pipe",
            stdin: "ignore",
            stdout: "pipe",
          }
        )
      );
      const [exitCode, output, stdout] = yield* Effect.all(
        [
          child.exitCode,
          Stream.mkString(Stream.decodeText(child.stderr)),
          Stream.mkString(Stream.decodeText(child.stdout)),
        ],
        { concurrency: "unbounded" }
      );
      expect(Number(exitCode)).toBe(1);
      expect(output.length).toBeLessThan(1000);
      if (kind === "missing") {
        expect(output).toContain("operation=read-runbook-contract");
        expect(output).toContain("target=repository-local runbook contract");
        expect(output).toContain("recovery=");
        expect(output).toContain("nonclaim=");
        expect(stdout).toBe("");
      } else {
        expect(output).toBe("");
        expect(stdout).toContain("Runbook validation failed.");
        expect(stdout).toContain("executed=0");
        const receipt = yield* fs
          .readFileString(
            path.join(fixtureRoot, "tmp/runbook-validation-report.json")
          )
          .pipe(
            Effect.flatMap(
              Schema.decodeEffect(
                Schema.fromJsonString(RunbookValidationReceipt)
              )
            )
          );
        expect(receipt.ok).toBe(false);
        expect(receipt.operationsExecuted).toEqual([]);
        expect(receipt.violationCount).toBeGreaterThan(0);
        expect(
          Array.some(
            receipt.diagnostics,
            (finding) => finding.invariant === "required-section"
          )
        ).toBe(true);
        expect(
          Array.some(
            receipt.diagnostics,
            (finding) => finding.invariant === "accepted-handoff"
          )
        ).toBe(false);
      }
      expect(output).not.toContain(missingFixture.pathname);
      expect(output).not.toMatch(/\/Users\/[^/\s]+\//u);
      expect(output).not.toContain("RunbookValidationError:");
    }).pipe(Effect.provide(BunServices.layer))
  );
});
