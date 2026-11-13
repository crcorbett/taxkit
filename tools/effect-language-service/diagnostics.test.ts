import { BunServices } from "@effect/platform-bun";
import { describe, expect, it } from "@effect/vitest";
import { Effect, FileSystem, Path, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

// Every workspace `check-types` runs this patched compiler with the shared
// base configuration. Its exit status must fail on an Effect diagnostic of
// error severity, and stay clean for the equivalent valid program.
const compilerTimeout = 60_000;
const tsconfig = `{
  "extends": "../../../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true, "declaration": false, "declarationMap": false, "types": [] },
  "include": ["program.ts"]
}
`;
const floating = `import { Effect } from "effect";

export const program = Effect.gen(function* () {
  Effect.log("never run");
  yield* Effect.void;
});
`;
const yielded = `import { Effect } from "effect";

export const program = Effect.gen(function* () {
  yield* Effect.log("run");
  yield* Effect.void;
});
`;
const compile = Effect.fnUntraced(function* ({
  program,
}: {
  readonly program: string;
}) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  // Ignored scratch space inside the repository, so the fixture resolves the
  // installed `effect` package and the shared compiler plugin.
  const parent = path.resolve("tools/effect-language-service/tmp");
  yield* fs.makeDirectory(parent, { recursive: true });
  const directory = yield* fs.makeTempDirectoryScoped({
    directory: parent,
    prefix: "diagnostics-",
  });
  yield* fs.writeFileString(path.join(directory, "tsconfig.json"), tsconfig);
  yield* fs.writeFileString(path.join(directory, "program.ts"), program);
  const child = yield* spawner.spawn(
    ChildProcess.make(
      path.resolve("node_modules/.bin/tsc"),
      ["--noEmit", "-p", path.join(directory, "tsconfig.json")],
      { stderr: "pipe", stdout: "pipe" }
    )
  );
  const [exitCode, output] = yield* Effect.all(
    [
      child.exitCode,
      Stream.mkString(Stream.decodeText(child.stdout)),
      Stream.runDrain(child.stderr),
    ],
    { concurrency: "unbounded" }
  );
  return { exitCode, output };
});

describe("Effect diagnostics in check-types", () => {
  it.effect(
    "fails the compiler on a floating Effect",
    () =>
      Effect.gen(function* () {
        const result = yield* compile({ program: floating });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain("effect(floatingEffect)");
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer)),
    compilerTimeout
  );
  it.effect(
    "accepts the same program when the Effect is yielded",
    () =>
      Effect.gen(function* () {
        const result = yield* compile({ program: yielded });
        expect(result.output).toBe("");
        expect(result.exitCode).toBe(0);
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer)),
    compilerTimeout
  );
});
