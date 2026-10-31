import {
  Function as EffectFunction,
  Array,
  Option,
  Predicate,
  Match,
  Boolean as EffectBoolean,
} from "effect";

import type { OxlintContext, OxlintRule, SyntaxNode } from "./host.types.js";
import {
  isForbiddenPackageDependency,
  isFrontendModule,
  isHostSourceImport,
  workspaceOwner,
} from "./package-roles.ts";
import { workspaceContracts } from "./workspaces.boundary.ts";
// Scope-aware immutable string resolution, matching the native workspace rule.
const moduleAddress = (
  context: OxlintContext,
  node: SyntaxNode,
  visited: readonly SyntaxNode[] = []
): Option.Option<string> => {
  if (
    visited.length >= 64 ||
    EffectFunction.pipe(
      visited,
      Array.some((value) => value === node)
    )
  ) {
    return Option.none();
  }
  const next = Array.append(visited, node);
  if (node.type === "Literal" && Predicate.isString(node.value)) {
    return Option.some(node.value);
  }
  if (node.type === "TemplateLiteral") {
    return Option.all(
      EffectFunction.pipe(
        node.quasis,
        Array.map((part, index) =>
          Option.all([
            Option.fromNullishOr(part.value.cooked),
            Array.get(node.expressions, index).pipe(
              Option.match({
                onNone: () => Option.some(""),
                onSome: (value) => moduleAddress(context, value, next),
              })
            ),
          ]).pipe(Option.map(([text, expression]) => text + expression))
        )
      )
    ).pipe(Option.map(Array.join("")));
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    return Option.all([
      moduleAddress(context, node.left, next),
      moduleAddress(context, node.right, next),
    ]).pipe(Option.map(([left, right]) => left + right));
  }
  if (node.type !== "Identifier") {
    return Option.none();
  }
  const find = (
    scope: ReturnType<OxlintContext["sourceCode"]["getScope"]>
  ): Option.Option<string> =>
    EffectFunction.pipe(
      scope.variables,
      Array.findFirst((variable) => variable.name === node.name)
    ).pipe(
      Option.match({
        onNone: () =>
          Option.fromNullishOr(scope.upper).pipe(Option.flatMap(find)),
        onSome: (variable) =>
          EffectBoolean.match(
            variable.defs.length === 1 &&
              EffectFunction.pipe(
                variable.references,
                Array.every(
                  (reference) => !reference.isWrite() || reference.init
                )
              ),
            {
              onFalse: () => Option.none(),
              onTrue: () =>
                Array.head(variable.defs).pipe(
                  Option.flatMap((definition) =>
                    Match.value(definition).pipe(
                      Match.when(
                        {
                          node: { type: "VariableDeclarator" },
                          parent: {
                            type: "VariableDeclaration",
                            kind: "const",
                          },
                        },
                        ({ node: declaration }) =>
                          Option.fromNullishOr(declaration.init).pipe(
                            Option.flatMap((value) =>
                              moduleAddress(context, value, next)
                            )
                          )
                      ),
                      Match.orElse(() => Option.none())
                    )
                  )
                ),
            }
          ),
      })
    );
  return EffectFunction.pipe(context.sourceCode.getScope(node), find);
};
const workspaceRoles: OxlintRule = {
  create(context) {
    const file = context.filename
      .replaceAll("\\", "/")
      .slice(context.cwd.replaceAll("\\", "/").replace(/\/$/u, "").length + 1);
    const owner = workspaceOwner(workspaceContracts, file);
    const websiteSource = file.startsWith("apps/web/src/");
    // TanStack Start keeps a module out of the browser when it imports the
    // server-only marker; the runtime entry and Worker host are named too.
    const serverOnly = EffectFunction.pipe(
      context.sourceCode.ast.body,
      Array.some(
        (statement) =>
          statement.type === "ImportDeclaration" &&
          statement.source.value === "@tanstack/react-start/server-only"
      )
    );
    const browser =
      websiteSource &&
      (!/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(file) ||
        file.includes(".browser.test.")) &&
      file !== "apps/web/src/entry.server.ts" &&
      !file.endsWith(".server.ts") &&
      !serverOnly;
    const inspect = (node: SyntaxNode, source: SyntaxNode) => {
      const address = moduleAddress(context, source);
      if (Option.isNone(address)) {
        if (websiteSource) {
          context.report({ messageId: "role", node });
        }
        return;
      }
      if (
        Option.exists(owner, (value) =>
          isForbiddenPackageDependency(value, address.value)
        ) ||
        (websiteSource &&
          (address.value === "taxkit" ||
            address.value.startsWith("taxkit/") ||
            address.value.startsWith("@taxkit/")) &&
          !isFrontendModule(file, address.value)) ||
        (browser &&
          (address.value === "alchemy" ||
            address.value.startsWith("alchemy/"))) ||
        (browser &&
          /(?:^|\/)[^/]+\.server(?:\.layer)?(?:\.[cm]?[jt]sx?)?(?:[?#].*)?$/u.test(
            address.value
          ) &&
          !isHostSourceImport(file, address.value))
      ) {
        context.report({ messageId: "role", node });
      }
    };
    return {
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require"
        ) {
          const scope = context.sourceCode.getScope(node);
          const hasBinding = (current: typeof scope): boolean =>
            EffectFunction.pipe(
              current.variables,
              Array.some((variable) => variable.name === "require")
            ) || Option.exists(Option.fromNullishOr(current.upper), hasBinding);
          if (!hasBinding(scope)) {
            Option.match(Array.head(node.arguments), {
              onNone: () => null,
              onSome: (source) => {
                inspect(node, source);
              },
            });
          }
        }
      },
      ExportAllDeclaration(node) {
        inspect(node, node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          inspect(node, node.source);
        }
      },
      ImportDeclaration(node) {
        inspect(node, node.source);
      },
      ImportExpression(node) {
        inspect(node, node.source);
      },
      TSImportEqualsDeclaration(node) {
        if (node.moduleReference.type === "TSExternalModuleReference") {
          inspect(node, node.moduleReference.expression);
        }
      },
      TSImportType(node) {
        inspect(node, node.source);
      },
    };
  },
  meta: {
    docs: {
      description:
        "Keep browser contracts and clients separate from backend/deployment implementations.",
    },
    messages: {
      role: "Import browser contracts/clients or an exact approved host module; package runtimes cannot import deployment/provider implementations.",
    },
    schema: [],
    type: "problem",
  },
};
export default {
  meta: { name: "taxkit-package" },
  rules: { "workspace-roles": workspaceRoles },
};
