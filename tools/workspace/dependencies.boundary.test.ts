import * as BunServices from "@effect/platform-bun/BunServices";
import { assert, describe, it } from "@effect/vitest";
import { Array, Effect, FileSystem, pipe, Schema } from "effect";

import { isForbiddenPackageDependency } from "../oxlint/package-roles.js";
import {
  dependencyNames,
  WorkspaceManifest as Manifest,
} from "../oxlint/workspaces.boundary.js";

const RootManifest = Schema.Struct({
  workspaces: Schema.Struct({
    packages: Schema.Array(Schema.String.check(Schema.isPattern(/\/\*$/u))),
  }),
});

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
  dependencies,
  name,
});

describe("workspace dependency direction", () => {
  it.effect(
    "keeps every nondeployment package provider-free and app composition at the root",
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
        assert.deepEqual(
          Array.flatMap(manifests, ({ manifest, path }) =>
            Array.map(
              Array.filter(dependencyNames(manifest), (dependency) =>
                isForbiddenPackageDependency(path, dependency)
              ),
              (dependency) => `${manifest.name} -> ${dependency}`
            )
          ),
          []
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
  it("rejects app peers, provider dependencies and domain edges into runtime support", () => {
    assert.deepEqual(
      appEdges([
        { manifest: manifestFixture("api", {}), path: "apps/api" },
        {
          manifest: {
            ...manifestFixture("@taxkit/content", {}),
            peerDependencies: { api: "workspace:*" },
          },
          path: "packages/content",
        },
      ]),
      ["@taxkit/content -> api"]
    );
    assert.deepEqual(
      Array.map(
        [
          ["packages/api/mcp", "@distilled.cloud/cloudflare"],
          ["packages/aeo", "@taxkit/infrastructure"],
          ["packages/core", "alchemy"],
          ["apps/api", "alchemy"],
          ["apps/web", "alchemy"],
          ["packages/infrastructure", "@distilled.cloud/cloudflare"],
          ["packages/observability", "@taxkit/calculators"],
          ["packages/observability", "@taxkit/calculators/admission.schemas"],
          ["packages/observability", "effect"],
          ["packages/analytics", "@taxkit/observability"],
        ] as const,
        ([owner, dependency]) => isForbiddenPackageDependency(owner, dependency)
      ),
      [true, true, true, false, false, false, true, true, false, false]
    );
    assert.deepEqual(
      dependencyNames({
        dependencies: { a: "1" },
        devDependencies: { b: "1" },
        name: "@taxkit/fixture",
        optionalDependencies: { c: "1" },
        peerDependencies: { a: "1", d: "1" },
      }),
      ["a", "b", "c", "d"]
    );
  });
});
