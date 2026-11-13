import { BunServices } from "@effect/platform-bun";
import { describe, expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Effect,
  FileSystem,
  Option,
  Order,
  Path,
  Record,
  Schema,
  Stream,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { workspaceContracts } from "../oxlint/workspaces.boundary.js";

// The SDK assembler derives its private source owners from the SDK's own
// workspace imports and their runtime workspace dependencies. Its compiler
// program must emit exactly those owners' sources, so a new rule pack or
// package dependency cannot be bundled without being compiled.
const sdk = "packages/sdk/typescript";
const ShownConfig = Schema.Struct({ files: Schema.Array(Schema.String) });
const SdkManifest = Schema.Struct({
  devDependencies: Schema.Record(Schema.String, Schema.String),
});
const workspaceImport = /from "(?<name>@taxkit\/[a-z0-9-]+)/gu;
const owner = (name: string) =>
  EffectFunction.pipe(
    workspaceContracts,
    Array.findFirst((workspace) => workspace.manifest.name === name),
    Option.getOrElse(() => expect.fail(`No workspace named ${name}`))
  );

describe("SDK bundled sources", () => {
  it.effect(
    "compiles every bundled workspace source owner and nothing else",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
        const sources = yield* fs.readDirectory(`${sdk}/src`, {
          recursive: true,
        });
        const imported = yield* Effect.forEach(
          EffectFunction.pipe(
            sources,
            Array.filter((file) => file.endsWith(".ts"))
          ),
          (file) =>
            fs.readFileString(`${sdk}/src/${file}`).pipe(
              Effect.map((source) =>
                EffectFunction.pipe(
                  Array.fromIterable(source.matchAll(workspaceImport)),
                  Array.flatMap((match) =>
                    Option.fromNullishOr(match.groups).pipe(
                      Option.flatMap(Record.get("name")),
                      Option.toArray
                    )
                  )
                )
              )
            )
        ).pipe(Effect.map(Array.flatten));
        const bundled = Array.unfold(
          { found: Array.empty<string>(), pending: imported },
          ({ found, pending }) =>
            Array.match(pending, {
              onEmpty: () => Option.none(),
              onNonEmpty: ([name, ...rest]) =>
                Option.some([
                  name,
                  {
                    found: Array.append(found, name),
                    pending: EffectFunction.pipe(
                      owner(name).manifest.dependencies,
                      Record.keys,
                      Array.filter(
                        (dependency) =>
                          dependency.startsWith("@taxkit/") &&
                          !Array.contains(found, dependency)
                      ),
                      (dependencies) => Array.appendAll(rest, dependencies)
                    ),
                  },
                ] as const),
            })
        );
        const owners = EffectFunction.pipe(
          bundled,
          Array.dedupe,
          Array.map((name) => owner(name).owner),
          Array.sort(Order.String)
        );
        // The manifest declares each owner the SDK imports directly, so its
        // workspace link and the dependency fences admit it.
        const manifest = yield* fs
          .readFileString(`${sdk}/package.json`)
          .pipe(
            Effect.flatMap(
              Schema.decodeEffect(Schema.fromJsonString(SdkManifest))
            )
          );
        EffectFunction.pipe(
          imported,
          Array.dedupe,
          Array.filter(
            (name) =>
              !EffectFunction.pipe(
                manifest.devDependencies,
                Record.get(name),
                Option.exists((version) => version.startsWith("workspace:"))
              )
          ),
          (undeclared) => {
            expect(undeclared).toStrictEqual([]);
          }
        );
        const child = yield* spawner.spawn(
          ChildProcess.make(
            path.resolve("node_modules/.bin/tsc"),
            ["-p", "tsconfig.build.json", "--showConfig"],
            { cwd: sdk, stderr: "pipe", stdout: "pipe" }
          )
        );
        const [, shown] = yield* Effect.all(
          [
            child.exitCode,
            Stream.mkString(Stream.decodeText(child.stdout)),
            Stream.runDrain(child.stderr),
          ],
          { concurrency: "unbounded" }
        );
        const config = yield* Schema.decodeEffect(
          Schema.fromJsonString(ShownConfig)
        )(shown);
        const compiledOwners = EffectFunction.pipe(
          config.files,
          Array.map((file) => path.relative(".", path.resolve(sdk, file))),
          Array.filter(
            (file) => !file.startsWith(`${sdk}/`) && file.includes("/src/")
          ),
          Array.map((file) => file.replace(/\/src\/.*$/u, "")),
          Array.dedupe,
          Array.sort(Order.String)
        );
        expect(compiledOwners).toStrictEqual(owners);
      }).pipe(Effect.provide(BunServices.layer)),
    60_000
  );
});
