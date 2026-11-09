import {
  Function as EffectFunction,
  Array as EffectArray,
  HashMap,
  HashSet,
  Option,
} from "effect";

import { createBindingTracker } from "../binding-tracker.ts";
import type { OxlintRule } from "../host.types.js";

const nativeCollectionConstructors = HashSet.fromIterable([
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
]);
const nativeCollectionSemantics = HashSet.fromIterable(
  EffectFunction.pipe(
    [...nativeCollectionConstructors],
    EffectArray.flatMap((name) => [`Native.${name}`, `Global.${name}`])
  )
);
export const noNativeCollections: OxlintRule = {
  create(context) {
    const bindings = HashMap.fromIterable([
      ...EffectFunction.pipe(
        [...nativeCollectionConstructors],
        EffectArray.map((name) => [name, `Native.${name}`] as const)
      ),
      ["globalThis", "Global"],
      ["window", "Global"],
    ]);
    const tracker = createBindingTracker(context.sourceCode, bindings);
    return {
      AssignmentExpression: tracker.trackAssignment,
      NewExpression(node) {
        if (
          tracker
            .semanticOfExpression(node.callee)
            .pipe(
              Option.exists((name) =>
                HashSet.has(nativeCollectionSemantics, name)
              )
            )
        ) {
          context.report({
            messageId: "noNativeCollections",
            node: node.callee,
          });
        }
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description:
        "Disallow native Map, Set and weak collections, including lexical aliases.",
    },
    messages: {
      noNativeCollections:
        "Use persistent Effect HashMap or HashSet instead of native Map, Set, WeakMap or WeakSet. Follow aliases to their actual built-in owner; a same-named local value is separate.",
    },
    type: "problem",
  },
};
