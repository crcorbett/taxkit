import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it as test } from "@effect/vitest";
import { Array, Effect, Schema } from "effect";

import { lintFiles, writeLintFixture } from "./cli-fixture.js";

const { join } = nodePath;
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

// Counts belong to the named policy. Unrelated style diagnostics do not prove
// a gap or a fix; only the complete persistent-state fixture requires exit 0.
test.effect.each([
  {
    count: 4,
    name: "rejects all four direct native collection constructors",
    rule: "taxkit(no-native-collections)",
    source: `export const collections = [new Map(), new Set(), new WeakMap(), new WeakSet()];`,
  },
  {
    count: 4,
    name: "follows native collection global and destructured aliases",
    rule: "taxkit(no-native-collections)",
    source: `const NativeMap = Map;
const NativeSet = globalThis.Set;
const { WeakMap: NativeWeakMap } = globalThis;
const { WeakSet: NativeWeakSet } = window;
export const collections = [new NativeMap(), new NativeSet(), new NativeWeakMap(), new NativeWeakSet()];`,
  },
  {
    count: 1,
    name: "follows a reassigned native constructor",
    rule: "taxkit(no-native-collections)",
    source: `let Constructor;
Constructor = WeakMap;
export const collection = new Constructor();`,
  },
  {
    count: 0,
    name: "keeps a same-named local constructor separate",
    rule: "taxkit(no-native-collections)",
    source: `export class WeakMap { readonly value = 1; }
export const collection = new WeakMap();`,
  },
  {
    count: 0,
    name: "clears a constructor alias replaced by a local class",
    rule: "taxkit(no-native-collections)",
    source: `class Local { readonly value = 1; }
let Constructor = WeakMap;
Constructor = Local;
export const collection = new Constructor();`,
  },
  {
    count: 8,
    name: "rejects all owned Object and Reflect write operations",
    rule: "taxkit(no-object-writes)",
    source: `const target = {};
Object.assign(target, { value: 1 });
Object.defineProperty(target, "value", { value: 1 });
Object.defineProperties(target, { value: { value: 1 } });
Object.setPrototypeOf(target, null);
Reflect.set(target, "value", 1);
Reflect.deleteProperty(target, "value");
Reflect.defineProperty(target, "value", { value: 1 });
Reflect.setPrototypeOf(target, null);`,
  },
  {
    count: 4,
    name: "follows destructured and global object-write aliases",
    rule: "taxkit(no-object-writes)",
    source: `const { assign: write } = Object;
const { set: setValue } = globalThis.Reflect;
write({}, { value: 1 });
setValue({}, "value", 1);`,
  },
  {
    count: 2,
    name: "follows an assigned object-write alias",
    rule: "taxkit(no-object-writes)",
    source: `let write;
write = Reflect.set;
write({}, "value", 1);`,
  },
  {
    count: 0,
    name: "keeps a same-named local Object separate",
    rule: "taxkit(no-object-writes)",
    source: `const Object = { assign: (value: number) => value };
export const result = Object.assign(1);`,
  },
  {
    count: 1,
    name: "retains the write capture after an alias is replaced",
    rule: "taxkit(no-object-writes)",
    source: `let write = Object.assign;
write = (value) => value;
export const result = write(1);`,
  },
  {
    count: 1,
    name: "rejects an Object writer passed directly as a callback",
    rule: "taxkit(no-object-writes)",
    source: `import { Array } from "effect";
export const values = Array.map([{}], Object.assign);`,
  },
  {
    count: 1,
    name: "rejects forwarding through an Object writer call method",
    rule: "taxkit(no-object-writes)",
    source: `export const result = Object.assign.call(null, {}, { value: 1 });`,
  },
  {
    count: 1,
    name: "rejects an exported unused destructured writer",
    rule: "taxkit(no-object-writes)",
    source: `export const { set: write } = Reflect;`,
  },
  {
    count: 1,
    name: "follows nested destructuring of a global writer",
    rule: "taxkit(no-object-writes)",
    source: `export const { Object: { assign: write } } = globalThis;`,
  },
  {
    count: 5,
    name: "rejects escaping root, managed, Bun and Node runner references",
    rule: "effect(no-runtime-references-outside-boundaries)",
    source: `import { Effect, ManagedRuntime } from "effect";
import * as Fx from "effect";
import { BunRuntime } from "@effect/platform-bun";
import { NodeRuntime } from "@effect/platform-node";
export const runners = [Effect.runSync, Fx.Effect.runPromise, ManagedRuntime.make, BunRuntime.runMain, NodeRuntime.runMain];`,
  },
  {
    count: 1,
    name: "rejects a named imported runner used as a callback",
    rule: "effect(no-runtime-references-outside-boundaries)",
    source: `import { runSync as execute, void as unit } from "effect/Effect";
export const result = unit.pipe(execute);`,
  },
  {
    count: 2,
    name: "rejects destructured capture and callback use separately",
    rule: "effect(no-runtime-references-outside-boundaries)",
    source: `import { Effect as Fx } from "effect";
const { runSync: execute } = Fx;
export const result = Fx.void.pipe(execute);`,
  },
  {
    count: 1,
    name: "rejects an exported unused destructured runner",
    rule: "effect(no-runtime-references-outside-boundaries)",
    source: `import { Effect } from "effect";
export const { runSync: execute } = Effect;`,
  },
  {
    count: 2,
    name: "rejects an assigned runner and its later callback use",
    rule: "effect(no-runtime-references-outside-boundaries)",
    source: `import { Effect } from "effect";
let execute;
execute = Effect.runSync;
export const result = Effect.void.pipe(execute);`,
  },
  {
    count: 1,
    name: "retains the capture failure after a runner alias is cleared",
    rule: "effect(no-runtime-references-outside-boundaries)",
    source: `import { Effect } from "effect";
let execute = Effect.runSync;
execute = (value) => value;
export const result = execute("local");`,
  },
  {
    count: 0,
    name: "keeps a same-named local Effect separate",
    rule: "effect(no-runtime-references-outside-boundaries)",
    source: `export const local = (Effect) => Effect.runSync;`,
  },
  {
    count: 1,
    name: "rejects forwarding through the function call method",
    rule: "effect(no-runtime-references-outside-boundaries)",
    source: `import { Effect } from "effect";
export const result = Effect.runSync.call(null, Effect.void);`,
  },
  {
    count: 0,
    name: "leaves a direct call to the existing execution rule",
    rule: "effect(no-runtime-references-outside-boundaries)",
    source: `import { Effect } from "effect";
export const result = Effect.runSync(Effect.void);`,
  },
  {
    count: 12,
    name: "rejects the installed Effect runner call family",
    rule: "effect(no-runtime-execution-outside-boundaries)",
    source: `import { Effect, Context } from "effect";
Effect.runCallback(Effect.void);
Effect.runCallbackWith(Context.empty())(Effect.void);
Effect.runFork(Effect.void);
Effect.runForkWith(Context.empty())(Effect.void);
Effect.runPromise(Effect.void);
Effect.runPromiseExit(Effect.void);
Effect.runPromiseExitWith(Context.empty())(Effect.void);
Effect.runPromiseWith(Context.empty())(Effect.void);
Effect.runSync(Effect.void);
Effect.runSyncExit(Effect.void);
Effect.runSyncExitWith(Context.empty())(Effect.void);
Effect.runSyncWith(Context.empty())(Effect.void);`,
  },
  {
    count: 2,
    name: "rejects named and namespace Node host runner calls",
    rule: "effect(no-runtime-execution-outside-boundaries)",
    source: `import { runMain } from "@effect/platform-node/NodeRuntime";
import * as Node from "@effect/platform-node";
import { Effect } from "effect";
runMain(Effect.void);
Node.NodeRuntime.runMain(Effect.void);`,
  },
  {
    count: 0,
    name: "accepts persistent collections and Effect-managed immutable state",
    rule: "taxkit(no-object-writes)",
    source: `import { Effect, HashMap, HashSet, Ref } from "effect";

export const program = Effect.gen(function* () {
  const state = yield* Ref.make(HashMap.empty<string, number>());
  yield* Ref.update(state, HashMap.set("key", 1));
  return HashSet.fromIterable(["key"]);
});`,
  },
])("$name", ({ source, rule, count, name }) =>
  Effect.gen(function* () {
    const path = "tools/oxlint/.generated-lexical-policy.ts";
    yield* writeLintFixture(join(repositoryRoot, path), source);
    const result = yield* lintFiles([path], [], "json");
    const report = yield* Schema.decodeEffect(
      Schema.fromJsonString(
        Schema.Struct({
          diagnostics: Schema.Array(Schema.Struct({ code: Schema.String })),
          number_of_files: Schema.Int,
        })
      )
    )(result.stdout);
    expect(report.number_of_files).toBe(1);
    expect(
      Array.filter(report.diagnostics, (finding) => finding.code === rule)
    ).toHaveLength(count);
    expect(
      Array.some(report.diagnostics, (finding) =>
        finding.code.includes("plugin")
      )
    ).toBe(false);
    if (
      name ===
      "accepts persistent collections and Effect-managed immutable state"
    ) {
      expect(result.exitCode, result.stdout).toBe(0);
    }
  }).pipe(Effect.provide(BunServices.layer))
);
