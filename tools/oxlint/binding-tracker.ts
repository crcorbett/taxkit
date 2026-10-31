import {
  Array,
  Equal,
  Function,
  Hash,
  HashMap,
  Match,
  MutableRef,
  Option,
  Predicate,
  Ref,
  Tuple,
} from "effect";

import type {
  ImportSemantic,
  OxlintSourceCode,
  SyntaxKind,
  SyntaxNode,
  SyntaxVariable,
} from "./host.types.js";

// Host nodes and lexical variables have identity even when their fields match.
export const referenceIdentity = <Value extends object>(value: Value) => ({
  [Equal.symbol]: (other: Parameters<Equal.Equal[typeof Equal.symbol]>[0]) =>
    Predicate.hasProperty(other, "value") && other.value === value,
  [Hash.symbol]: () => Hash.random(value),
  value,
});
export const syntaxParents = (node: SyntaxNode | null | undefined) =>
  Array.unfold(node?.parent, (current) =>
    Option.fromNullishOr(current).pipe(
      Option.map((parent) => Tuple.make(parent, parent.parent))
    )
  );
export const propertyName = (
  node: SyntaxNode | null | undefined
): Option.Option<string> =>
  Match.value(node).pipe(
    Match.when({ type: Match.is("Identifier", "JSXIdentifier") }, (value) =>
      Option.some(value.name)
    ),
    Match.when({ type: "Literal" }, (value) =>
      Option.some(String(value.value))
    ),
    Match.orElse(() => Option.none<string>())
  );
export const importSourceValue = (node: SyntaxKind<"ImportDeclaration">) =>
  node.source.value;

export const createBindingTracker = (
  sourceCode: OxlintSourceCode,
  globalSemantics: HashMap.HashMap<string, string> = HashMap.empty()
) => {
  // Oxlint owns one synchronous listener lifetime per rule and source file.
  const bindings = Ref.makeUnsafe(
    HashMap.empty<
      ReturnType<typeof referenceIdentity<SyntaxVariable>>,
      string
    >()
  );
  const references = Function.pipe(
    sourceCode.scopeManager.scopes,
    Array.flatMap((scope) =>
      Function.pipe(
        scope.references,
        Array.map((reference) =>
          Tuple.make(
            referenceIdentity<SyntaxNode>(reference.identifier),
            reference
          )
        )
      )
    ),
    HashMap.fromIterable
  );
  const semanticOfIdentifier = (node: SyntaxNode): Option.Option<string> => {
    if (node.type !== "Identifier") {
      return Option.none();
    }
    return HashMap.get(references, referenceIdentity(node)).pipe(
      Option.flatMap((reference) =>
        Option.fromNullishOr(reference.resolved).pipe(
          Option.match({
            // An unresolved lexical reference is a genuine global; an absent
            // reference (for example a declaration name) is not.
            onNone: () => HashMap.get(globalSemantics, node.name),
            onSome: (variable) => {
              if (
                variable.scope?.type === "global" &&
                variable.defs.length === 0
              ) {
                return HashMap.get(globalSemantics, node.name);
              }
              return HashMap.get(
                Ref.getUnsafe(bindings),
                referenceIdentity(variable)
              );
            },
          })
        )
      )
    );
  };
  const semanticOfExpression = (
    node: SyntaxNode | null | undefined
  ): Option.Option<string> =>
    Match.value(node).pipe(
      Match.when({ type: "Identifier" }, semanticOfIdentifier),
      Match.when({ type: "MemberExpression" }, (member) => {
        if (member.computed && member.property.type !== "Literal") {
          return Option.none();
        }
        return Option.all({
          object: semanticOfExpression(member.object),
          member: propertyName(member.property),
        }).pipe(Option.map(({ object, member: name }) => `${object}.${name}`));
      }),
      Match.when(
        {
          type: Match.is(
            "ChainExpression",
            "TSAsExpression",
            "TSInstantiationExpression",
            "TSNonNullExpression",
            "TSTypeAssertion"
          ),
        },
        (value) => semanticOfExpression(value.expression)
      ),
      Match.orElse(() => Option.none<string>())
    );
  const semanticOfTypeName = (
    node: SyntaxNode | null | undefined
  ): Option.Option<string> =>
    Match.value(node).pipe(
      Match.when({ type: "Identifier" }, semanticOfIdentifier),
      Match.when({ type: "TSQualifiedName" }, (value) =>
        Option.all({
          left: semanticOfTypeName(value.left),
          right: propertyName(value.right),
        }).pipe(Option.map(({ left, right }) => `${left}.${right}`))
      ),
      Match.orElse(() => Option.none<string>())
    );
  const trackPattern = (
    pattern: SyntaxNode | null | undefined,
    semantic: Option.Option<string>,
    declaration: Option.Option<SyntaxNode> = Option.none()
  ): void => {
    if (Option.isNone(semantic)) {
      return;
    }
    if (pattern?.type === "Identifier") {
      const variable = declaration.pipe(
        Option.match({
          onNone: () =>
            HashMap.get(references, referenceIdentity(pattern)).pipe(
              Option.flatMap((reference) =>
                Option.fromNullishOr(reference.resolved)
              )
            ),
          onSome: (node) =>
            Function.pipe(
              sourceCode.getDeclaredVariables(node),
              Array.findFirst((value) => value.name === pattern.name)
            ),
        })
      );
      if (Option.isSome(variable)) {
        MutableRef.update(
          bindings.ref,
          HashMap.set(referenceIdentity(variable.value), semantic.value)
        );
      }
      return;
    }
    if (pattern?.type !== "ObjectPattern") {
      return;
    }
    Function.pipe(
      pattern.properties,
      Array.forEach<SyntaxKind<"ObjectPattern">["properties"][number]>(
        (property) => {
          if (property.type !== "Property") {
            return;
          }
          const member = propertyName(property.key);
          if (Option.isNone(member)) {
            return;
          }
          const target = Match.value(property.value).pipe(
            Match.when({ type: "AssignmentPattern" }, ({ left }) => left),
            Match.orElse((value) => value)
          );
          const memberSemantic = Option.some(
            `${semantic.value}.${member.value}`
          );
          trackPattern(target, memberSemantic, declaration);
        }
      )
    );
  };
  const clearPattern = (pattern: SyntaxNode | null | undefined): void => {
    if (pattern?.type === "Identifier") {
      const variable = HashMap.get(references, referenceIdentity(pattern)).pipe(
        Option.flatMap((reference) => Option.fromNullishOr(reference.resolved))
      );
      if (Option.isSome(variable)) {
        MutableRef.update(
          bindings.ref,
          HashMap.remove(referenceIdentity(variable.value))
        );
      }
      return;
    }
    if (pattern?.type !== "ObjectPattern") {
      return;
    }
    Function.pipe(
      pattern.properties,
      Array.forEach<SyntaxKind<"ObjectPattern">["properties"][number]>(
        (property) => {
          if (property.type !== "Property") {
            return;
          }
          Match.value(property.value).pipe(
            Match.when({ type: "AssignmentPattern" }, ({ left }) => left),
            Match.orElse((value) => value),
            clearPattern
          );
        }
      )
    );
  };
  return {
    calledSemantic: (node: SyntaxNode | null | undefined) =>
      Match.value(node).pipe(
        Match.when({ type: "CallExpression" }, ({ callee }) =>
          semanticOfExpression(callee)
        ),
        Match.orElse(() => Option.none<string>())
      ),
    isReadReference: (node: SyntaxNode) =>
      HashMap.get(references, referenceIdentity(node)).pipe(
        Option.exists((reference) => reference.isRead())
      ),
    semanticOfExpression,
    semanticOfTypeName,
    trackAssignment: (node: SyntaxKind<"AssignmentExpression">) => {
      if (node.operator !== "=") {
        return;
      }
      const semantic = semanticOfExpression(node.right);
      if (Option.isNone(semantic)) {
        clearPattern(node.left);
      } else {
        trackPattern(node.left, semantic);
      }
    },
    trackImport(
      node: SyntaxKind<"ImportDeclaration">,
      importSemantic: ImportSemantic
    ) {
      const source = importSourceValue(node);
      Function.pipe(
        node.specifiers,
        Array.forEach((specifier) => {
          const imported = Match.value(specifier).pipe(
            Match.when({ type: "ImportSpecifier" }, (value) =>
              propertyName(value.imported)
            ),
            Match.orElse(() => Option.none<string>())
          );
          const semantic = importSemantic(source, specifier.type, imported);
          const declaration = Option.some(specifier);
          trackPattern(specifier.local, semantic, declaration);
        })
      );
    },
    trackVariable: (node: SyntaxKind<"VariableDeclarator">) => {
      const semantic = semanticOfExpression(node.init);
      const declaration = Option.some(node);
      trackPattern(node.id, semantic, declaration);
    },
  };
};
