import { Array as EffectArray, HashSet, Option } from "effect";

import type { OxlintRule, SyntaxNode } from "./host.types.js";

const propertyName = (node: SyntaxNode | null | undefined) => {
  if (node?.type === "Identifier" || node?.type === "JSXIdentifier") {
    return node.name;
  }
  if (node?.type === "Literal") {
    return String(node.value);
  }
  return null;
};

const mdxElementKeys = HashSet.fromIterable([
  "a",
  "blockquote",
  "code",
  "h1",
  "h2",
  "h3",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "table",
  "ul",
]);

const hasMdxElementKey = (node: SyntaxNode | null | undefined) =>
  node?.type === "ObjectExpression" &&
  Option.fromNullishOr(node.properties).pipe(
    Option.map((properties) =>
      EffectArray.some(properties, (property) =>
        HashSet.has(
          mdxElementKeys,
          propertyName(
            property.type === "Property" ? property.key : undefined
          ) ?? ""
        )
      )
    ),
    Option.getOrUndefined
  );

const noRouteLocalComponentRegistry: OxlintRule = {
  create(context) {
    return {
      JSXAttribute(node) {
        const elementName = propertyName(
          node.parent?.type === "JSXOpeningElement"
            ? node.parent.name
            : undefined
        );
        if (
          propertyName(node.name) === "components" &&
          elementName === "MDX" &&
          node.value?.type === "JSXExpressionContainer" &&
          node.value.expression?.type === "ObjectExpression"
        ) {
          context.report({
            messageId: "noRouteLocalComponentRegistry",
            node,
          });
        }
      },
      VariableDeclarator(node) {
        const name = node.id?.type === "Identifier" ? node.id.name : null;
        if (
          name === "mdxComponents" ||
          (name === "components" && hasMdxElementKey(node.init))
        ) {
          context.report({
            messageId: "noRouteLocalComponentRegistry",
            node: node.id,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow route-local MDX component registries in favor of app-owned composition.",
    },
    messages: {
      noRouteLocalComponentRegistry:
        "Do not define an MDX component registry in a route or leaf. Import the app-owned MDX registry or package-owned render primitives so route components remain composition-only leaves over trusted values.",
    },
    type: "problem",
  },
};

export default {
  meta: { name: "mdx" },
  rules: {
    "no-route-local-component-registry": noRouteLocalComponentRegistry,
  },
};
