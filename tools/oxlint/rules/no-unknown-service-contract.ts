import { Predicate, Array as EffectArray, HashSet, Option } from "effect";

import { createBindingTracker } from "../binding-tracker.ts";
import type { OxlintRule, SyntaxNode } from "../host.types.js";
import { effectImportSemantic } from "./shared/effect-references.ts";

const functionNodeTypes = HashSet.fromIterable([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
  "TSCallSignatureDeclaration",
  "TSFunctionType",
  "TSMethodSignature",
]);
const isUnknownFunctionParameter = (node: SyntaxNode) => {
  const annotation = node.parent;
  const parameter = annotation?.parent;
  return (
    annotation?.type === "TSTypeAnnotation" &&
    !Predicate.isUndefined(parameter) &&
    HashSet.has(functionNodeTypes, parameter?.parent?.type ?? "")
  );
};
const effectTypeSemantics = HashSet.fromIterable([
  "Effect.Effect",
  "effect.Effect.Effect",
]);
const isUnknownEffectError = (
  node: SyntaxNode,
  tracker: ReturnType<typeof createBindingTracker>
) => {
  const parameters = node.parent;
  const reference = parameters?.parent;
  return (
    parameters?.type === "TSTypeParameterInstantiation" &&
    reference?.type === "TSTypeReference" &&
    tracker
      .semanticOfTypeName(reference.typeName)
      .pipe(Option.exists((name) => HashSet.has(effectTypeSemantics, name))) &&
    Option.contains(EffectArray.get(parameters.params ?? [], 1), node)
  );
};
export const noUnknownServiceContract: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      ImportDeclaration(node) {
        tracker.trackImport(node, effectImportSemantic);
      },
      TSUnknownKeyword(node) {
        if (
          isUnknownFunctionParameter(node) ||
          isUnknownEffectError(node, tracker)
        ) {
          context.report({ messageId: "noUnknownServiceContract", node });
        }
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description:
        "Disallow unknown parameters and error channels in service contracts.",
    },
    messages: {
      noUnknownServiceContract:
        "Service contracts must accept schema-derived inputs and expose closed tagged Effect errors, not unknown. Decode raw values at the owning ingress and map expected failures to canonical tagged errors before entering the service.",
    },
    type: "problem",
  },
};
