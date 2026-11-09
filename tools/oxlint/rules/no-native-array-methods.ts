import { HashSet } from "effect";

import type { OxlintRule, SyntaxNode } from "../host.types.js";
import { propertyName } from "./shared/taxkit-syntax.ts";

const nativeArrayMethods = HashSet.fromIterable([
  "concat",
  "every",
  "filter",
  "find",
  "findIndex",
  "flat",
  "flatMap",
  "forEach",
  "map",
  "reduce",
  "reduceRight",
  "slice",
  "some",
  "sort",
]);
const effectCollectionNamespaces = HashSet.fromIterable([
  "Array",
  "Chunk",
  "Effect",
  "HashMap",
  "HashSet",
  "Option",
  "Record",
]);
const isEffectCollectionNamespaceCall = (
  callee: SyntaxNode | null | undefined
) =>
  callee?.type === "MemberExpression" &&
  callee.object?.type === "Identifier" &&
  HashSet.has(effectCollectionNamespaces, callee.object.name);
export const noNativeArrayMethods: OxlintRule = {
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee?.type === "MemberExpression" &&
          !isEffectCollectionNamespaceCall(node.callee) &&
          HashSet.has(nativeArrayMethods, propertyName(node.callee.property))
        ) {
          context.report({
            messageId: "noNativeArrayMethods",
            node: node.callee.property,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow native array method pipelines in Effect-native service code.",
    },
    messages: {
      noNativeArrayMethods:
        "Do not use native array methods in calculator services. Use Effect Array or Chunk so collection policy is explicit and pipeable: Array.filter(items, predicate), Array.map(items, toValue), Chunk.fromIterable(items).pipe(Chunk.map(toValue)). For optional lookup use Array.findFirst(...).pipe(Option.match(...)), not items.find(...).",
    },
    type: "problem",
  },
};
