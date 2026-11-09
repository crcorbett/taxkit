import {
  Function as EffectFunction,
  Array as EffectArray,
  HashMap,
  HashSet,
  Option,
} from "effect";

import { createBindingTracker, propertyName } from "../binding-tracker.ts";
import type { OxlintRule, SyntaxKind, SyntaxNode } from "../host.types.js";
import { bunImportSemantic } from "./shared/bun-references.ts";

const bunHostMethods = HashSet.fromIterable([
  "file",
  "serve",
  "spawn",
  "spawnSync",
  "write",
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
export const noHostApiOutsideAdapters: OxlintRule = {
  create(context) {
    const bindings = HashMap.make(["Bun", "Global.Bun"]);
    const tracker = createBindingTracker(context.sourceCode, bindings);
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
