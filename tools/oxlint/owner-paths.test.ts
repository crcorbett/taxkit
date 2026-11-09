import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Effect,
  FileSystem,
  Match,
  Option,
  Predicate,
  Record,
  Schema,
  Boolean as EffectBoolean,
} from "effect";

import configuration from "../../oxlint.config.ts";
import { frontendModuleGrants } from "./package-roles.ts";
import { ExportTarget, workspaceContracts } from "./workspaces.boundary.ts";

// Moving or deleting a file must move its lint/Knip permission in the same
// change; a stale exact path otherwise grants nothing and fails silently.
const ownedRoots = ["apps/", "content/", "packages/", "tools/"];
const isExactOwnedPath = (value: string) =>
  EffectFunction.pipe(
    ownedRoots,
    Array.some((root) => value.startsWith(root))
  ) &&
  !/[*?{}[\]]/u.test(value) &&
  // Actual-CLI tests write these fixtures and remove them afterwards.
  !value.includes("/.generated");
const isGlob = (value: string) => /[*?{}[\]]/u.test(value);
const isJsonArray = Schema.is(Schema.Array(Schema.Json));
const jsonStrings = (value: Schema.Json): readonly string[] => {
  if (Predicate.isString(value)) {
    return [value];
  }
  if (
    Predicate.isNull(value) ||
    Predicate.isNumber(value) ||
    Predicate.isBoolean(value)
  ) {
    return [];
  }
  if (isJsonArray(value)) {
    return EffectFunction.pipe(value, Array.flatMap(jsonStrings));
  }
  return EffectFunction.pipe(Record.values(value), Array.flatMap(jsonStrings));
};
const KnipWorkspace = Schema.Struct({
  entry: Schema.optionalKey(Schema.Array(Schema.String)),
  project: Schema.optionalKey(Schema.Array(Schema.String)),
});
const KnipConfiguration = Schema.Struct({
  ignore: Schema.optionalKey(Schema.Array(Schema.String)),
  ignoreIssues: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.Array(Schema.String))
  ),
  ignoreWorkspaces: Schema.optionalKey(Schema.Array(Schema.String)),
  workspaces: Schema.Record(Schema.String, KnipWorkspace),
});
const join = (workspace: string, path: string) =>
  EffectBoolean.match(workspace === ".", {
    onFalse: () => `${workspace}/${path}`,
    onTrue: () => path,
  });
// Knip production patterns end in `!`; a leading `!` negates the pattern.
const knipPattern = (pattern: string) =>
  pattern.replace(/^!/u, "").replace(/!$/u, "");
const missingPaths = Effect.fnUntraced(function* (paths: readonly string[]) {
  const fs = yield* FileSystem.FileSystem;
  return yield* EffectFunction.pipe(
    Array.dedupe(paths),
    Effect.filter((path) =>
      Effect.map(
        Effect.all([fs.exists(path), fs.exists(`${path}.txt`)]),
        ([exists, fixture]) =>
          !exists && !(path.startsWith("tools/oxlint/fixtures/") && fixture)
      )
    )
  );
});
const isExportArray = Schema.is(Schema.Array(ExportTarget));
const exportKeys = (target: typeof ExportTarget.Type | undefined) => {
  if (
    Predicate.isUndefined(target) ||
    Predicate.isNull(target) ||
    Predicate.isString(target) ||
    isExportArray(target)
  ) {
    return ["."];
  }
  const keys = Record.keys(target);
  return EffectBoolean.match(
    EffectFunction.pipe(
      keys,
      Array.some((key) => key.startsWith("."))
    ),
    { onFalse: () => ["."], onTrue: () => keys }
  );
};
const resolvesToExport = (specifier: string) =>
  EffectFunction.pipe(
    workspaceContracts,
    Array.some(({ manifest }) => {
      if (
        specifier !== manifest.name &&
        !specifier.startsWith(`${manifest.name}/`)
      ) {
        return false;
      }
      const subpath = `.${specifier.slice(manifest.name.length)}`;
      return EffectFunction.pipe(
        exportKeys(manifest.exports),
        Array.some((key) => {
          const [prefix = "", suffix] = key.split("*");
          return Option.match(Option.fromUndefinedOr(suffix), {
            onNone: () => key === subpath,
            onSome: (end) =>
              subpath.startsWith(prefix) && subpath.endsWith(end),
          });
        })
      );
    })
  );

describe("owner paths and grants", () => {
  it.effect("every exact lint path exists", () =>
    Effect.gen(function* () {
      const settings = yield* Schema.decodeUnknownEffect(Schema.Json)({
        overrides: configuration.overrides,
        rules: configuration.rules,
      });
      const plugins = EffectFunction.pipe(
        configuration.jsPlugins ?? [],
        Array.map((plugin) =>
          Match.value(plugin).pipe(
            Match.when(Predicate.isString, (specifier) => specifier),
            Match.orElse(({ specifier }) => specifier)
          )
        ),
        Array.map((specifier) => specifier.replace(/^\.\//u, ""))
      );
      const paths = EffectFunction.pipe(
        [...jsonStrings(settings), ...plugins],
        Array.filter(isExactOwnedPath)
      );
      expect(paths.length).toBeGreaterThan(100);
      expect(yield* missingPaths(paths)).toStrictEqual([]);
    }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect.each(["knip.json", "knip.production.json"])(
    "every exact %s path exists",
    (file) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const knip = yield* fs
          .readFileString(file)
          .pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.fromJsonString(KnipConfiguration)
              )
            )
          );
        const patterns = EffectFunction.pipe(
          Record.toEntries(knip.workspaces),
          Array.flatMap(([workspace, settings]) => [
            workspace,
            ...EffectFunction.pipe(
              [...(settings.entry ?? []), ...(settings.project ?? [])],
              Array.map(knipPattern),
              Array.filter((pattern) => !isGlob(pattern)),
              Array.map((pattern) => join(workspace, pattern))
            ),
          ])
        );
        const paths = EffectFunction.pipe(
          [
            ...patterns,
            ...(knip.ignore ?? []),
            ...Record.keys(knip.ignoreIssues ?? {}),
            ...(knip.ignoreWorkspaces ?? []),
          ],
          Array.filter((path) => path === "." || !isGlob(path))
        );
        expect(yield* missingPaths(paths)).toStrictEqual([]);
      }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect("every package import grant names a current package export", () =>
    Effect.gen(function* () {
      // Workspace names and prefixes describe the graph rather than grant an
      // import, so the manifest-derived workspace option is left out.
      const settings = yield* Schema.decodeUnknownEffect(Schema.Json)({
        overrides: configuration.overrides,
        rules: Record.remove(
          configuration.rules ?? {},
          "package/workspace-import-boundaries"
        ),
      });
      const grants = EffectFunction.pipe(
        [...jsonStrings(settings), ...frontendModuleGrants],
        Array.filter(
          (value) =>
            !isGlob(value) &&
            (value.startsWith("@taxkit/") ||
              value === "taxkit" ||
              value.startsWith("taxkit/"))
        ),
        Array.dedupe
      );
      const unresolved = EffectFunction.pipe(
        grants,
        Array.filter((grant) => !resolvesToExport(grant))
      );
      expect(grants.length).toBeGreaterThan(30);
      expect(unresolved).toStrictEqual([]);
    })
  );
});
