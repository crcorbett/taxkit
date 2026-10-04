import nodePath from "node:path";

import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import { Effect, Exit, FileSystem } from "effect";

import { writeLintFixture } from "./cli-fixture.js";

it.effect.each([
  { failed: false, name: "success", outcome: Effect.void },
  {
    failed: true,
    name: "failure",
    outcome: Effect.fail("fixture consumer failed"),
  },
  { failed: true, name: "interruption", outcome: Effect.interrupt },
])("removes admitted lint fixtures after $name", ({ outcome, failed }) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const directory = yield* fs.makeTempDirectoryScoped();
    const path = nodePath.join(directory, "fixture.ts");
    const exit = yield* Effect.scoped(
      Effect.gen(function* () {
        yield* writeLintFixture(path, "export const value = 1;");
        expect(yield* fs.exists(path)).toBe(true);
        yield* outcome;
      })
    ).pipe(Effect.exit);
    expect(Exit.isFailure(exit)).toBe(failed);
    expect(yield* fs.exists(path)).toBe(false);
  }).pipe(Effect.provide(BunServices.layer))
);
