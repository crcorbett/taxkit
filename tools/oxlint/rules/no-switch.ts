import type { OxlintRule } from "../host.types.js";

export const noSwitch: OxlintRule = {
  create(context) {
    return {
      SwitchStatement(node) {
        context.report({ messageId: "noSwitch", node });
      },
    };
  },
  meta: {
    docs: { description: "Disallow switch statements in Effect-native code." },
    messages: {
      noSwitch:
        "Use Effect Match with Match.exhaustive for closed tagged variants instead of switch.",
    },
    type: "problem",
  },
};
