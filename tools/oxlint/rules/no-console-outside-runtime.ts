import { HashMap, Option } from "effect";

import { createBindingTracker } from "../binding-tracker.ts";
import type { OxlintRule } from "../host.types.js";

export const noConsoleOutsideRuntime: OxlintRule = {
  create(context) {
    const bindings = HashMap.fromIterable([["console", "Global.console"]]);
    const tracker = createBindingTracker(context.sourceCode, bindings);
    return {
      AssignmentExpression(node) {
        const source = tracker.semanticOfExpression(node.right);
        tracker.trackAssignment(node);
        if (
          node.left?.type === "ObjectPattern" &&
          Option.contains(source, "Global.console")
        ) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
      CallExpression(node) {
        if (
          node.callee?.type === "Identifier" &&
          tracker
            .calledSemantic(node)
            .pipe(Option.exists((name) => name.startsWith("Global.console.")))
        ) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
      MemberExpression(node) {
        if (
          tracker
            .semanticOfExpression(node)
            .pipe(Option.exists((name) => name.startsWith("Global.console.")))
        ) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
      VariableDeclarator(node) {
        const source = tracker.semanticOfExpression(node.init);
        tracker.trackVariable(node);
        if (
          node.id?.type === "ObjectPattern" &&
          Option.contains(source, "Global.console")
        ) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Restrict console output to configured runtime adapters.",
    },
    messages: {
      noConsoleOutsideRuntime:
        "Do not call console.* from Effect-owned logic. Return typed values or tagged errors and let the configured runtime, CLI, or test adapter render diagnostics.",
    },
    type: "problem",
  },
};
