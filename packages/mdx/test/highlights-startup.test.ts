import * as BunServices from "@effect/platform-bun/BunServices";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Path } from "effect";
import * as ChildProcess from "effect/process/ChildProcess";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

describe("Pierre public entry", () => {
  it.effect.each([
    { name: "a supported host", flags: [], expectedCode: 0 },
    {
      name: "a host without WebAssembly",
      flags: ["--jitless"],
      expectedCode: 1,
    },
  ])(
    "reports the module startup outcome in $name",
    ({ flags, expectedCode }) =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
        const cwd = yield* path.fromFileUrl(new URL("../", import.meta.url));
        const exitCode = yield* spawner.exitCode(
          ChildProcess.make(
            "node",
            [
              ...flags,
              "--input-type=module",
              "--eval",
              'import "@pierre/highlights";',
            ],
            { cwd, stdout: "ignore", stderr: "ignore" }
          )
        );
        assert.strictEqual(exitCode, expectedCode);
      }).pipe(Effect.provide(BunServices.layer)),
    // Real process startup competes with the other workspace tests in CI.
    30_000
  );
});
