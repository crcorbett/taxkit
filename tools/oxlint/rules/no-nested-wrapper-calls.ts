import { Function as EffectFunction, Array as EffectArray } from "effect";

import type { OxlintRule } from "../host.types.js";

export const noNestedWrapperCalls: OxlintRule = {
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee?.type === "Identifier" &&
          EffectFunction.pipe(
            node.arguments,
            EffectArray.some((argument) => argument?.type === "CallExpression")
          )
        ) {
          context.report({
            messageId: "noNestedWrapperCalls",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow nested wrapper-call composition in calculator service code.",
    },
    messages: {
      noNestedWrapperCalls:
        "Do not compose calculator transformations as nested wrapper calls like toResponse(filterEntries(query)). Use pipe-first data flow when sequencing transformations: query.pipe(filterEntries, toResponse) or pipe(query, filterEntries, toResponse). Keep inline Effect error transforms at the callsite with .pipe(Effect.mapError(...), Effect.catchTag(...)).",
    },
    type: "problem",
  },
};
