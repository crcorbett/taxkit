// Synchronous Oxlint configuration ingress. Every invocation reads checked
// manifests; application runtimes never import this configuration host.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Array, Option, Predicate, Record, Schema } from "effect";

type ExportTarget =
  | string
  | null
  | readonly ExportTarget[]
  | { readonly [condition: string]: ExportTarget };
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
  if (target === null) {
    return false;
  }
  if (isExportArray(target)) {
    const selected = Array.map(target, selectedTarget);
    if (Array.contains(selected, true)) {
      return true;
    }
    if (target.length === 0 || Array.contains(selected, false)) {
      return false;
    }
    return undefined;
  }
  return Array.findFirst(
    Array.map(
      Array.filter(Record.toEntries(target), ([condition]) =>
        Array.contains(conditions, condition)
      ),
      ([, value]) => selectedTarget(value)
    ),
    (value): value is boolean => value !== undefined
  ).pipe(Option.getOrUndefined);
};
const publicExports = (
  target: ExportTarget | undefined
): Readonly<Record<string, boolean>> => {
  if (target === undefined) {
    return {};
  }
  if (target === null || Predicate.isString(target) || isExportArray(target)) {
    return { ".": selectedTarget(target) === true };
  }
  const entries = Record.toEntries(target);
  return Array.some(entries, ([key]) => key.startsWith("."))
    ? Record.fromEntries(
        Array.map(entries, ([key, value]) => [
          key,
          selectedTarget(value) === true,
        ])
      )
    : { ".": selectedTarget(target) === true };
};
export const dependencyNames = (manifest: typeof WorkspaceManifest.Type) =>
  Array.dedupe([
    ...Record.keys(manifest.dependencies ?? {}),
    ...Record.keys(manifest.devDependencies ?? {}),
    ...Record.keys(manifest.optionalDependencies ?? {}),
    ...Record.keys(manifest.peerDependencies ?? {}),
  ]);
const rootManifest = Schema.decodeSync(Schema.fromJsonString(RootManifest))(
  readFileSync(`${root}/package.json`, "utf-8")
);
export const workspaceContracts = Array.flatMap(
  rootManifest.workspaces.packages,
  (pattern) => {
    const parent = pattern.slice(0, -2);
    return Array.flatMap(
      readdirSync(`${root}/${parent}`, { withFileTypes: true }),
      (entry) => {
        const owner = `${parent}/${entry.name}`;
        const file = `${root}/${owner}/package.json`;
        if (!entry.isDirectory() || !existsSync(file)) {
          return [];
        }
        const manifest = Schema.decodeSync(
          Schema.fromJsonString(WorkspaceManifest)
        )(readFileSync(file, "utf-8"));
        return [{ manifest, owner }];
      }
    );
  }
);
export const workspaceBoundaryOptions = {
  aliases: [{ prefix: "#/", root: "apps/web/src" }],
  exceptions: [],
  forbiddenEdges: Array.flatMap(
    [{ manifest: rootManifest, owner: "root" }, ...workspaceContracts],
    (source) =>
      Array.flatMap(workspaceContracts, (target) =>
        source.owner !== target.owner &&
        (!Array.contains(
          dependencyNames(source.manifest),
          target.manifest.name
        ) ||
          (source.owner !== "root" && target.owner.startsWith("apps/")))
          ? [{ from: source.owner, to: target.owner }]
          : []
      )
  ),
  owners: [
    { id: "root", root: "." },
    ...Array.map(workspaceContracts, ({ owner }) => ({
      id: owner,
      root: owner,
    })),
  ],
  workspacePrefixes: ["@taxkit/", "api", "web"],
  workspaces: Array.map(workspaceContracts, ({ manifest, owner }) => ({
    exports: publicExports(manifest.exports),
    name: manifest.name,
    owner,
  })),
};
