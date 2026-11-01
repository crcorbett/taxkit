import * as BunServices from "@effect/platform-bun/BunServices";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Path } from "effect";
import * as ChildProcess from "effect/process/ChildProcess";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

describe("Pierre acquisition", () => {
  it.effect(
    "reports unavailable WASM through the typed initialization channel",
    () =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
        const loader = yield* path.fromFileUrl(
          new URL(
            "../../../node_modules/alchemy/bin/register-oxc.js",
            import.meta.url
          )
        );
        const fixture = yield* path.fromFileUrl(
          new URL("fixtures/highlights-unavailable.runtime.ts", import.meta.url)
        );
        const output = yield* spawner.string(
          ChildProcess.make("node", ["--jitless", "--import", loader, fixture])
        );
        assert.strictEqual(output.trim(), "initialization-error");
      }).pipe(Effect.provide(BunServices.layer))
  );
});
