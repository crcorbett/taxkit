import {
  Function as EffectFunction,
  Array as EffectArray,
  HashSet,
  Option,
} from "effect";

import { propertyName, syntaxParents } from "../binding-tracker.ts";
import type { OxlintRule, SyntaxNode } from "../host.types.js";

const runtimeFunctionNodeTypes = HashSet.fromIterable([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);
const isModuleLevel = (node: SyntaxNode) => {
  const ancestors = syntaxParents(node);
  return (
    EffectFunction.pipe(
      ancestors,
      EffectArray.some((current) => current.type === "Program")
    ) &&
    !EffectFunction.pipe(
      EffectArray.takeWhile(ancestors, (current) => current.type !== "Program"),
      EffectArray.some(
        (current) =>
          HashSet.has(runtimeFunctionNodeTypes, current.type) ||
          (current.type === "TSModuleDeclaration" &&
            (current.declare ||
              current.global ||
              Option.contains(propertyName(current.id), "global")))
      )
    )
  );
};
export const noModuleLevelMutableTestState: OxlintRule = {
  create(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind !== "const" && isModuleLevel(node)) {
          context.report({
            messageId: "noModuleLevelMutableTestState",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow module-level mutable bindings in tests that can leak state between cases.",
    },
    messages: {
      noModuleLevelMutableTestState:
        "Do not keep mutable test state in a module-level let or var binding. Build isolated state inside each test or test Layer; use Effect Ref, Deferred, Queue, or a scoped service for observations and coordination. Keep unavoidable synchronous host-adapter mutation inside that per-test boundary.",
    },
    type: "problem",
  },
};
