// Synchronous Oxlint configuration ingress. Every invocation reads checked
// manifests; application runtimes never import this configuration host.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  Function as EffectFunction,
  Array,
  Option,
  Predicate,
  Record,
  Result,
  Schema,
  Boolean as EffectBoolean,
} from "effect";

type ExportTarget =
  | string
  | null
  | readonly ExportTarget[]
  | {
      readonly [condition: string]: ExportTarget;
    };
const ExportTarget: Schema.Codec<ExportTarget> = Schema.suspend(() =>
  Schema.Union([
    Schema.String,
    Schema.Null,
    Schema.Array(ExportTarget),
    Schema.Record(Schema.String, ExportTarget),
  ])
);
const Dependencies = Schema.Record(Schema.String, Schema.String);
export const WorkspaceManifest = Schema.Struct({
  dependencies: Schema.optionalKey(Dependencies),
  devDependencies: Schema.optionalKey(Dependencies),
  exports: Schema.optionalKey(ExportTarget),
  name: Schema.String,
  optionalDependencies: Schema.optionalKey(Dependencies),
  peerDependencies: Schema.optionalKey(Dependencies),
});
const RootManifest = Schema.Struct({
  ...WorkspaceManifest.fields,
  workspaces: Schema.Struct({
    packages: Schema.Array(Schema.String.check(Schema.isPattern(/\/\*$/u))),
  }),
});
const root = fileURLToPath(new URL("../../", import.meta.url));
const conditions = ["import", "node", "default"];
const isExportArray = Schema.is(Schema.Array(ExportTarget));
// Preserve insertion order and selected conditional null fences. Null array
// alternatives can fall through, matching native package export resolution.
const selectedTarget = (target: ExportTarget): boolean | undefined => {
  if (Predicate.isString(target)) {
    return true;
  }
  if (Predicate.isNull(target)) {
    return false;
  }
  if (isExportArray(target)) {
    const selected = EffectFunction.pipe(target, Array.map(selectedTarget));
    if (Array.contains(selected, true)) {
      return true;
    }
    if (target.length === 0 || Array.contains(selected, false)) {
      return false;
    }
    return undefined;
  }
  return EffectFunction.pipe(
    EffectFunction.pipe(
      EffectFunction.pipe(
        Record.toEntries(target),
        Array.filter(([condition]) => Array.contains(conditions, condition))
      ),
      Array.map(([, value]) => selectedTarget(value))
    ),
    Array.findFirst((value): value is boolean => !Predicate.isUndefined(value))
  ).pipe(Option.getOrUndefined);
};
const publicExports = (
  target: ExportTarget | undefined
): Readonly<Record<string, boolean>> => {
  if (Predicate.isUndefined(target)) {
    return {};
  }
  if (
    Predicate.isNull(target) ||
    Predicate.isString(target) ||
    isExportArray(target)
  ) {
    return { ".": selectedTarget(target) === true };
  }
  const entries = Record.toEntries(target);
  return EffectBoolean.match(
    EffectFunction.pipe(
      entries,
      Array.some(([key]) => key.startsWith("."))
    ),
    {
      onFalse: () => ({ ".": selectedTarget(target) === true }),
      onTrue: () =>
        Record.fromEntries(
          EffectFunction.pipe(
            entries,
            Array.map(([key, value]) => [key, selectedTarget(value) === true])
          )
        ),
    }
  );
};
export const dependencyNames = (manifest: typeof WorkspaceManifest.Type) =>
  Array.dedupe([
    ...Record.keys(manifest.dependencies ?? {}),
    ...Record.keys(manifest.devDependencies ?? {}),
    ...Record.keys(manifest.optionalDependencies ?? {}),
    ...Record.keys(manifest.peerDependencies ?? {}),
  ]);
const rootManifest = Schema.decodeUnknownResult(
  Schema.fromJsonString(RootManifest)
)(readFileSync(`${root}/package.json`, "utf-8")).pipe(Result.getOrThrow);
export const workspaceContracts = EffectFunction.pipe(
  rootManifest.workspaces.packages,
  Array.flatMap((pattern) => {
    const parent = pattern.slice(0, -2);
    return EffectFunction.pipe(
      readdirSync(`${root}/${parent}`, { withFileTypes: true }),
      Array.flatMap((entry) => {
        const owner = `${parent}/${entry.name}`;
        const file = `${root}/${owner}/package.json`;
        if (!entry.isDirectory() || !existsSync(file)) {
          return [];
        }
        const manifest = Schema.decodeUnknownResult(
          Schema.fromJsonString(WorkspaceManifest)
        )(readFileSync(file, "utf-8")).pipe(Result.getOrThrow);
        return [{ manifest, owner }];
      })
    );
  })
);
export const workspaceBoundaryOptions = {
  aliases: [{ prefix: "#/", root: "apps/web/src" }],
  exceptions: [],
  forbiddenEdges: EffectFunction.pipe(
    [{ manifest: rootManifest, owner: "root" }, ...workspaceContracts],
    Array.flatMap((source) =>
      EffectFunction.pipe(
        workspaceContracts,
        Array.flatMap((target) =>
          EffectBoolean.match(
            source.owner !== target.owner &&
              (!Array.contains(
                dependencyNames(source.manifest),
                target.manifest.name
              ) ||
                (source.owner !== "root" && target.owner.startsWith("apps/"))),
            {
              onFalse: () => [],
              onTrue: () => [{ from: source.owner, to: target.owner }],
            }
          )
        )
      )
    )
  ),
  owners: [
    { id: "root", root: "." },
    ...EffectFunction.pipe(
      workspaceContracts,
      Array.map(({ owner }) => ({
        id: owner,
        root: owner,
      }))
    ),
  ],
  workspacePrefixes: ["@taxkit/", "api", "web"],
  workspaces: EffectFunction.pipe(
    workspaceContracts,
    Array.map(({ manifest, owner }) => ({
      exports: publicExports(manifest.exports),
      name: manifest.name,
      owner,
    }))
  ),
};
