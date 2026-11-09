import type { SyntaxNode } from "../../host.types.js";

export const propertyName = (node: SyntaxNode | null | undefined) => {
  if (node?.type === "Identifier") {
    return node.name;
  }
  if (node?.type === "Literal") {
    return String(node.value);
  }
  return null;
};
