const noManualTag = {
  create(context) {
    return {
      Property(node) {
        const { key } = node;

        if (
          node.parent?.type === "ObjectExpression" &&
          ((key.type === "Identifier" && key.name === "_tag") ||
            (key.type === "Literal" && key.value === "_tag"))
        ) {
          context.report({
            messageId: "noManualTag",
            node: key,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow manual Effect _tag object literals.",
    },
    messages: {
      noManualTag:
        "Manual _tag object literals are not allowed. Use Data.TaggedClass, Data.TaggedError, Schema.TaggedClass, or an owning package constructor built from those primitives.",
    },
    type: "problem",
  },
};

export default {
  meta: {
    name: "whattax",
  },
  rules: {
    "no-manual-tag": noManualTag,
  },
};
