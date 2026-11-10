import { HashSet } from "effect";

import type { OxlintRule, SyntaxNode } from "../host.types.js";

const contextFieldNames = HashSet.fromIterable(["jurisdiction", "taxYear"]);
const contextFieldName = (node: SyntaxNode | null | undefined) => {
  if (node?.type !== "MemberExpression") {
    return null;
  }
  if (node.property?.type === "Identifier") {
    return node.property.name;
  }
  if (node.property?.type === "Literal") {
    return String(node.property.value);
  }
  return null;
};
export const noInventedTaxContext: OxlintRule = {
  create(context) {
    return {
      LogicalExpression(node) {
        if (
          node.operator === "??" &&
          HashSet.has(contextFieldNames, contextFieldName(node.left))
        ) {
          context.report({
            messageId: "noInventedTaxContext",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow jurisdiction or tax-year defaults in calculator service code.",
    },
    messages: {
      noInventedTaxContext:
        'Do not invent missing jurisdiction or taxYear with ??. Calculator context must come from canonical config/request schemas. Missing context must stay Option.none or fail with a tagged service error: payload.jurisdiction.pipe(Option.match({ onNone: () => Effect.fail(new MissingJurisdiction()), onSome: useJurisdiction })). Only use defaults declared by the owning Schema, never payload.jurisdiction ?? "AU".',
    },
    type: "problem",
  },
};
