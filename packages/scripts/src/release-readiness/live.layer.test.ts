import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import { Effect, FileSystem, Layer } from "effect";
import * as Path from "effect/Path";

import { ReleaseCommandRunnerLive } from "./live.layer.js";
import { ReleaseCheck } from "./schemas.js";
import { ReleaseCommandRunner } from "./service.js";

const workspaceRoot = new URL("../../../..", import.meta.url);

describe("release readiness live layer", () => {
  it.effect(
    "retains complete sanitized process streams with bounded excerpts",
    () =>
      Effect.gen(function* testLiveReleaseOutputBoundary() {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const repositoryRoot = yield* path.fromFileUrl(workspaceRoot);
        const runner = yield* ReleaseCommandRunner;
        const separator = String.fromCodePoint(47);
        const macHome = ["", "Users", "example", "mac-project"].join(separator);
        const linuxHome = ["", "home", "alice", "linux-project"].join(
          separator
        );
        const windowsSeparator = String.fromCodePoint(92);
        const windowsHome = ["C:", "Users", "alice", "windows-project"].join(
          windowsSeparator
        );
        const uncHome = [
          "",
          "",
          "server",
          "Users",
          "alice",
          "unc-project",
        ].join(windowsSeparator);
        const fileUrlMacHome = `file:${separator}${separator}${macHome}`;
        const fileUrlLinuxHome = `file:${separator}${separator}${linuxHome}`;
        const diagnosticMacHome = `path:${macHome}`;
        const diagnosticLinuxHome = `path:${linuxHome}`;
        const diagnosticWindowsHome = `path:${windowsHome}`;
        const diagnosticUncHome = `path:${uncHome}`;
        const stdoutFixture = `safe token = visible-secret ${macHome} ${linuxHome} ${windowsHome} ${uncHome} ${fileUrlMacHome} ${fileUrlLinuxHome} ${diagnosticMacHome} ${diagnosticLinuxHome} ${diagnosticWindowsHome} ${diagnosticUncHome}\n`;
        const outcome = yield* runner.execute(
          new ReleaseCheck({
            args: [
              "-e",
              `process.stdout.write(${JSON.stringify(stdoutFixture)}); process.stderr.write("Authorization: Bearer bearer-secret\\n")`,
            ],
            command: "bun",
            cwd: repositoryRoot,
            id: "verification",
            label: "Live process boundary fixture",
          })
        );

        expect(outcome.terminalState).toBe("success");
        expect(outcome.stdoutExcerpt.length).toBeLessThanOrEqual(1024);
        expect(outcome.stderrExcerpt.length).toBeLessThanOrEqual(1024);
        expect(outcome.stdoutDetail).not.toBeNull();
        expect(outcome.stderrDetail).not.toBeNull();

        if (outcome.stdoutDetail !== null && outcome.stderrDetail !== null) {
          const stdout = yield* fileSystem.readFileString(
            path.join(repositoryRoot, outcome.stdoutDetail.path)
          );
          const stderr = yield* fileSystem.readFileString(
            path.join(repositoryRoot, outcome.stderrDetail.path)
          );

          expect(stdout).toContain("safe token = <redacted>");
          expect(stdout).toContain("<home>/mac-project");
          expect(stdout).toContain("<home>/linux-project");
          expect(stdout).toContain(
            ["<home>", "windows-project"].join(windowsSeparator)
          );
          expect(stdout).toContain(
            ["<home>", "unc-project"].join(windowsSeparator)
          );
          expect(stdout).not.toContain("visible-secret");
          for (const sensitivePath of [
            macHome,
            linuxHome,
            windowsHome,
            uncHome,
            fileUrlMacHome,
            fileUrlLinuxHome,
            diagnosticMacHome,
            diagnosticLinuxHome,
            diagnosticWindowsHome,
            diagnosticUncHome,
          ]) {
            expect(stdout).not.toContain(sensitivePath);
            expect(outcome.stdoutExcerpt).not.toContain(sensitivePath);
            const user = sensitivePath.includes("example")
              ? "example"
              : "alice";
            const rawHomePrefix = sensitivePath.slice(
              0,
              sensitivePath.indexOf(user) + user.length
            );
            expect(stdout).not.toContain(rawHomePrefix);
            expect(outcome.stdoutExcerpt).not.toContain(rawHomePrefix);
          }
          expect(stderr).toContain("Authorization: <redacted>");
          expect(stderr).not.toContain("bearer-secret");
        }
      }).pipe(
        Effect.provide(Layer.merge(ReleaseCommandRunnerLive, BunServices.layer))
      )
  );
});
