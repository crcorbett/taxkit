import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Stream } from "effect";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { decodeReleaseReadinessCli } from "./cli.js";

describe("release readiness CLI ingress", () => {
  it.effect("decodes only candidate or report-only CI modes", () =>
    Effect.gen(function* testReleaseReadinessCli() {
      expect(yield* decodeReleaseReadinessCli([])).toEqual({
        mode: "candidate",
      });
      expect(yield* decodeReleaseReadinessCli(["--ci"])).toEqual({
        mode: "ci",
      });
      expect(
        (yield* decodeReleaseReadinessCli(["--ci", "--write"]).pipe(
          Effect.flip
        ))._tag
      ).toBe("ReleaseReadinessCliError");
    })
  );
});

it.effect.each([
  ["invalid argument", ["--TAXKIT_SECRET_SENTINEL"]],
  ["extra argument", ["--ci", "--TAXKIT_SECRET_SENTINEL"]],
  ["retained packet", []],
] as const)(
  "runs the real CLI with %s and fails without running release checks",
  ([_name, args]) =>
    Effect.gen(function* testReleaseCliHost() {
      const path = yield* Path.Path;
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const cwd = yield* path.fromFileUrl(new URL("../..", import.meta.url));
      const handle = yield* spawner.spawn(
        ChildProcess.make(
          "bun",
          [
            "run",
            "src/release-readiness/release-readiness.runtime.ts",
            ...args,
          ],
          { cwd, stderr: "pipe", stdin: "ignore", stdout: "pipe" }
        )
      );
      const [exitCode, stdout, stderr] = yield* Effect.all(
        [
          handle.exitCode,
          Stream.mkString(Stream.decodeText(handle.stdout)),
          Stream.mkString(Stream.decodeText(handle.stderr)),
        ],
        { concurrency: "unbounded" }
      );
      expect(Number(exitCode)).toBe(1);
      expect(`${stdout}${stderr}`).toContain(
        args.length === 0 ? "FAIL [release-evidence]" : "FAIL [release-cli]"
      );
      expect(`${stdout}${stderr}`).not.toContain("RUN  [");
      expect(`${stdout}${stderr}`).not.toContain("RECEIPT ");
      expect(`${stdout}${stderr}`).not.toContain("TAXKIT_SECRET_SENTINEL");
      expect(`${stdout}${stderr}`).not.toContain(cwd);
    }).pipe(Effect.provide(BunServices.layer))
);
