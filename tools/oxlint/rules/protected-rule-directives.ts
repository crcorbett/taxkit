import { Function as EffectFunction, Array, Option, Schema } from "effect";

import type { OxlintRule } from "../host.types.js";
import { ruleOptions } from "./shared/options.consumer.ts";

// The protected rule names come from oxlint.config.ts.
const ProtectedRuleOptions = Schema.Struct({
  rules: Schema.NonEmptyArray(Schema.NonEmptyString),
});
const directive = /^\s*(?:oxlint|eslint)-(?:disable|enable)\b/u;
export const protectedRuleDirectives: OxlintRule = {
  create(context) {
    const options = ruleOptions(ProtectedRuleOptions)(context);
    return {
      Program(node) {
        if (Option.isNone(options)) {
          context.report({ messageId: "options", node });
          return;
        }
        // The guard protects itself too, so a directive cannot switch it off
        // before naming a protected rule. Reports sit at the comment and at the
        // file start, which a later directive cannot reach.
        const names = Array.append(
          options.value.rules,
          "taxkit/protected-rule-directives"
        );
        EffectFunction.pipe(
          context.sourceCode.getAllComments(),
          Array.filter(
            (comment) =>
              directive.test(comment.value) &&
              EffectFunction.pipe(
                names,
                Array.some((name) => comment.value.includes(name))
              )
          ),
          Array.forEach((comment) => {
            context.report({ messageId: "directive", node: comment });
            context.report({
              loc: { line: 1, column: 0 },
              messageId: "directive",
            });
          })
        );
      },
    };
  },
  meta: {
    docs: {
      description:
        "Reject disable directives that name a rule the repository never waives.",
    },
    messages: {
      directive:
        "This rule is never waived by a comment. Fix the code or move the decode to a configured ingress owner.",
      options: "Configure the protected rule names for this rule.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          rules: {
            items: { minLength: 1, type: "string" },
            minItems: 1,
            type: "array",
          },
        },
        required: ["rules"],
        type: "object",
      },
    ],
  },
};
