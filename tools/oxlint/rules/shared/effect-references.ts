import {
  Function as EffectFunction,
  Array as EffectArray,
  HashMap,
  HashSet,
  Option,
} from "effect";

import type { ImportSemantic } from "../../host.types.js";

export const effectImportSemantic: ImportSemantic = (
  source,
  kind,
  imported
) => {
  if (source === "effect") {
    if (kind === "ImportNamespaceSpecifier") {
      return Option.some("effect");
    }
    if (kind === "ImportSpecifier") {
      return imported.pipe(
        Option.filter((name) =>
          HashSet.has(
            HashSet.fromIterable([
              "Data",
              "Effect",
              "ManagedRuntime",
              "Schema",
            ]),
            name
          )
        )
      );
    }
  }
  return HashMap.get(
    HashMap.make(
      ["effect/Data", "Data"],
      ["effect/Effect", "Effect"],
      ["effect/ManagedRuntime", "ManagedRuntime"],
      ["effect/Schema", "Schema"]
    ),
    source
  ).pipe(
    Option.map((module) => {
      if (kind === "ImportSpecifier" && Option.isSome(imported)) {
        return `${module}.${imported.value}`;
      }
      return module;
    })
  );
};
const platformBunImportSemantic: ImportSemantic = (source, kind, imported) => {
  if (source === "@effect/platform-bun") {
    if (kind === "ImportNamespaceSpecifier") {
      return Option.some("platform-bun");
    }
    if (kind === "ImportSpecifier") {
      return imported.pipe(Option.filter((name) => name === "BunRuntime"));
    }
  }
  if (source === "@effect/platform-bun/BunRuntime") {
    if (kind === "ImportSpecifier" && Option.isSome(imported)) {
      return Option.some(`BunRuntime.${imported.value}`);
    }
    return Option.some("BunRuntime");
  }
  return Option.none();
};
const platformNodeImportSemantic: ImportSemantic = (source, kind, imported) => {
  if (source === "@effect/platform-node") {
    if (kind === "ImportNamespaceSpecifier") {
      return Option.some("platform-node");
    }
    if (kind === "ImportSpecifier") {
      return imported.pipe(Option.filter((name) => name === "NodeRuntime"));
    }
  }
  if (source === "@effect/platform-node/NodeRuntime") {
    if (kind === "ImportSpecifier" && Option.isSome(imported)) {
      return Option.some(`NodeRuntime.${imported.value}`);
    }
    return Option.some("NodeRuntime");
  }
  return Option.none();
};
export const portableImportSemantic: ImportSemantic = (
  source,
  kind,
  imported
) =>
  effectImportSemantic(source, kind, imported).pipe(
    Option.orElse(() => platformBunImportSemantic(source, kind, imported)),
    Option.orElse(() => platformNodeImportSemantic(source, kind, imported))
  );
const runtimeMethods = HashSet.fromIterable([
  "runCallback",
  "runCallbackWith",
  "runFork",
  "runForkWith",
  "runPromise",
  "runPromiseExit",
  "runPromiseExitWith",
  "runPromiseWith",
  "runSync",
  "runSyncExit",
  "runSyncExitWith",
  "runSyncWith",
]);
export const runtimeExecutionSemantics = HashSet.fromIterable([
  ...EffectFunction.pipe(
    [...runtimeMethods],
    EffectArray.map((method) => `Effect.${method}`)
  ),
  ...EffectFunction.pipe(
    [...runtimeMethods],
    EffectArray.map((method) => `effect.Effect.${method}`)
  ),
  "BunRuntime.runMain",
  "NodeRuntime.runMain",
  "ManagedRuntime.make",
  "effect.ManagedRuntime.make",
  "platform-bun.BunRuntime.runMain",
  "platform-node.NodeRuntime.runMain",
]);
