import {
  Function as EffectFunction,
  Array as EffectArray,
  HashMap,
  HashSet,
  Option,
} from "effect";

import { createBindingTracker, propertyName } from "./binding-tracker.ts";
import type {
  ImportSemantic,
  OxlintRule,
  SyntaxKind,
  SyntaxNode,
} from "./host.types.js";

const bunImportSemantic: ImportSemantic = (source, kind, imported) => {
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
const bunHostMethods = HashSet.fromIterable([
  "file",
  "serve",
  "spawn",
  "spawnSync",
  "write",
]);
const bunRuntimeSemantics = HashSet.fromIterable([
  "BunRuntime.runMain",
  "platform-bun.BunRuntime.runMain",
]);
const destructuresBunHostMethod = (pattern: SyntaxNode | null | undefined) =>
  pattern?.type === "ObjectPattern" &&
  EffectFunction.pipe(
    pattern.properties,
    EffectArray.some<SyntaxKind<"ObjectPattern">["properties"][number]>(
      (property) =>
        property.type === "Property" &&
        (!property.computed || property.key?.type === "Literal") &&
        propertyName(property.key).pipe(
          Option.exists((name) => HashSet.has(bunHostMethods, name))
        )
    )
  );
const isHostMethod = (semantic: Option.Option<string>) =>
  semantic.pipe(
    Option.exists(
      (name) =>
        name.startsWith("Global.Bun.") &&
        HashSet.has(bunHostMethods, name.slice("Global.Bun.".length))
    )
  );
const noHostApiOutsideAdapters: OxlintRule = {
  create(context) {
    const tracker = EffectFunction.pipe(context.sourceCode, (argument1) =>
      EffectFunction.pipe(HashMap.make(["Bun", "Global.Bun"]), (argument2) =>
        createBindingTracker(argument1, argument2)
      )
    );
    return {
      AssignmentExpression(node) {
        const source = tracker.semanticOfExpression(node.right);
        tracker.trackAssignment(node);
        if (
          Option.contains(source, "Global.Bun") &&
          destructuresBunHostMethod(node.left)
        ) {
          context.report({ messageId: "noHostApiOutsideAdapters", node });
        }
      },
      CallExpression(node) {
        const semantic = tracker.calledSemantic(node);
        if (node.callee?.type === "Identifier" && isHostMethod(semantic)) {
          context.report({
            messageId: "noHostApiOutsideAdapters",
            node: node.callee,
          });
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, bunImportSemantic);
      },
      MemberExpression(node) {
        if (
          EffectFunction.pipe(tracker.semanticOfExpression(node), isHostMethod)
        ) {
          context.report({
            messageId: "noHostApiOutsideAdapters",
            node,
          });
        }
      },
      VariableDeclarator(node) {
        const source = tracker.semanticOfExpression(node.init);
        tracker.trackVariable(node);
        if (
          Option.contains(source, "Global.Bun") &&
          destructuresBunHostMethod(node.id)
        ) {
          context.report({ messageId: "noHostApiOutsideAdapters", node });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Restrict Bun host APIs to configured adapter files.",
    },
    messages: {
      noHostApiOutsideAdapters:
        "Do not call Bun file, process, or server APIs from package logic. Use Effect Platform FileSystem, Command, or HttpServer services and provide Bun implementations from an exact live/runtime/script adapter.",
    },
    type: "problem",
  },
};
const noRuntimeOutsideEntrypoints: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (
          tracker
            .calledSemantic(node)
            .pipe(
              Option.exists((name) => HashSet.has(bunRuntimeSemantics, name))
            )
        ) {
          context.report({
            messageId: "noRuntimeOutsideEntrypoints",
            node: node.callee,
          });
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, bunImportSemantic);
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description: "Restrict BunRuntime.runMain to configured entrypoints.",
    },
    messages: {
      noRuntimeOutsideEntrypoints:
        "Do not call BunRuntime.runMain outside an executable runtime entrypoint. Package logic returns Effect programs; the configured app, CLI, or runtime adapter provides Bun layers and owns process lifecycle.",
    },
    type: "problem",
  },
};
export default {
  meta: { name: "bun" },
  rules: {
    "no-host-api-outside-adapters": noHostApiOutsideAdapters,
    "no-runtime-outside-entrypoints": noRuntimeOutsideEntrypoints,
  },
};
