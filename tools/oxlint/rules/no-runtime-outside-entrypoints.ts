import { HashSet, Option } from "effect";

import { createBindingTracker } from "../binding-tracker.ts";
import type { OxlintRule } from "../host.types.js";
import { bunImportSemantic } from "./shared/bun-references.ts";

const bunRuntimeSemantics = HashSet.fromIterable([
  "BunRuntime.runMain",
  "platform-bun.BunRuntime.runMain",
]);
export const noRuntimeOutsideEntrypoints: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (
          tracker
            .calledSemantic(node)
            .pipe(
              Option.exists((name) => HashSet.has(bunRuntimeSemantics, name))
            )
        ) {
          context.report({
            messageId: "noRuntimeOutsideEntrypoints",
            node: node.callee,
          });
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, bunImportSemantic);
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description: "Restrict BunRuntime.runMain to configured entrypoints.",
    },
    messages: {
      noRuntimeOutsideEntrypoints:
        "Do not call BunRuntime.runMain outside an executable runtime entrypoint. Package logic returns Effect programs; the configured app, CLI, or runtime adapter provides Bun layers and owns process lifecycle.",
    },
    type: "problem",
  },
};
