import * as BunServices from "@effect/platform-bun/BunServices";
import { assert, describe, it } from "@effect/vitest";
import {
  Array,
  Effect,
  FileSystem,
  Option,
  pipe,
  Record,
  Schema,
} from "effect";

const Dependencies = Schema.Record(Schema.String, Schema.String);
const Manifest = Schema.Struct({
  dependencies: Schema.OptionFromOptionalKey(Dependencies),
  devDependencies: Schema.OptionFromOptionalKey(Dependencies),
  name: Schema.String,
});
const RootManifest = Schema.Struct({
  workspaces: Schema.Struct({
    packages: Schema.Array(Schema.String.check(Schema.isPattern(/\/\*$/u))),
  }),
});
const dependencyNames = (manifest: typeof Manifest.Type) =>
  Array.dedupe([
    ...Record.keys(Option.getOrElse(manifest.dependencies, () => ({}))),
    ...Record.keys(Option.getOrElse(manifest.devDependencies, () => ({}))),
  ]);

const appEdges = (
  manifests: readonly {
    readonly path: string;
    readonly manifest: typeof Manifest.Type;
  }[]
) => {
  const apps = pipe(
    manifests,
    Array.filter(({ path }) => path.startsWith("apps/")),
    Array.map(({ manifest }) => manifest.name)
  );
  return Array.flatMap(manifests, ({ manifest }) =>
    pipe(
      dependencyNames(manifest),
      Array.filter((name) => Array.contains(apps, name)),
      Array.map((name) => `${manifest.name} -> ${name}`)
    )
  );
};

const manifestFixture = (
  name: string,
  dependencies: Readonly<Record<string, string>>
) => ({
  dependencies: Option.some(dependencies),
  devDependencies: Option.none(),
  name,
});

describe("workspace dependency direction", () => {
  it.effect(
    "keeps app composition at the root and runtime support provider-free",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const root = yield* fs
          .readFileString("package.json")
          .pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(Schema.fromJsonString(RootManifest))
            )
          );
        const paths = yield* Effect.forEach(
          root.workspaces.packages,
          (pattern) => {
            const parent = pattern.slice(0, -2);
            return fs
              .readDirectory(parent)
              .pipe(
                Effect.map(Array.map((name) => `${parent}/${name}`)),
                Effect.flatMap(
                  Effect.filter((path) => fs.exists(`${path}/package.json`))
                )
              );
          }
        );
        const manifests = yield* Effect.forEach(Array.flatten(paths), (path) =>
          fs.readFileString(`${path}/package.json`).pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(Schema.fromJsonString(Manifest))
            ),
            Effect.map((manifest) => ({ manifest, path }))
          )
        );
        assert.deepEqual(appEdges(manifests), []);
        yield* Effect.forEach(
          ["@taxkit/observability", "@taxkit/analytics"],
          (name) =>
            Effect.gen(function* () {
              const runtime = yield* Effect.fromOption(
                Array.findFirst(
                  manifests,
                  ({ manifest }) => manifest.name === name
                )
              );
              assert.deepEqual(
                pipe(
                  dependencyNames(runtime.manifest),
                  Array.filter(
                    (dependency) =>
                      dependency === "alchemy" ||
                      dependency === "@taxkit/infrastructure" ||
                      dependency.startsWith("@distilled.cloud/")
                  )
                ),
                []
              );
            })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  it("rejects the former app-to-app and package-to-app dependencies", () => {
    assert.deepEqual(
      appEdges([
        { manifest: manifestFixture("api", {}), path: "apps/api" },
        {
          manifest: manifestFixture("web", { api: "workspace:*" }),
          path: "apps/web",
        },
        {
          manifest: manifestFixture("@taxkit/infrastructure", {
            api: "workspace:*",
          }),
          path: "packages/infrastructure",
        },
      ]),
      ["web -> api", "@taxkit/infrastructure -> api"]
    );
  });
});
