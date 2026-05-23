export default {
  meta: {
    name: "whattax-no-switch",
  },
  rules: {
    "no-switch": {
      create(context) {
        return {
          SwitchStatement(node) {
            context.report({
              message:
                "Use Effect Match with Match.exhaustive instead of switch.",
              node,
            });
          },
        };
      },
    },
  },
};
