import type { OxlintRule } from "../host.types.js";

// strict-effect/no-native-work owns ambient clock and randomness reads
// (new Date(), Date.now, Math.random). Calculators also reject explicit Date
// construction: dates and tax years enter through Schema-owned date types.
export const noDateConstruction: OxlintRule = {
  create(context) {
    return {
      NewExpression(node) {
        if (
          node.callee?.type === "Identifier" &&
          node.callee.name === "Date" &&
          node.arguments.length > 0
        ) {
          context.report({
            messageId: "noDateConstruction",
            node: node.callee,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow explicit Date construction in deterministic calculator service code.",
    },
    messages: {
      noDateConstruction:
        "Do not construct Date values in calculator services. Dates and tax years must come from canonical Schema-owned date types; for boundary time, use Effect Clock and convert through those types.",
    },
    type: "problem",
  },
};
