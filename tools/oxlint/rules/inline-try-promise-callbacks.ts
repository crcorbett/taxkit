import {
  Function as EffectFunction,
  Array as EffectArray,
  Option,
} from "effect";

import { createBindingTracker, propertyName } from "../binding-tracker.ts";
import type { OxlintRule, SyntaxKind } from "../host.types.js";
import { effectImportSemantic } from "./shared/effect-references.ts";

const tryPromiseSemantics = ["Effect.tryPromise", "effect.Effect.tryPromise"];
const mappingKeys = ["try", "catch"];
const inlineFunction = (
  property: SyntaxKind<"ObjectExpression">["properties"][number]
) =>
  property.type === "Property" &&
  property.kind === "init" &&
  !property.shorthand &&
  (property.value?.type === "ArrowFunctionExpression" ||
    property.value?.type === "FunctionExpression");
// The shared effect-conventions/require-try-promise-catch rule owns the
// presence of an options object with both keys. This rule adds only what it
// does not check: both callbacks are written inline and nothing is spread in.
export const inlineTryPromiseCallbacks: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (
          !tracker
            .calledSemantic(node)
            .pipe(
              Option.exists((name) =>
                EffectArray.contains(tryPromiseSemantics, name)
              )
            )
        ) {
          return;
        }
        const options = EffectArray.head(node.arguments);
        if (
          Option.isNone(options) ||
          options.value.type !== "ObjectExpression"
        ) {
          return;
        }
        const { properties } = options.value;
        const spread = EffectFunction.pipe(
          properties,
          EffectArray.some((property) => property.type === "SpreadElement")
        );
        const indirect = EffectFunction.pipe(
          properties,
          EffectArray.some(
            (property) =>
              property.type === "Property" &&
              propertyName(property.key).pipe(
                Option.exists((key) => EffectArray.contains(mappingKeys, key))
              ) &&
              !inlineFunction(property)
          )
        );
        if (spread || indirect) {
          context.report({
            messageId: "inlineTryPromiseCallbacks",
            node: node.callee,
          });
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, effectImportSemantic);
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description:
        "Require inline try and catch callbacks at Effect.tryPromise boundaries.",
    },
    messages: {
      inlineTryPromiseCallbacks:
        "Write Effect.tryPromise({ try: () => ..., catch: (cause) => ... }) with both callbacks inline and no spread, so this callsite maps rejection to the boundary's canonical tagged error. Do not pass an extracted, shorthand or undefined callback.",
    },
    type: "problem",
  },
};
