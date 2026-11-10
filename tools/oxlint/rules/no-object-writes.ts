import {
  Predicate,
  Function as EffectFunction,
  HashMap,
  HashSet,
  Option,
} from "effect";
import { forEach } from "effect/Array";

import { createBindingTracker } from "../binding-tracker.ts";
import type { OxlintRule, SyntaxKind, SyntaxNode } from "../host.types.js";
import { propertyName } from "./shared/taxkit-syntax.ts";

const objectWriteSemantics = HashSet.fromIterable([
  "Global.Object.assign",
  "Global.Object.defineProperty",
  "Global.Object.defineProperties",
  "Global.Object.setPrototypeOf",
  "Global.Reflect.set",
  "Global.Reflect.deleteProperty",
  "Global.Reflect.defineProperty",
  "Global.Reflect.setPrototypeOf",
]);
export const noObjectWrites: OxlintRule = {
  create(context) {
    const bindings = HashMap.fromIterable([
      ["Object", "Global.Object"],
      ["Reflect", "Global.Reflect"],
      ["globalThis", "Global"],
      ["window", "Global"],
    ]);
    const tracker = createBindingTracker(context.sourceCode, bindings);
    const reportReference = (node: SyntaxNode) => {
      if (node.type === "Identifier" && !tracker.isReadReference(node)) {
        return;
      }
      if (
        node.parent?.type === "CallExpression" &&
        node.parent.callee === node
      ) {
        return;
      }
      if (
        tracker
          .semanticOfExpression(node)
          .pipe(
            Option.exists((name) => HashSet.has(objectWriteSemantics, name))
          )
      ) {
        context.report({ messageId: "noObjectWrites", node });
      }
    };
    const reportDestructuredWrite = (
      pattern: SyntaxNode | null | undefined,
      source: Option.Option<string>
    ): void => {
      if (Option.isNone(source)) {
        return;
      }
      if (pattern?.type === "Identifier") {
        if (HashSet.has(objectWriteSemantics, source.value)) {
          context.report({ messageId: "noObjectWrites", node: pattern });
        }
        return;
      }
      if (pattern?.type === "ObjectPattern") {
        EffectFunction.pipe(
          pattern.properties,
          forEach<SyntaxKind<"ObjectPattern">["properties"][number]>(
            (property) => {
              if (property.type === "Property") {
                const member = propertyName(property.key);
                if (!Predicate.isNull(member)) {
                  const memberSemantic = Option.some(
                    `${source.value}.${member}`
                  );
                  reportDestructuredWrite(property.value, memberSemantic);
                }
              }
            }
          )
        );
      }
    };
    return {
      AssignmentExpression(node) {
        const source = tracker.semanticOfExpression(node.right);
        tracker.trackAssignment(node);
        if (node.left?.type === "ObjectPattern") {
          reportDestructuredWrite(node.left, source);
        }
      },
      CallExpression(node) {
        if (
          tracker
            .calledSemantic(node)
            .pipe(
              Option.exists((name) => HashSet.has(objectWriteSemantics, name))
            )
        ) {
          context.report({ messageId: "noObjectWrites", node: node.callee });
        }
      },
      Identifier: reportReference,
      MemberExpression: reportReference,
      VariableDeclarator(node) {
        const source = tracker.semanticOfExpression(node.init);
        tracker.trackVariable(node);
        if (node.id?.type === "ObjectPattern") {
          reportDestructuredWrite(node.id, source);
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Reject Object/Reflect writes and escaping write operations through lexical aliases.",
    },
    messages: {
      noObjectWrites:
        "Return an immutable value instead of writing with Object or Reflect. Effect-managed state keeps immutable values in its named owner; built-in write aliases do not change this requirement.",
    },
    type: "problem",
  },
};
