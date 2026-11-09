import { Function as EffectFunction, HashSet, Option } from "effect";
import { forEach } from "effect/Array";

import { createBindingTracker, propertyName } from "../binding-tracker.ts";
import type { OxlintRule, SyntaxKind, SyntaxNode } from "../host.types.js";
import {
  portableImportSemantic,
  runtimeExecutionSemantics,
} from "./shared/effect-references.ts";

// Calls have their existing rule. This owner rejects exporting or handing a
// runner to another callback before that callback can execute it elsewhere.
export const noRuntimeReferencesOutsideBoundaries: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
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
            Option.exists((name) =>
              HashSet.has(runtimeExecutionSemantics, name)
            )
          )
      ) {
        context.report({
          messageId: "noRuntimeReferencesOutsideBoundaries",
          node,
        });
      }
    };
    const reportDestructuredRunner = (
      pattern: SyntaxNode | null | undefined,
      source: Option.Option<string>
    ): void => {
      if (Option.isNone(source)) {
        return;
      }
      if (pattern?.type === "Identifier") {
        if (HashSet.has(runtimeExecutionSemantics, source.value)) {
          context.report({
            messageId: "noRuntimeReferencesOutsideBoundaries",
            node: pattern,
          });
        }
        return;
      }
      if (pattern?.type === "ObjectPattern") {
        EffectFunction.pipe(
          pattern.properties ?? [],
          forEach<SyntaxKind<"ObjectPattern">["properties"][number]>(
            (property) => {
              if (property.type === "Property") {
                const member = propertyName(property.key);
                if (Option.isSome(member)) {
                  const memberSemantic = Option.some(
                    `${source.value}.${member.value}`
                  );
                  reportDestructuredRunner(property.value, memberSemantic);
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
          reportDestructuredRunner(node.left, source);
        }
      },
      Identifier: reportReference,
      ImportDeclaration(node) {
        tracker.trackImport(node, portableImportSemantic);
      },
      MemberExpression: reportReference,
      VariableDeclarator(node) {
        const source = tracker.semanticOfExpression(node.init);
        tracker.trackVariable(node);
        if (node.id?.type === "ObjectPattern") {
          reportDestructuredRunner(node.id, source);
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Keep Effect runner references inside named runtime boundaries.",
    },
    messages: {
      noRuntimeReferencesOutsideBoundaries:
        "Return an Effect value. Do not export, capture or pass an Effect runner or ManagedRuntime constructor as a callback outside its named runtime owner.",
    },
    type: "problem",
  },
};
