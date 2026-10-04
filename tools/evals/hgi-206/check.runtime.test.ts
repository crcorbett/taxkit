import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it as test } from "@effect/vitest";
import { Effect, Path, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

test.effect.each([
  {
    args: [],
    command: "hgi-206",
    oracle:
      "FAIL [input] target=docs/exec-plans/active/harness-governance-documentation.md",
    source: "tools/evals/hgi-206/check.runtime.ts",
  },
  {
    args: [],
    command: "harness-foundation-epoch",
    oracle: "FAIL [skill-receipt-projection]",
    source: "tools/evals/harness-foundation/check.runtime.ts",
  },
  {
    args: ["--not-an-option"],
    command: "hgi-206",
    oracle: "",
    source: "tools/evals/hgi-206/check.runtime.ts",
  },
  {
    args: ["--not-an-option"],
    command: "harness-foundation-epoch",
    oracle: "",
    source: "tools/evals/harness-foundation/check.runtime.ts",
  },
])(
  "keeps $command historical or option failures nonzero ($args)",
  ({ source, args, oracle, command }) =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const root = yield* path.fromFileUrl(
        new URL("../../..", import.meta.url)
      );
      const child = yield* spawner.spawn(
        ChildProcess.make(
          "bun",
          ["--conditions=source", "run", source, ...args],
          {
            cwd: root,
            extendEnv: true,
            stderr: "pipe",
            stdin: "ignore",
            stdout: "pipe",
          }
        )
      );
      const [exitCode, stdout, stderr] = yield* Effect.all(
        [
          child.exitCode,
          Stream.mkString(Stream.decodeText(child.stdout)),
          Stream.mkString(Stream.decodeText(child.stderr)),
        ],
        { concurrency: "unbounded" }
      );
      expect(Number(exitCode)).toBe(1);
      expect(stdout.length).toBeLessThan(1500);
      expect(stderr.length).toBeLessThan(1000);
      expect(`${stdout}${stderr}`).not.toMatch(/\/Users\/[^/\s]+\//u);
      expect(stderr).not.toContain("Error:");
      if (args.length === 0) {
        expect(stderr).toContain(oracle);
        expect(stderr).toContain("recovery=");
        expect(stdout).toBe("");
      } else {
        expect(stdout).toContain("USAGE");
        expect(stdout).toContain(`check-${command}`);
      }
    }).pipe(Effect.provide(BunServices.layer))
);
