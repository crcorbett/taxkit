import { Function as EffectFunction, HashMap, HashSet, Option } from "effect";
import { forEach } from "effect/Array";

import { createBindingTracker, propertyName } from "../binding-tracker.ts";
import type { OxlintRule, SyntaxKind, SyntaxNode } from "../host.types.js";

const processBoundaryMembers = HashSet.fromIterable([
  "argv",
  "env",
  "exit",
  "exitCode",
]);
export const noProcessOutsideBoundaries: OxlintRule = {
  create(context) {
    const bindings = HashMap.fromIterable([["process", "Global.process"]]);
    const tracker = createBindingTracker(context.sourceCode, bindings);
    const reportDestructuredMembers = (
      pattern: SyntaxNode | null | undefined,
      source: Option.Option<string>,
      node: SyntaxNode
    ) => {
      if (
        pattern?.type !== "ObjectPattern" ||
        !Option.contains(source, "Global.process")
      ) {
        return;
      }
      EffectFunction.pipe(
        pattern.properties ?? [],
        forEach<SyntaxKind<"ObjectPattern">["properties"][number]>(
          (property) => {
            if (
              property.type === "Property" &&
              propertyName(property.key).pipe(
                Option.exists((name) =>
                  HashSet.has(processBoundaryMembers, name)
                )
              )
            ) {
              context.report({ messageId: "noProcessOutsideBoundaries", node });
            }
          }
        )
      );
    };
    return {
      AssignmentExpression(node) {
        const source = tracker.semanticOfExpression(node.right);
        tracker.trackAssignment(node);
        reportDestructuredMembers(node.left, source, node.left);
      },
      CallExpression(node) {
        const semantic = tracker.calledSemantic(node);
        if (
          node.callee?.type === "Identifier" &&
          Option.isSome(semantic) &&
          semantic.value.startsWith("Global.process.") &&
          HashSet.has(
            processBoundaryMembers,
            semantic.value.slice("Global.process.".length)
          )
        ) {
          context.report({ messageId: "noProcessOutsideBoundaries", node });
        }
      },
      MemberExpression(node) {
        const semantic = tracker.semanticOfExpression(node);
        if (
          Option.isSome(semantic) &&
          semantic.value.startsWith("Global.process.") &&
          HashSet.has(
            processBoundaryMembers,
            semantic.value.slice("Global.process.".length)
          )
        ) {
          context.report({ messageId: "noProcessOutsideBoundaries", node });
        }
      },
      VariableDeclarator(node) {
        tracker.trackVariable(node);
        const semantic = tracker.semanticOfExpression(node.init);
        reportDestructuredMembers(node.id, semantic, node.id);
      },
    };
  },
  meta: {
    docs: {
      description: "Restrict process access to configured host boundaries.",
    },
    messages: {
      noProcessOutsideBoundaries:
        "Do not read process.env/process.argv or mutate process exit state in package logic. Decode configuration with Effect Config or Schema and keep process lifecycle access in an exact runtime or CLI adapter.",
    },
    type: "problem",
  },
};
