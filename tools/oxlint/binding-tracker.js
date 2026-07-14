export const propertyName = (node) => {
  if (node?.type === "Identifier" || node?.type === "JSXIdentifier") {
    return node.name;
  }

  if (node?.type === "Literal") {
    return String(node.value);
  }

  return null;
};

export const importSourceValue = (node) =>
  typeof node?.source?.value === "string" ? node.source.value : "";

const declaredVariable = (sourceCode, node, name) =>
  sourceCode
    .getDeclaredVariables(node)
    .find((variable) => variable.name === name) ?? null;

export const createBindingTracker = (
  sourceCode,
  globalSemantics = new Map()
) => {
  const bindingSemantics = new Map();
  const referenceVariables = new Map();

  for (const scope of sourceCode.scopeManager.scopes) {
    for (const reference of scope.references) {
      referenceVariables.set(reference.identifier, reference.resolved ?? null);
    }
  }

  const semanticOfIdentifier = (node) => {
    if (node?.type !== "Identifier") {
      return null;
    }

    const variable = referenceVariables.get(node);
    if (variable) {
      return bindingSemantics.get(variable) ?? null;
    }

    return variable === null ? (globalSemantics.get(node.name) ?? null) : null;
  };

  const semanticOfExpression = (node) => {
    if (node?.type === "Identifier") {
      return semanticOfIdentifier(node);
    }

    if (node?.type === "MemberExpression") {
      const object = semanticOfExpression(node.object);
      const member =
        !node.computed || node.property?.type === "Literal"
          ? propertyName(node.property)
          : null;
      return object && member ? `${object}.${member}` : null;
    }

    if (
      node?.type === "ChainExpression" ||
      node?.type === "TSAsExpression" ||
      node?.type === "TSInstantiationExpression" ||
      node?.type === "TSNonNullExpression" ||
      node?.type === "TSTypeAssertion"
    ) {
      return semanticOfExpression(node.expression);
    }

    return null;
  };

  const semanticOfTypeName = (node) => {
    if (node?.type === "Identifier") {
      return semanticOfIdentifier(node);
    }

    if (node?.type === "TSQualifiedName") {
      const left = semanticOfTypeName(node.left);
      const right = propertyName(node.right);
      return left && right ? `${left}.${right}` : null;
    }

    return null;
  };

  const setDeclaredSemantic = (node, name, semantic) => {
    const variable = declaredVariable(sourceCode, node, name);
    if (variable && semantic) {
      bindingSemantics.set(variable, semantic);
    }
  };

  const setReferencedSemantic = (node, semantic) => {
    const variable = referenceVariables.get(node);
    if (variable && semantic) {
      bindingSemantics.set(variable, semantic);
    }
  };

  const trackPattern = (pattern, sourceSemantic, declarationNode = null) => {
    if (!sourceSemantic) {
      return;
    }

    if (pattern?.type === "Identifier") {
      if (declarationNode) {
        setDeclaredSemantic(declarationNode, pattern.name, sourceSemantic);
      } else {
        setReferencedSemantic(pattern, sourceSemantic);
      }
      return;
    }

    if (pattern?.type !== "ObjectPattern") {
      return;
    }

    for (const property of pattern.properties ?? []) {
      if (property.type !== "Property") {
        continue;
      }

      const member = propertyName(property.key);
      if (!member) {
        continue;
      }

      const target =
        property.value?.type === "AssignmentPattern"
          ? property.value.left
          : property.value;
      trackPattern(target, `${sourceSemantic}.${member}`, declarationNode);
    }
  };

  const clearPattern = (pattern) => {
    if (pattern?.type === "Identifier") {
      const variable = referenceVariables.get(pattern);
      if (variable) {
        bindingSemantics.delete(variable);
      }
      return;
    }

    if (pattern?.type === "ObjectPattern") {
      for (const property of pattern.properties ?? []) {
        if (property.type === "Property") {
          clearPattern(
            property.value?.type === "AssignmentPattern"
              ? property.value.left
              : property.value
          );
        }
      }
    }
  };

  return {
    calledSemantic: (node) =>
      node?.type === "CallExpression"
        ? semanticOfExpression(node.callee)
        : null,
    semanticOfExpression,
    semanticOfTypeName,
    trackAssignment(node) {
      if (node.operator === "=") {
        const semantic = semanticOfExpression(node.right);
        if (semantic) {
          trackPattern(node.left, semantic);
        } else {
          clearPattern(node.left);
        }
      }
    },
    trackImport(node, importSemantic) {
      const source = importSourceValue(node);
      for (const specifier of node.specifiers ?? []) {
        const imported =
          specifier.type === "ImportSpecifier"
            ? propertyName(specifier.imported)
            : null;
        const semantic = importSemantic(source, specifier.type, imported);
        if (semantic && specifier.local?.type === "Identifier") {
          setDeclaredSemantic(specifier, specifier.local.name, semantic);
        }
      }
    },
    trackVariable(node) {
      trackPattern(node.id, semanticOfExpression(node.init), node);
    },
  };
};
