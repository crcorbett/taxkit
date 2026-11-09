import {
  Match,
  Function as EffectFunction,
  Array as EffectArray,
  HashSet,
  Option,
} from "effect";

import {
  createBindingTracker,
  propertyName,
  syntaxParents,
} from "../binding-tracker.ts";
import type { OxlintRule, SyntaxNode } from "../host.types.js";
import { effectImportSemantic } from "./shared/effect-references.ts";

const taggedErrorConstructorSemantics = HashSet.fromIterable([
  "Data.TaggedError",
  "Schema.TaggedError",
  "effect.Data.TaggedError",
  "effect.Schema.TaggedError",
]);
const hasTaggedErrorCallAncestor = (
  node: SyntaxNode,
  tracker: ReturnType<typeof createBindingTracker>
) =>
  EffectFunction.pipe(
    syntaxParents(node),
    EffectArray.some((current) => {
      if (current.type === "CallExpression") {
        const semantic = Match.value(current.callee).pipe(
          Match.when({ type: "CallExpression" }, (matchedValue) =>
            tracker.calledSemantic(matchedValue)
          ),
          Match.orElse(() => tracker.calledSemantic(current))
        );
        if (
          semantic.pipe(
            Option.exists((name) =>
              HashSet.has(taggedErrorConstructorSemantics, name)
            )
          )
        ) {
          return true;
        }
      }
      return false;
    })
  );
const isUnknownCauseProperty = (node: SyntaxNode) =>
  Option.exists(
    EffectFunction.pipe(
      syntaxParents(node),
      EffectArray.findFirst((current) => current.type === "TSPropertySignature")
    ),
    (current) =>
      current.type === "TSPropertySignature" &&
      Option.contains(propertyName(current.key), "cause")
  );
const unknownSchemaSemantics = HashSet.fromIterable([
  "Schema.Unknown",
  "effect.Schema.Unknown",
]);
export const noUnknownTaggedErrorCause: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      ImportDeclaration(node) {
        tracker.trackImport(node, effectImportSemantic);
      },
      Property(node) {
        if (
          Option.contains(propertyName(node.key), "cause") &&
          tracker
            .semanticOfExpression(node.value)
            .pipe(
              Option.exists((name) => HashSet.has(unknownSchemaSemantics, name))
            ) &&
          hasTaggedErrorCallAncestor(node, tracker)
        ) {
          context.report({
            messageId: "noUnknownTaggedErrorCause",
            node: node.value,
          });
        }
      },
      TSUnknownKeyword(node) {
        if (
          isUnknownCauseProperty(node) &&
          hasTaggedErrorCallAncestor(node, tracker)
        ) {
          context.report({ messageId: "noUnknownTaggedErrorCause", node });
        }
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: { description: "Disallow unknown tagged-error causes." },
    messages: {
      noUnknownTaggedErrorCause:
        "Tagged errors must not expose an unknown cause. Reuse the owning tagged error/schema, preserve an actual defect with Schema.Defect() at the adapter boundary, or expose schema-safe diagnostic fields such as message, command, status, and canonical identifiers.",
    },
    type: "problem",
  },
};
