import { HashSet, Option } from "effect";

import { createBindingTracker } from "../binding-tracker.ts";
import type { OxlintRule } from "../host.types.js";
import {
  portableImportSemantic,
  runtimeExecutionSemantics,
} from "./shared/effect-references.ts";

export const noRuntimeExecutionOutsideBoundaries: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (
          tracker
            .calledSemantic(node)
            .pipe(
              Option.exists((name) =>
                HashSet.has(runtimeExecutionSemantics, name)
              )
            )
        ) {
          context.report({
            messageId: "noRuntimeExecutionOutsideBoundaries",
            node: node.callee,
          });
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, portableImportSemantic);
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description:
        "Restrict Effect runtime execution to configured runtime boundaries.",
    },
    messages: {
      noRuntimeExecutionOutsideBoundaries:
        "Do not execute Effects or construct ManagedRuntime in package/service logic. Return Effect values and compose Layers; let an exact app, runtime, server, script, or test boundary execute the program.",
    },
    type: "problem",
  },
};
