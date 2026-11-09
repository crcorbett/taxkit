import {
  Match,
  Function as EffectFunction,
  Array as EffectArray,
  HashSet,
  Option,
} from "effect";

import { createBindingTracker, propertyName } from "../binding-tracker.ts";
import type { OxlintRule, SyntaxKind } from "../host.types.js";
import { effectImportSemantic } from "./shared/effect-references.ts";

const tryPromiseSemantics = HashSet.fromIterable([
  "Effect.tryPromise",
  "effect.Effect.tryPromise",
]);
export const noBareEffectTryPromise: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (
          !tracker
            .calledSemantic(node)
            .pipe(
              Option.exists((name) => HashSet.has(tryPromiseSemantics, name))
            )
        ) {
          return;
        }
        const options = Option.getOrUndefined(
          EffectArray.head(node.arguments ?? [])
        );
        const optionProperties: readonly SyntaxKind<"ObjectExpression">["properties"][number][] =
          Match.value(options).pipe(
            Match.when({ type: "ObjectExpression" }, (matchedValue) =>
              EffectFunction.pipe(
                matchedValue.properties,
                EffectArray.filter(
                  (property) =>
                    property.type === "Property" &&
                    (Option.contains(propertyName(property.key), "try") ||
                      Option.contains(propertyName(property.key), "catch"))
                )
              )
            ),
            Match.orElse(() => [])
          );
        const inlineFunctionKeys = HashSet.fromIterable(
          EffectFunction.pipe(
            optionProperties,
            EffectArray.filter(
              (property) =>
                property.type === "Property" &&
                property.kind === "init" &&
                (property.value?.type === "ArrowFunctionExpression" ||
                  property.value?.type === "FunctionExpression")
            ),
            EffectArray.map((property) =>
              Match.value(property).pipe(
                Match.when(
                  { type: "Property" },
                  (matchedValue) => matchedValue.key
                ),
                Match.orElse(EffectFunction.constUndefined),
                propertyName
              )
            )
          )
        );
        const hasDynamicSpread =
          options?.type === "ObjectExpression" &&
          EffectFunction.pipe(
            options.properties,
            EffectArray.some((property) => property.type === "SpreadElement")
          );
        if (
          optionProperties.length !== 2 ||
          HashSet.size(inlineFunctionKeys) !== 2 ||
          hasDynamicSpread
        ) {
          context.report({
            messageId: "noBareEffectTryPromise",
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
        "Require explicit inline rejection mapping at Effect.tryPromise boundaries.",
    },
    messages: {
      noBareEffectTryPromise:
        "Use Effect.tryPromise({ try: () => ..., catch: (cause) => ... }) with direct inline function-valued properties, and map rejection at this callsite to the boundary's canonical tagged error. Do not extract, spread, shorthand, or omit the rejection policy. Use Effect.promise only when rejection is intentionally a defect.",
    },
    type: "problem",
  },
};
