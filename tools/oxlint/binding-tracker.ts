import {
  Array as EffectArray,
  Equal,
  Hash,
  HashMap,
  MutableRef,
  Option,
  Predicate,
  Ref,
} from "effect";
import { forEach } from "effect/Array";

import type {
  ImportSemantic,
  OxlintSourceCode,
  SyntaxKind,
  SyntaxNode,
  SyntaxVariable,
} from "./host.types.js";

// Host nodes and lexical variables have identity even when their fields match.
// Wrap keys without changing or structurally hashing the host object.
export const referenceIdentity = <Value extends object>(value: Value) => ({
  [Equal.symbol]: (other: Parameters<Equal.Equal[typeof Equal.symbol]>[0]) =>
    Predicate.hasProperty(other, "value") && other.value === value,
  [Hash.symbol]: () => Hash.random(value),
  value,
});

export const syntaxParents = (node: SyntaxNode | null | undefined) =>
  EffectArray.unfold(node?.parent, (current) =>
    current ? Option.some([current, current.parent]) : Option.none()
  );

export const propertyName = (node: SyntaxNode | null | undefined) => {
  if (node?.type === "Identifier" || node?.type === "JSXIdentifier") {
    return node.name;
  }

  if (node?.type === "Literal") {
    return String(node.value);
  }

  return null;
};

export const importSourceValue = (node: SyntaxKind<"ImportDeclaration">) => {
  const value = node?.source?.value;
  return String(value) === value ? value : "";
};

const declaredVariable = (
  sourceCode: OxlintSourceCode,
  node: SyntaxNode,
  name: string
) =>
  Option.getOrNull(
    EffectArray.findFirst(
      sourceCode.getDeclaredVariables(node),
      (variable) => variable.name === name
    )
  );

export const createBindingTracker = (
  sourceCode: OxlintSourceCode,
  globalSemantics: HashMap.HashMap<string, string> = HashMap.empty()
) => {
  // Oxlint owns one synchronous listener lifetime per rule and source file.
  // Ref owns its changing bindings; each update replaces a persistent map.
  const bindingSemantics = Ref.makeUnsafe(
    HashMap.empty<
      ReturnType<typeof referenceIdentity<SyntaxVariable>>,
      string
    >()
  );
  const lexicalReferences = HashMap.fromIterable(
    EffectArray.flatMap(sourceCode.scopeManager.scopes, (scope) =>
      EffectArray.map(scope.references, (reference) => [
        referenceIdentity<SyntaxNode>(reference.identifier),
        reference,
      ])
    )
  );

  const semanticOfIdentifier = (
    node: SyntaxNode | null | undefined
  ): string | null => {
    if (node?.type !== "Identifier") {
      return null;
    }

    const variable = Option.getOrUndefined(
      HashMap.get(lexicalReferences, referenceIdentity(node)).pipe(
        Option.map((reference) => reference.resolved ?? null)
      )
    );
    if (variable) {
      if (variable.scope?.type === "global" && variable.defs.length === 0) {
        return Option.getOrNull(HashMap.get(globalSemantics, node.name));
      }
      return Option.getOrNull(
        HashMap.get(
          Ref.getUnsafe(bindingSemantics),
          referenceIdentity(variable)
        )
      );
    }

    return variable === null
      ? Option.getOrNull(HashMap.get(globalSemantics, node.name))
      : null;
  };

  const semanticOfExpression = (
    node: SyntaxNode | null | undefined
  ): string | null => {
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

  const semanticOfTypeName = (
    node: SyntaxNode | null | undefined
  ): string | null => {
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

  const setDeclaredSemantic = (
    node: SyntaxNode,
    name: string,
    semantic: string | null
  ) => {
    const variable = declaredVariable(sourceCode, node, name);
    if (variable && semantic) {
      MutableRef.update(
        bindingSemantics.ref,
        HashMap.set(referenceIdentity(variable), semantic)
      );
    }
  };

  const setReferencedSemantic = (node: SyntaxNode, semantic: string | null) => {
    const variable = Option.getOrUndefined(
      HashMap.get(lexicalReferences, referenceIdentity(node)).pipe(
        Option.map((reference) => reference.resolved ?? null)
      )
    );
    if (variable && semantic) {
      MutableRef.update(
        bindingSemantics.ref,
        HashMap.set(referenceIdentity(variable), semantic)
      );
    }
  };

  const trackPattern = (
    pattern: SyntaxNode | null | undefined,
    sourceSemantic: string | null,
    declarationNode: SyntaxNode | null = null
  ): void => {
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

    forEach<SyntaxKind<"ObjectPattern">["properties"][number]>(
      pattern.properties ?? [],
      (property) => {
        if (property.type !== "Property") {
          return;
        }

        const member = propertyName(property.key);
        if (!member) {
          return;
        }

        const target =
          property.value?.type === "AssignmentPattern"
            ? property.value.left
            : property.value;
        trackPattern(target, `${sourceSemantic}.${member}`, declarationNode);
      }
    );
  };

  const clearPattern = (pattern: SyntaxNode | null | undefined): void => {
    if (pattern?.type === "Identifier") {
      const variable = Option.getOrUndefined(
        HashMap.get(lexicalReferences, referenceIdentity(pattern)).pipe(
          Option.map((reference) => reference.resolved ?? null)
        )
      );
      if (variable) {
        MutableRef.update(
          bindingSemantics.ref,
          HashMap.remove(referenceIdentity(variable))
        );
      }
      return;
    }

    if (pattern?.type === "ObjectPattern") {
      forEach<SyntaxKind<"ObjectPattern">["properties"][number]>(
        pattern.properties ?? [],
        (property) => {
          if (property.type === "Property") {
            clearPattern(
              property.value?.type === "AssignmentPattern"
                ? property.value.left
                : property.value
            );
          }
        }
      );
    }
  };

  return {
    calledSemantic: (node: SyntaxNode | null | undefined) =>
      node?.type === "CallExpression"
        ? semanticOfExpression(node.callee)
        : null,
    isReadReference: (node: SyntaxNode) =>
      Option.exists(
        HashMap.get(lexicalReferences, referenceIdentity(node)),
        (reference) => reference.isRead()
      ),
    semanticOfExpression,
    semanticOfTypeName,
    trackAssignment(node: SyntaxKind<"AssignmentExpression">) {
      if (node.operator === "=") {
        const semantic = semanticOfExpression(node.right);
        if (semantic) {
          trackPattern(node.left, semantic);
        } else {
          clearPattern(node.left);
        }
      }
    },
    trackImport(
      node: SyntaxKind<"ImportDeclaration">,
      importSemantic: ImportSemantic
    ) {
      const source = importSourceValue(node);
      forEach(node.specifiers ?? [], (specifier) => {
        const imported =
          specifier.type === "ImportSpecifier"
            ? propertyName(specifier.imported)
            : null;
        const semantic = importSemantic(source, specifier.type, imported);
        if (semantic && specifier.local?.type === "Identifier") {
          setDeclaredSemantic(specifier, specifier.local.name, semantic);
        }
      });
    },
    trackVariable(node: SyntaxKind<"VariableDeclarator">) {
      trackPattern(node.id, semanticOfExpression(node.init), node);
    },
  };
};
