import * as BunServices from "@effect/platform-bun/BunServices";
import { assert, describe, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Effect,
  FileSystem,
  Predicate,
  Record,
  Schema,
} from "effect";

import {
  isForbiddenPackageDependency,
  isFrontendModule,
} from "../oxlint/package-roles.js";
import {
  dependencyNames,
  ExportTarget,
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
  const apps = EffectFunction.pipe(
    manifests,
    Array.filter(({ path }) => path.startsWith("apps/")),
    Array.map(({ manifest }) => manifest.name)
  );
  return EffectFunction.pipe(
    manifests,
    Array.flatMap(({ manifest }) =>
      EffectFunction.pipe(
        dependencyNames(manifest),
        Array.filter((name) => Array.contains(apps, name)),
        Array.map((name) => `${manifest.name} -> ${name}`)
      )
    )
  );
};
// Folders under a workspace glob that only group nested workspaces. Every
// other folder a workspace glob matches must be a workspace with a manifest.
const groupingFolders = ["packages/api", "packages/rules", "packages/sdk"];
const isExportArray = Schema.is(Schema.Array(ExportTarget));
// Every file path a package export map can select, across all conditions.
const exportPaths = (
  target: typeof ExportTarget.Type | undefined
): readonly string[] => {
  if (Predicate.isString(target)) {
    return [target];
  }
  if (Predicate.isNullish(target)) {
    return [];
  }
  if (isExportArray(target)) {
    return EffectFunction.pipe(target, Array.flatMap(exportPaths));
  }
  return EffectFunction.pipe(Record.values(target), Array.flatMap(exportPaths));
};
const testExportTargets = (target: typeof ExportTarget.Type | undefined) =>
  EffectFunction.pipe(
    exportPaths(target),
    Array.filter((path) => /(?:^|\/)test\//u.test(path))
  );
const manifestFixture = (
  name: string,
  dependencies: Readonly<Record<string, string>>
) => ({
  dependencies,
  devDependencies: {},
  name,
  optionalDependencies: {},
  peerDependencies: {},
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
        const folders = yield* EffectFunction.pipe(
          root.workspaces.packages,
          Effect.forEach((pattern) => {
            const parent = pattern.slice(0, -2);
            return fs
              .readDirectory(parent)
              .pipe(
                Effect.map(Array.map((name) => `${parent}/${name}`)),
                Effect.flatMap(
                  Effect.filter((path) =>
                    fs
                      .stat(path)
                      .pipe(Effect.map((info) => info.type === "Directory"))
                  )
                ),
                Effect.flatMap(
                  Effect.forEach((path) =>
                    fs
                      .exists(`${path}/package.json`)
                      .pipe(Effect.map((manifest) => ({ manifest, path })))
                  )
                )
              );
          }),
          Effect.map(Array.flatten)
        );
        // A folder without a manifest is either a named grouping folder or a
        // leftover workspace; grouping folders never carry their own manifest.
        assert.deepEqual(
          EffectFunction.pipe(
            folders,
            Array.filter(
              ({ manifest, path }) =>
                manifest === Array.contains(groupingFolders, path)
            ),
            Array.map(({ path }) => path)
          ),
          []
        );
        const manifests = yield* EffectFunction.pipe(
          folders,
          Array.filter(({ manifest }) => manifest),
          Effect.forEach(({ path }) =>
            fs.readFileString(`${path}/package.json`).pipe(
              Effect.flatMap(
                Schema.decodeUnknownEffect(Schema.fromJsonString(Manifest))
              ),
              Effect.map((manifest) => ({ manifest, path }))
            )
          )
        );
        assert.deepEqual(appEdges(manifests), []);
        assert.deepEqual(
          EffectFunction.pipe(
            manifests,
            Array.flatMap(({ manifest }) =>
              EffectFunction.pipe(
                testExportTargets(manifest.exports),
                Array.map((target) => `${manifest.name} -> ${target}`)
              )
            )
          ),
          []
        );
        assert.deepEqual(
          EffectFunction.pipe(
            manifests,
            Array.flatMap(({ manifest, path }) =>
              EffectFunction.pipe(
                dependencyNames(manifest),
                Array.filter((dependency) =>
                  isForbiddenPackageDependency(path, dependency)
                ),
                Array.map((dependency) => `${manifest.name} -> ${dependency}`)
              )
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
      EffectFunction.pipe(
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
          ["packages/api/http", "taxkit"],
          ["packages/api/http", "taxkit/http"],
          ["packages/api/http", "@taxkit/sdk"],
          ["packages/sdk/typescript", "@taxkit/api-http"],
        ] as const,
        Array.map(([owner, dependency]) =>
          isForbiddenPackageDependency(owner, dependency)
        )
      ),
      [
        true,
        true,
        true,
        false,
        false,
        false,
        true,
        true,
        false,
        false,
        true,
        true,
        true,
        false,
      ]
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

  it("keeps MDX, its presenter and Pele independent of publication and host packages", () => {
    const cases = [
      ["packages/mdx", "@taxkit/mdx/schemas", false],
      ["packages/mdx", "effect", false],
      ["packages/mdx", "@pierre/highlights", false],
      ["packages/mdx", "@taxkit/content", true],
      ["packages/mdx", "@content/docs/navigation.json", true],
      ["packages/mdx", "@taxkit/mdx-react/body", true],
      ["packages/mdx", "@taxkit/pele/service", true],
      ["packages/mdx", "taxkit/au", true],
      ["packages/mdx", "api/worker", true],
      ["packages/mdx-react", "@taxkit/mdx", false],
      ["packages/mdx-react", "@taxkit/mdx/schemas", false],
      ["packages/mdx-react", "@taxkit/mdx-react/theme", false],
      ["packages/mdx-react", "react", false],
      ["packages/mdx-react", "@base-ui/react/scroll-area", false],
      ["packages/mdx-react", "@taxkit/mdx-extra/schemas", true],
      ["packages/mdx-react", "@taxkit/content/schemas", true],
      ["packages/mdx-react", "@taxkit/pele", true],
      ["packages/mdx-react", "@content/docs", true],
      ["packages/mdx-react", "@tanstack/react-router", true],
      ["packages/mdx-react", "@tanstack/router-core", true],
      ["packages/mdx-react", "next/link", true],
      ["packages/mdx-react", "react-router", true],
      ["packages/mdx-react", "react-router-dom", true],
      ["packages/mdx-react", "@remix-run/router", true],
      ["packages/mdx-react", "web/router", true],
      ["packages/mdx-react", "#/lib/docs/components", true],
      ["packages/pele", "pele", false],
      ["packages/pele", "@taxkit/pele/schemas", false],
      ["packages/pele", "@taxkit/mdx/schemas", true],
      ["packages/pele", "@taxkit/content", true],
      ["packages/diagrams", "@taxkit/mdx/service", false],
      ["packages/diagrams", "@taxkit/pele/service", false],
      ["packages/diagrams", "@taxkit/diagrams/pele", false],
      ["packages/diagrams", "@taxkit/content/schemas", true],
      ["packages/diagrams", "@taxkit/mdx-react/body", true],
      ["packages/content", "@taxkit/mdx/schemas", false],
      ["apps/web", "@tanstack/react-router", false],
    ] as const;
    assert.deepEqual(
      EffectFunction.pipe(
        cases,
        Array.filter(
          ([owner, dependency, forbidden]) =>
            isForbiddenPackageDependency(owner, dependency) !== forbidden
        )
      ),
      []
    );
  });

  it("applies presenter dependency policy to every manifest dependency class", () => {
    const manifest = {
      dependencies: {
        "@taxkit/content": "workspace:*",
        "@taxkit/mdx": "workspace:*",
      },
      devDependencies: { next: "1" },
      name: "@taxkit/mdx-react",
      optionalDependencies: { web: "workspace:*" },
      peerDependencies: { "@tanstack/react-router": "1", react: "1" },
    };
    assert.deepEqual(
      EffectFunction.pipe(
        dependencyNames(manifest),
        Array.filter((dependency) =>
          isForbiddenPackageDependency("packages/mdx-react", dependency)
        )
      ),
      ["@taxkit/content", "next", "web", "@tanstack/react-router"]
    );
  });

  it("grants only the exact browser-safe MDX presenter exports", () => {
    const file = "apps/web/src/lib/docs/reading-body.view.tsx";
    assert.deepEqual(
      EffectFunction.pipe(
        [
          "@taxkit/mdx-react/body",
          "@taxkit/mdx-react/code-block",
          "@taxkit/mdx-react/theme",
          "@taxkit/mdx-react/schemas",
          "@taxkit/mdx-react/styles.css",
        ],
        Array.map((address) => isFrontendModule(file, address, []))
      ),
      [true, true, true, true, true]
    );
    assert.deepEqual(
      EffectFunction.pipe(
        [
          "@taxkit/mdx-react",
          "@taxkit/mdx-react/live",
          "@taxkit/mdx-react/body/private",
          "@taxkit/mdx-react/styles.css?raw",
          "@taxkit/mdx/compiler",
          "@taxkit/mdx/highlights",
          "@taxkit/pele/live",
        ],
        Array.map((address) => isFrontendModule(file, address, []))
      ),
      [false, false, false, false, false, false, false]
    );
  });
});
