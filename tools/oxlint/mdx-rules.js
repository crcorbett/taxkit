const propertyName = (node) => {
  if (node?.type === "Identifier" || node?.type === "JSXIdentifier") {
    return node.name;
  }
  if (node?.type === "Literal") {
    return String(node.value);
  }
  return null;
};

const mdxElementKeys = new Set([
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

const hasMdxElementKey = (node) =>
  node?.type === "ObjectExpression" &&
  node.properties?.some((property) =>
    mdxElementKeys.has(propertyName(property.key) ?? "")
  );

const noRouteLocalComponentRegistry = {
  create(context) {
    return {
      JSXAttribute(node) {
        const elementName = propertyName(node.parent?.name);
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
