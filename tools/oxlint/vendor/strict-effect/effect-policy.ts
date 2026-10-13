import { defineRule, eslintCompatPlugin } from "@oxlint/plugins";
import type { Context, ESTree, Scope, Variable } from "@oxlint/plugins";
import * as Array from "effect/Array";
import * as Function from "effect/Function";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

// Resolve the nearest declaration, so a parameter or block-local name cannot
// borrow a constant or import from an outer scope.
const scopedVariable = (scope: Scope, name: string): Option.Option<Variable> =>
  Array.findFirst<Variable>((variable) => variable.name === name)(scope.variables).pipe(
    Option.orElse(() =>
      Option.fromNullishOr(scope.upper).pipe(
        Option.flatMap((upper) => scopedVariable(upper, name)),
      ),
    ),
  );

const constantDeclaration = (variable: Variable): Option.Option<ESTree.VariableDeclarator> =>
  Array.head(variable.defs).pipe(
    Option.filter(() => variable.defs.length === 1),
    Option.filter(() =>
      Array.every<Variable["references"][number]>(
        (reference) => !reference.isWrite() || reference.init,
      )(variable.references),
    ),
    Option.flatMap((definition) => {
      if (
        definition.node.type === "VariableDeclarator" &&
        definition.parent?.type === "VariableDeclaration" &&
        definition.parent.kind === "const"
      ) {
        return Option.some(definition.node);
      }
      return Option.none();
    }),
  );

// Only immutable local strings are safe to resolve. Unknown names fail closed
// at the owning rule; no code is evaluated to discover an import address.
const moduleAddress = (
  context: Context,
  source: ESTree.Node,
  visited: readonly ESTree.Node[] = [],
): Option.Option<string> => {
  if (Array.contains(source)(visited)) {
    return Option.none();
  }
  const next = [...visited, source];
  if (source.type === "Literal" && Predicate.isString(source.value)) {
    return Option.some(source.value);
  }
  if (source.type === "TemplateLiteral") {
    const quasis = Array.map((quasi: ESTree.TemplateElement) =>
      Option.fromNullishOr(quasi.value.cooked),
    )(source.quasis);
    const expressions = [
      ...Array.map((expression: ESTree.Expression) => moduleAddress(context, expression, next))(
        source.expressions,
      ),
      Option.some(""),
    ];
    return Function.pipe(
      Array.zipWith(expressions, (quasi: Option.Option<string>, expression) =>
        Option.all([quasi, expression]).pipe(Option.map(([text, value]) => text + value)),
      )(quasis),
      Option.all,
      Option.map(Array.join("")),
    );
  }
  if (source.type === "BinaryExpression" && source.operator === "+") {
    return Option.all([
      moduleAddress(context, source.left, next),
      moduleAddress(context, source.right, next),
    ]).pipe(Option.map(([left, right]) => left + right));
  }
  if (source.type === "Identifier") {
    const scope = context.sourceCode.getScope(source);
    return scopedVariable(scope, source.name).pipe(
      Option.flatMap(constantDeclaration),
      Option.filter((declaration) => declaration.id.type === "Identifier"),
      Option.flatMap((declaration) => Option.fromNullishOr(declaration.init)),
      Option.flatMap((initialiser) => moduleAddress(context, initialiser, next)),
    );
  }
  return Option.none();
};

const typeOnlyImport = (node: ESTree.ImportDeclaration) =>
  node.importKind === "type" ||
  (node.specifiers.length > 0 &&
    Array.every<ESTree.ImportDeclarationSpecifier>(
      (specifier) => specifier.type === "ImportSpecifier" && specifier.importKind === "type",
    )(node.specifiers));

// Ownership checks inspect module operations, never harmless strings in config.
const moduleVisitors = (
  check: (node: ESTree.Node, source: ESTree.Node) => void,
  allowTypes: boolean,
) => ({
  ImportDeclaration(node: ESTree.ImportDeclaration) {
    if (!allowTypes || !typeOnlyImport(node)) {
      check(node, node.source);
    }
  },
  ImportExpression(node: ESTree.ImportExpression) {
    check(node, node.source);
  },
  ExportNamedDeclaration(node: ESTree.ExportNamedDeclaration) {
    const onlyTypes =
      node.exportKind === "type" ||
      (node.specifiers.length > 0 &&
        Array.every<ESTree.ExportSpecifier>((specifier) => specifier.exportKind === "type")(
          node.specifiers,
        ));
    if (!allowTypes || !onlyTypes) {
      Option.match(Option.fromNullishOr(node.source), {
        onNone: Function.constVoid,
        onSome: (source) => {
          check(node, source);
        },
      });
    }
  },
  ExportAllDeclaration(node: ESTree.ExportAllDeclaration) {
    if (!allowTypes || node.exportKind !== "type") {
      check(node, node.source);
    }
  },
  TSImportType(node: ESTree.TSImportType) {
    if (!allowTypes) {
      check(node, node.source);
    }
  },
  TSImportEqualsDeclaration(node: ESTree.TSImportEqualsDeclaration) {
    if (
      (!allowTypes || node.importKind !== "type") &&
      node.moduleReference.type === "TSExternalModuleReference"
    ) {
      check(node, node.moduleReference.expression);
    }
  },
});

// Derived from DAW's owned rules at e47ecfb; this is the portable skill owner.
const RuntimeOptions = Schema.Struct({ webSourceRoots: Schema.Array(Schema.String) });

const ModuleOwner = Schema.Struct({
  module: Schema.String,
  allowedFiles: Schema.Array(Schema.String),
  allowTypes: Schema.Boolean,
});
const ModuleOwnershipOptions = Schema.Struct({ owners: Schema.Array(ModuleOwner) });
const moduleOwnership = defineRule({
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          owners: {
            type: "array",
            items: {
              type: "object",
              properties: {
                module: { type: "string", minLength: 1 },
                allowedFiles: { type: "array", items: { type: "string" } },
                allowTypes: { type: "boolean" },
              },
              required: ["module", "allowedFiles", "allowTypes"],
              additionalProperties: false,
            },
          },
        },
        required: ["owners"],
        additionalProperties: false,
      },
    ],
    messages: {
      ownership:
        "Keep {{module}} imports in their exact configured owners. Use the checked service elsewhere.",
      unknown:
        "Use a known immutable local string for dynamic imports so module ownership can be checked.",
    },
  },
  create(context) {
    const owners = Function.pipe(
      Array.head(context.options),
      Option.flatMap(Schema.decodeUnknownOption(ModuleOwnershipOptions)),
      Option.map((options) => options.owners),
      Option.getOrElse(() => []),
    );
    const check = (node: ESTree.Node, source: ESTree.Node, onlyTypes: boolean) => {
      Option.match(moduleAddress(context, source), {
        onNone: () => {
          context.report({ node, messageId: "unknown" });
        },
        onSome: (address) => {
          Array.forEach(owners, (owner) => {
            if (
              (address === owner.module || address.startsWith(`${owner.module}/`)) &&
              !(onlyTypes && owner.allowTypes) &&
              !Array.some(owner.allowedFiles, (file) =>
                exactOwnedFile(context.filename, context.cwd, file),
              )
            )
              context.report({ node, messageId: "ownership", data: { module: owner.module } });
          });
        },
      });
    };
    return {
      ...moduleVisitors((node, source) => check(node, source, false), true),
      ImportDeclaration(node) {
        check(node, node.source, typeOnlyImport(node));
      },
      ExportNamedDeclaration(node) {
        const onlyTypes =
          node.exportKind === "type" ||
          (node.specifiers.length > 0 &&
            Array.every(node.specifiers, (specifier) => specifier.exportKind === "type"));
        Option.match(Option.fromNullishOr(node.source), {
          onNone: Function.constVoid,
          onSome: (source) => check(node, source, onlyTypes),
        });
      },
      ExportAllDeclaration(node) {
        check(node, node.source, node.exportKind === "type");
      },
      TSImportType(node) {
        check(node, node.source, true);
      },
      TSImportEqualsDeclaration(node) {
        if (node.moduleReference.type === "TSExternalModuleReference")
          check(node, node.moduleReference.expression, node.importKind === "type");
      },
    };
  },
});

const noUncheckedIndex = defineRule({
  meta: {
    type: "problem",
    schema: [],
    messages: {
      unchecked:
        "Use Effect Array.get or Record.get and handle the Option result. Unchecked bracket lookups are forbidden.",
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (node.computed) {
          context.report({ node, messageId: "unchecked" });
        }
      },
    };
  },
});

const noNativeAt = defineRule({
  meta: {
    type: "problem",
    schema: [],
    messages: {
      nativeAt: "Use Effect Array.get and handle its Option result instead of native .at().",
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (node.property.type === "Identifier" && node.property.name === "at") {
          context.report({ node, messageId: "nativeAt" });
        }
      },
    };
  },
});

const runtimeFileConvention = defineRule({
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: { webSourceRoots: { type: "array", items: { type: "string" } } },
        required: ["webSourceRoots"],
        additionalProperties: false,
      },
    ],
    messages: {
      runtimeFile:
        "Name web Effect runtime modules runtime.server.ts or runtime.client.ts so TanStack checks the environment boundary.",
    },
  },
  create(context) {
    const filename = context.filename.replaceAll("\\", "/");
    const roots = Function.pipe(
      Array.head(context.options),
      Option.flatMap(Schema.decodeUnknownOption(RuntimeOptions)),
      Option.map((options) => options.webSourceRoots),
      Option.getOrElse(() => ["apps/web/src"]),
    );
    return {
      Program(node) {
        if (
          Array.some(roots, (root) =>
            filename.includes(`/${root.replaceAll("\\", "/").replace(/\/$/u, "")}/`),
          ) &&
          /(?:^|\/)(?:runtime|[^/]+[.-]runtime)\.(?:ts|tsx)$/u.test(filename)
        ) {
          context.report({ node, messageId: "runtimeFile" });
        }
      },
    };
  },
});

// The Effect module, or the module export, that a local name or member path refers to.
interface EffectReference {
  readonly module: string;
  readonly name: Option.Option<string>;
}

// A top-level value import of an Effect module or of one of its exports.
interface EffectBinding {
  readonly local: string;
  readonly reference: EffectReference;
}

// Effect's error factories are called without `new` and return a class to extend.
const effectErrorFactories: readonly (readonly [module: string, name: string])[] = [
  ["effect/Schema", "TaggedError"],
  ["effect/Schema", "Error"],
  ["effect/Data", "TaggedError"],
];

// The name test used by unicorn/throw-new-error: Error, TypeError, URIError, CustomError and so on.
const errorName = /^(?:[A-Z][\da-z]*)*Error$/u;

const exportedName = (name: ESTree.ModuleExportName): string => {
  if (name.type === "Literal") {
    return name.value;
  }
  return name.name;
};

const isEffectSource = (source: string) =>
  source === "effect" ||
  source.startsWith("effect/") ||
  source === "alchemy" ||
  source.startsWith("alchemy/");

const moduleReference = (module: string): EffectReference => ({ module, name: Option.none() });

// A member of the root `effect` module is itself a module, such as `effect/Schema`. A member of any other module is an export.
const memberReference = (
  reference: EffectReference,
  property: string,
): Option.Option<EffectReference> => {
  if (Option.isSome(reference.name)) {
    return Option.none();
  }
  if (
    reference.module === "effect" ||
    reference.module === "alchemy" ||
    reference.module === "effect/reactivity" ||
    reference.module === "effect/rpc" ||
    reference.module === "effect/http" ||
    reference.module === "effect/http-api"
  ) {
    return Option.some(moduleReference(`${reference.module}/${property}`));
  }
  return Option.some({ module: reference.module, name: Option.some(property) });
};

const specifierBinding = (
  source: string,
  specifier: ESTree.ImportDeclarationSpecifier,
): Option.Option<EffectBinding> => {
  if (specifier.type === "ImportDefaultSpecifier") {
    return Option.none();
  }
  const local = specifier.local.name;
  if (specifier.type === "ImportNamespaceSpecifier") {
    return Option.some({ local, reference: moduleReference(source) });
  }
  if (specifier.importKind === "type") {
    return Option.none();
  }
  const module = moduleReference(source);
  const imported = exportedName(specifier.imported);
  return Function.pipe(
    memberReference(module, imported),
    Option.map((reference) => ({ local, reference })),
  );
};

const effectBindings = (program: ESTree.Program): readonly EffectBinding[] =>
  Function.pipe(
    program.body,
    Array.flatMap((statement) => {
      if (
        statement.type !== "ImportDeclaration" ||
        statement.importKind === "type" ||
        !isEffectSource(statement.source.value)
      ) {
        return [];
      }
      return Function.pipe(
        statement.specifiers,
        Array.flatMap((specifier) =>
          Option.toArray(specifierBinding(statement.source.value, specifier)),
        ),
      );
    }),
  );

// Follows an identifier or a chain of static member reads, such as `Effect.Schema.TaggedError`, back to its Effect import.
const resolveReference = (
  bindings: readonly EffectBinding[],
  expression: ESTree.Expression,
): Option.Option<EffectReference> => {
  if (expression.type === "Identifier") {
    return Function.pipe(
      bindings,
      Array.findFirst((binding) => binding.local === expression.name),
      Option.map((binding) => binding.reference),
    );
  }
  if (
    expression.type !== "MemberExpression" ||
    expression.computed ||
    expression.property.type !== "Identifier"
  ) {
    return Option.none();
  }
  const property = expression.property.name;
  return Function.pipe(
    resolveReference(bindings, expression.object),
    Option.flatMap((reference) => memberReference(reference, property)),
  );
};

const isExport = (reference: EffectReference, module: string, name: string) =>
  reference.module === module && Option.contains(reference.name, name);

const selfTypeName = (type: ESTree.TSType): Option.Option<string> => {
  if (type.type === "TSTypeReference" && type.typeName.type === "Identifier") {
    return Option.some(type.typeName.name);
  }
  return Option.none();
};

const literalTag = (argument: ESTree.Argument): Option.Option<string> => {
  if (argument.type === "Literal") {
    return Option.liftPredicate(argument.value, Predicate.isString);
  }
  return Option.none();
};

const missing = (name: Option.Option<string>) => Option.getOrElse(name, () => "<missing>");

// Match the installed RC factory through its actual import.
const taggedErrorName = defineRule({
  meta: {
    type: "problem",
    schema: [],
    messages: {
      mismatch:
        "Give a Schema.TaggedError class, its self type and its literal tag the same name. Found class {{className}}, self type {{selfTypeName}} and tag {{tagName}}.",
    },
  },
  create(context) {
    const check = (node: ESTree.Class) => {
      const { superClass } = node;
      if (superClass?.type !== "CallExpression") {
        return;
      }
      const factory = superClass.callee;
      if (factory.type !== "CallExpression") {
        return;
      }
      const bindings = effectBindings(context.sourceCode.ast);
      const isSchemaTaggedError = Function.pipe(
        resolveReference(bindings, factory.callee),
        Option.exists((reference) => isExport(reference, "effect/Schema", "TaggedError")),
      );
      if (!isSchemaTaggedError) {
        return;
      }
      const className = Function.pipe(
        Option.fromNullishOr(node.id),
        Option.map((id) => id.name),
      );
      const selfType = Function.pipe(
        Option.fromNullishOr(factory.typeArguments),
        Option.flatMap((typeArguments) => Array.head(typeArguments.params)),
        Option.flatMap(selfTypeName),
      );
      const tag = Function.pipe(Array.head(superClass.arguments), Option.flatMap(literalTag));
      const agrees = Function.pipe(
        Option.all([className, selfType, tag]),
        Option.exists(([name, self, literal]) => name === self && name === literal),
      );
      if (!agrees) {
        context.report({
          node,
          messageId: "mismatch",
          data: {
            className: missing(className),
            selfTypeName: missing(selfType),
            tagName: missing(tag),
          },
        });
      }
    };
    return { ClassDeclaration: check, ClassExpression: check };
  },
});

const calleeName = (callee: ESTree.Expression): Option.Option<string> => {
  if (callee.type === "Identifier") {
    return Option.some(callee.name);
  }
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return Option.some(callee.property.name);
  }
  return Option.none();
};

const isEffectErrorFactory = (reference: EffectReference) =>
  Function.pipe(
    effectErrorFactories,
    Array.some(([module, name]) => isExport(reference, module, name)),
  );

// Replaces unicorn/throw-new-error, whose Oxlint port reports every `*Error` call without `new`, including Effect's error factories.
const errorConstructorNew = defineRule({
  meta: {
    type: "problem",
    schema: [],
    messages: {
      missingNew:
        "Construct {{name}} with `new`. Only Effect's Schema.TaggedError, Schema.Error and Data.TaggedError factories are called without it.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        // Import bindings are read only for `*Error` calls, which are rare.
        const isFactory = () => {
          const bindings = effectBindings(context.sourceCode.ast);
          return Function.pipe(
            resolveReference(bindings, node.callee),
            Option.exists(isEffectErrorFactory),
          );
        };
        Function.pipe(
          calleeName(node.callee),
          Option.filter((name) => errorName.test(name) && !isFactory()),
          Option.match({
            onNone: Function.constVoid,
            onSome: (name) => {
              context.report({ node, messageId: "missingNew", data: { name } });
            },
          }),
        );
      },
    };
  },
});

const BoundaryOptions = Schema.Struct({ allowedFiles: Schema.Array(Schema.String) });
const boundarySchema = [
  {
    type: "object",
    properties: { allowedFiles: { type: "array", items: { type: "string" } } },
    required: ["allowedFiles"],
    additionalProperties: false,
  },
];
// Paths are exact, relative to the Oxlint working directory. Never allow a whole folder.
const isBoundary = (filename: string, cwd: string, options: readonly unknown[]) =>
  Function.pipe(
    Array.head(options),
    Option.flatMap(Schema.decodeUnknownOption(BoundaryOptions)),
    Option.exists(({ allowedFiles }) =>
      Array.some(
        allowedFiles,
        (file) =>
          !file.includes("*") &&
          !file.includes("..") &&
          filename.replaceAll("\\", "/") === `${cwd.replaceAll("\\", "/")}/${file}`,
      ),
    ),
  );

const isGlobalPromise = (expression: ESTree.Expression) =>
  (expression.type === "Identifier" && expression.name === "Promise") ||
  (expression.type === "MemberExpression" &&
    expression.object.type === "Identifier" &&
    expression.object.name === "globalThis" &&
    Option.contains(calleeName(expression), "Promise"));

const propertyName = (key: ESTree.Node): Option.Option<string> => {
  if (key.type === "Identifier") return Option.some(key.name);
  if (key.type === "Literal" && Predicate.isString(key.value)) return Option.some(key.value);
  return Option.none();
};

// Promise restrictions follow real imports, their aliases and local const
// aliases. Looking up the nearest declaration also avoids shadowing mistakes.
// These operations return a Layer when called in their data-first form.
const layerConstructors: readonly (readonly [name: string, arguments: number])[] = [
  ["fromBuild", 1],
  ["fromBuildMemo", 1],
  ["succeed", 2],
  ["sync", 2],
  ["effect", 2],
  ["mock", 2],
  ["succeedContext", 1],
  ["syncContext", 1],
  ["effectContext", 1],
  ["effectDiscard", 1],
  ["suspend", 1],
  ["unwrap", 1],
  ["mergeAll", 1],
  ["merge", 2],
  ["provide", 2],
  ["provideMerge", 2],
  ["fresh", 1],
  ["catchTag", 3],
  ["catchCause", 2],
  ["flatMap", 2],
  ["tap", 2],
  ["tapError", 2],
  ["tapCause", 2],
  ["orDie", 1],
  ["updateService", 3],
  ["span", 1],
  ["parentSpan", 1],
  ["withParentSpan", 2],
];
const layerTransforms: readonly string[] = [
  "provide",
  "provideMerge",
  "merge",
  "fresh",
  "catchTag",
  "catchCause",
  "flatMap",
  "tap",
  "tapError",
  "tapCause",
  "orDie",
  "updateService",
  "withSpan",
  "withParentSpan",
  "satisfiesSuccessType",
  "satisfiesErrorType",
  "satisfiesServicesType",
];

const layerTypeReference = (
  context: Context,
  name: ESTree.Node,
): Option.Option<EffectReference> => {
  if (name.type === "TSQualifiedName") {
    return layerTypeReference(context, name.left).pipe(
      Option.flatMap((reference) => memberReference(reference, name.right.name)),
    );
  }
  if (name.type !== "Identifier") {
    return Option.none();
  }
  const scope = context.sourceCode.getScope(name);
  return scopedVariable(scope, name.name).pipe(
    Option.flatMap((variable) => Array.head(variable.defs)),
    Option.flatMap((definition) => {
      if (
        definition.type !== "ImportBinding" ||
        definition.parent?.type !== "ImportDeclaration" ||
        !isEffectSource(definition.parent.source.value)
      ) {
        return Option.none();
      }
      const source = moduleReference(definition.parent.source.value);
      if (definition.node.type === "ImportNamespaceSpecifier") {
        return Option.some(source);
      }
      if (definition.node.type === "ImportSpecifier") {
        const imported = exportedName(definition.node.imported);
        return memberReference(source, imported);
      }
      return Option.none();
    }),
  );
};

const layerType = (
  context: Context,
  type: ESTree.Node,
  visited: readonly ESTree.Node[] = [],
): boolean => {
  if (Array.contains(type)(visited)) {
    return false;
  }
  if (type.type === "TSUnionType" || type.type === "TSIntersectionType") {
    return Array.some<ESTree.Node>((member) => layerType(context, member, [...visited, type]))(
      type.types,
    );
  }
  if (type.type !== "TSTypeReference") {
    return false;
  }
  const reference = (name: ESTree.Node): boolean => {
    if (
      layerTypeReference(context, name).pipe(
        Option.exists((resolved) => isExport(resolved, "effect/Layer", "Layer")),
      )
    ) {
      return true;
    }
    if (name.type !== "Identifier") {
      return false;
    }
    const scope = context.sourceCode.getScope(name);
    return scopedVariable(scope, name.name).pipe(
      Option.flatMap((variable) => Array.head(variable.defs)),
      Option.exists((definition) => {
        if (definition.node.type === "TSTypeAliasDeclaration") {
          return layerType(context, definition.node.typeAnnotation, [...visited, type]);
        }
        return false;
      }),
    );
  };
  return reference(type.typeName);
};

const layerExpression = (
  context: Context,
  expression: ESTree.Node,
  visited: readonly ESTree.Node[] = [],
): boolean => {
  if (Array.contains(expression)(visited)) {
    return false;
  }
  const next = [...visited, expression];
  if (expression.type === "Identifier") {
    const scope = context.sourceCode.getScope(expression);
    return (
      scopedEffectReference(context, expression).pipe(
        Option.exists((reference) => isExport(reference, "effect/Layer", "empty")),
      ) ||
      scopedVariable(scope, expression.name).pipe(
        Option.flatMap(constantDeclaration),
        Option.exists(
          (declaration) =>
            (declaration.id.type === "Identifier" &&
              Option.fromNullishOr(declaration.id.typeAnnotation).pipe(
                Option.exists((annotation) => layerType(context, annotation.typeAnnotation)),
              )) ||
            Option.fromNullishOr(declaration.init).pipe(
              Option.exists((initialiser) => layerExpression(context, initialiser, next)),
            ),
        ),
      )
    );
  }
  if (expression.type === "MemberExpression") {
    return scopedEffectReference(context, expression).pipe(
      Option.exists((reference) => isExport(reference, "effect/Layer", "empty")),
    );
  }
  if (expression.type === "ConditionalExpression") {
    return (
      layerExpression(context, expression.consequent, next) ||
      layerExpression(context, expression.alternate, next)
    );
  }
  if (expression.type !== "CallExpression") {
    return false;
  }
  const called = scopedEffectReference(context, expression.callee);
  const constructor = called.pipe(
    Option.exists((reference) =>
      Array.some<readonly [string, number]>(
        ([name, count]) =>
          isExport(reference, "effect/Layer", name) && expression.arguments.length >= count,
      )(layerConstructors),
    ),
  );
  const routes = called.pipe(
    Option.exists((reference) =>
      Array.some<string>((name) => isExport(reference, "effect/http/HttpRouter", name))([
        "add",
        "addAll",
        "use",
        "cors",
      ]),
    ),
  );
  if (constructor || routes) {
    return true;
  }
  // Curried constructors: Layer.succeed(Service)(implementation).
  if (expression.callee.type === "CallExpression") {
    const first = expression.callee;
    return scopedEffectReference(context, first.callee).pipe(
      Option.exists((reference) =>
        Array.some<readonly [string, number]>(
          ([name, count]) =>
            isExport(reference, "effect/Layer", name) &&
            first.arguments.length + expression.arguments.length >= count,
        )(layerConstructors),
      ),
    );
  }
  const transforms = (arguments_: readonly ESTree.Argument[]) =>
    arguments_.length > 0 &&
    Array.every<ESTree.Argument>((argument) => {
      const calledExpression = () => {
        if (argument.type === "CallExpression") {
          return argument.callee;
        }
        return argument;
      };
      const callee = calledExpression();
      return scopedEffectReference(context, callee).pipe(
        Option.exists((reference) =>
          Array.some<string>((name) => isExport(reference, "effect/Layer", name))(layerTransforms),
        ),
      );
    })(arguments_);
  if (called.pipe(Option.exists((reference) => isExport(reference, "effect/Function", "pipe")))) {
    const tail = Array.drop(1)(expression.arguments);
    if (Array.isReadonlyArrayEmpty(tail)) {
      return Array.head(expression.arguments).pipe(
        Option.exists((argument) => layerExpression(context, argument, next)),
      );
    }
    return transforms(tail);
  }
  if (
    expression.callee.type === "MemberExpression" &&
    !expression.callee.computed &&
    expression.callee.property.type === "Identifier" &&
    expression.callee.property.name === "pipe"
  ) {
    if (Array.isReadonlyArrayEmpty(expression.arguments)) {
      return layerExpression(context, expression.callee.object, next);
    }
    return transforms(expression.arguments);
  }
  return false;
};

const returnsLayer = (context: Context, statement: ESTree.Statement): boolean => {
  if (statement.type === "ReturnStatement") {
    return Option.fromNullishOr(statement.argument).pipe(
      Option.exists((argument) => layerExpression(context, argument)),
    );
  }
  if (statement.type === "BlockStatement") {
    return Array.some<ESTree.Statement>((child) => returnsLayer(context, child))(statement.body);
  }
  if (statement.type === "IfStatement") {
    return (
      returnsLayer(context, statement.consequent) ||
      Option.fromNullishOr(statement.alternate).pipe(
        Option.exists((alternate) => returnsLayer(context, alternate)),
      )
    );
  }
  if (statement.type === "SwitchStatement") {
    return Array.some<ESTree.SwitchCase>((branch) =>
      Array.some<ESTree.Statement>((child) => returnsLayer(context, child))(branch.consequent),
    )(statement.cases);
  }
  return false;
};

const staticLayers = defineRule({
  meta: {
    type: "problem",
    schema: [],
    messages: {
      factory:
        "Declare a static Effect Layer. Supply dependencies through its Requirements type channel and replace Layers with Layer.succeed or Layer.mock in tests.",
    },
  },
  create(context) {
    const check = (node: ESTree.ArrowFunctionExpression | ESTree.Function) => {
      if (node.generator || node.async) {
        return;
      }
      // Inline composition callbacks may return a Layer to Layer.unwrap,
      // Layer.suspend, Effect.map, Atom.runtime or a matching operation.
      const compositionCall = () => {
        if (node.parent.type === "CallExpression") {
          return Option.some(node.parent);
        }
        if (
          node.parent.type === "Property" &&
          node.parent.parent.type === "ObjectExpression" &&
          node.parent.parent.parent.type === "CallExpression"
        ) {
          return Option.some(node.parent.parent.parent);
        }
        return Option.none();
      };
      if (
        compositionCall().pipe(
          Option.flatMap((call) => scopedEffectReference(context, call.callee)),
          Option.exists((reference) =>
            Array.contains(reference.module)([
              "effect/Layer",
              "effect/Effect",
              "effect/Match",
              "effect/Option",
              "effect/Result",
              "effect/Boolean",
              "effect/reactivity/Atom",
            ]),
          ),
        )
      ) {
        return;
      }
      // Native Service config accepts Layer callbacks at httpClient/protocol.
      // Curried Service construction is resolved against the imported symbol.
      if (
        node.parent.type === "Property" &&
        (Option.contains(propertyName(node.parent.key), "httpClient") ||
          Option.contains(propertyName(node.parent.key), "protocol")) &&
        compositionCall().pipe(
          Option.filter((call) => call.callee.type === "CallExpression"),
          Option.flatMap((call) =>
            call.callee.type === "CallExpression"
              ? scopedEffectReference(context, call.callee.callee)
              : Option.none(),
          ),
          Option.exists(
            (reference) =>
              (node.parent.type === "Property" &&
                Option.contains(propertyName(node.parent.key), "httpClient") &&
                isExport(reference, "effect/reactivity/AtomHttpApi", "Service")) ||
              (node.parent.type === "Property" &&
                Option.contains(propertyName(node.parent.key), "protocol") &&
                isExport(reference, "effect/reactivity/AtomRpc", "Service")),
          ),
        )
      )
        return;
      const typed = Option.fromNullishOr(node.returnType).pipe(
        Option.exists((annotation) => layerType(context, annotation.typeAnnotation)),
      );
      const returns = Option.fromNullishOr(node.body).pipe(
        Option.exists((body) => {
          if (body.type === "BlockStatement") {
            return returnsLayer(context, body);
          }
          return layerExpression(context, body);
        }),
      );
      if (typed || returns) {
        context.report({ node, messageId: "factory" });
      }
    };
    return {
      "ArrowFunctionExpression:exit": check,
      "FunctionExpression:exit": check,
      "FunctionDeclaration:exit": check,
      TSFunctionType(node) {
        if (layerType(context, node.returnType.typeAnnotation)) {
          context.report({ node, messageId: "factory" });
        }
      },
    };
  },
});

const scopedImportedReference = (
  context: Context,
  expression: ESTree.Node,
  visited: readonly ESTree.Node[] = [],
  acceptsModule: (source: string) => boolean = Function.constTrue,
): Option.Option<EffectReference> => {
  if (Array.contains(expression)(visited)) {
    return Option.none();
  }
  const next = [...visited, expression];
  if (
    expression.type === "MemberExpression" &&
    (!expression.computed || expression.property.type === "Literal")
  ) {
    return propertyName(expression.property).pipe(
      Option.flatMap((name) =>
        scopedImportedReference(context, expression.object, next, acceptsModule).pipe(
          Option.flatMap((reference) => memberReference(reference, name)),
        ),
      ),
    );
  }
  if (expression.type !== "Identifier") {
    return Option.none();
  }
  const { name } = expression;
  const scope = context.sourceCode.getScope(expression);
  return scopedVariable(scope, name).pipe(
    Option.flatMap((variable) =>
      Array.head(variable.defs).pipe(
        Option.filter(() => variable.defs.length === 1),
        Option.flatMap((definition) => {
          if (
            definition.type === "ImportBinding" &&
            definition.parent?.type === "ImportDeclaration" &&
            definition.parent.importKind !== "type" &&
            acceptsModule(definition.parent.source.value) &&
            (definition.node.type === "ImportSpecifier" ||
              definition.node.type === "ImportNamespaceSpecifier" ||
              definition.node.type === "ImportDefaultSpecifier")
          ) {
            return specifierBinding(definition.parent.source.value, definition.node).pipe(
              Option.map((binding) => binding.reference),
            );
          }
          return constantDeclaration(variable).pipe(
            Option.flatMap((declaration) =>
              Option.fromNullishOr(declaration.init).pipe(
                Option.flatMap((initialiser) => {
                  const reference = scopedImportedReference(
                    context,
                    initialiser,
                    next,
                    acceptsModule,
                  );
                  if (declaration.id.type === "Identifier") {
                    return reference;
                  }
                  if (declaration.id.type === "ObjectPattern") {
                    return Array.findFirst<ESTree.BindingProperty | ESTree.BindingRestElement>(
                      (property) =>
                        property.type === "Property" &&
                        property.value.type === "Identifier" &&
                        property.value.name === name,
                    )(declaration.id.properties).pipe(
                      Option.flatMap((property) => {
                        if (property.type === "Property") {
                          return propertyName(property.key).pipe(
                            Option.flatMap((key) =>
                              reference.pipe(
                                Option.flatMap((resolved) => memberReference(resolved, key)),
                              ),
                            ),
                          );
                        }
                        return Option.none();
                      }),
                    );
                  }
                  return Option.none();
                }),
              ),
            ),
          );
        }),
      ),
    ),
  );
};

const scopedEffectReference = (
  context: Context,
  expression: ESTree.Node,
  visited: readonly ESTree.Node[] = [],
) => scopedImportedReference(context, expression, visited);

const WebsiteOptions = Schema.Struct({
  serverRuntime: Schema.String,
  browserRuntime: Schema.String,
  registryTests: Schema.optionalKey(Schema.Array(Schema.String)),
});
const websiteRpcBoundary = defineRule({
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          serverRuntime: { type: "string" },
          browserRuntime: { type: "string" },
          registryTests: { type: "array", items: { type: "string" } },
        },
        required: ["serverRuntime", "browserRuntime"],
        additionalProperties: false,
      },
    ],
    messages: {
      remote:
        "Website loaders call the native API client directly in each environment. Do not create a TanStack server-function endpoint or a Website RPC proxy.",
      runtime:
        "Use the sole named server runtime or browser Atom runtime; native API Service clients share its factory and registry.",
      environment:
        "Use a runtime only inside TanStack's matching server/client function, or its matching environment file. Do not re-export runtime values.",
    },
  },
  create(context) {
    const options = Array.head(context.options).pipe(
      Option.flatMap(Schema.decodeUnknownOption(WebsiteOptions)),
    );
    const owner = (kind: "serverRuntime" | "browserRuntime") =>
      Option.exists(options, (value) =>
        isBoundary(context.filename, context.cwd, [
          { allowedFiles: [kind === "serverRuntime" ? value.serverRuntime : value.browserRuntime] },
        ]),
      );
    const registryTestOwner = () =>
      /\.(?:test|spec)\.tsx?$/u.test(context.filename) &&
      Option.exists(options, (value) =>
        Option.exists(Option.fromNullishOr(value.registryTests), (allowedFiles) =>
          isBoundary(context.filename, context.cwd, [{ allowedFiles }]),
        ),
      );
    const insideDeclaration = (node: ESTree.Node, name: string): boolean => {
      if (node.type === "VariableDeclarator" && node.id.type === "Identifier")
        return node.id.name === name;
      if (node.type === "FunctionDeclaration") return node.id?.name === name;
      return node.parent ? insideDeclaration(node.parent, name) : false;
    };
    const registryOwner = (node: ESTree.Node) =>
      (owner("browserRuntime") && insideDeclaration(node, "createLoaderRegistry")) ||
      registryTestOwner();
    const environmentBuilder = (node: ESTree.Node): boolean => {
      if (node.type !== "CallExpression") return false;
      if (
        Option.exists(scopedEffectReference(context, node.callee), (reference) =>
          isExport(reference, "@tanstack/react-start", "createIsomorphicFn"),
        )
      )
        return true;
      return node.callee.type === "MemberExpression" && environmentBuilder(node.callee.object);
    };
    const inEnvironment = (node: ESTree.Node, environment: "server" | "client"): boolean => {
      // Tests import the host-independent runtime definitions to exercise cleanup.
      // Constructor ownership still applies to tests; this only permits imports.
      if (
        /\.(?:test|spec)\.tsx?$/u.test(context.filename) ||
        context.filename.endsWith(`.${environment}.ts`) ||
        context.filename.endsWith(`.${environment}.tsx`)
      )
        return true;
      const parent = node.parent;
      if (!parent) return false;
      if (parent.type === "CallExpression") {
        if (
          parent.callee.type === "MemberExpression" &&
          Option.contains(propertyName(parent.callee.property), environment) &&
          environmentBuilder(parent.callee.object)
        )
          return true;
        if (
          Option.exists(scopedEffectReference(context, parent.callee), (reference) =>
            isExport(
              reference,
              "@tanstack/react-start",
              environment === "server" ? "createServerOnlyFn" : "createClientOnlyFn",
            ),
          )
        )
          return true;
      }
      return inEnvironment(parent, environment);
    };
    const declaredAs = (node: ESTree.Node, name: string) =>
      node.parent?.type === "VariableDeclarator" &&
      node.parent.id.type === "Identifier" &&
      node.parent.id.name === name;
    const prohibited = (reference: EffectReference) =>
      isExport(reference, "@tanstack/react-start", "createServerFn");
    const runtimeEnvironment = (source: string) =>
      source.endsWith("runtime.server") || source.endsWith("runtime.server.ts")
        ? Option.some<"server" | "client">("server")
        : source.endsWith("runtime.client") || source.endsWith("runtime.client.ts")
          ? Option.some<"server" | "client">("client")
          : Option.none<"server" | "client">();
    return {
      ImportDeclaration(node) {
        if (typeOnlyImport(node)) return;
        Array.forEach(node.specifiers, (specifier) => {
          if (
            Option.exists(specifierBinding(node.source.value, specifier), ({ reference }) =>
              prohibited(reference),
            )
          )
            context.report({ node: specifier, messageId: "remote" });
        });
      },
      ExportNamedDeclaration(node) {
        if (node.exportKind === "type") return;
        if (node.source) {
          if (Option.isSome(runtimeEnvironment(node.source.value)))
            context.report({ node, messageId: "environment" });
          const source = node.source.value;
          Array.forEach(node.specifiers, (specifier) => {
            if (
              specifier.exportKind !== "type" &&
              prohibited({ module: source, name: Option.some(exportedName(specifier.local)) })
            )
              context.report({ node: specifier, messageId: "remote" });
          });
        } else {
          Array.forEach(node.specifiers, (specifier) => {
            if (Option.exists(scopedEffectReference(context, specifier.local), prohibited))
              context.report({ node: specifier, messageId: "remote" });
          });
        }
      },
      ExportAllDeclaration(node) {
        if (node.exportKind === "type") return;
        if (node.source.value === "@tanstack/react-start")
          context.report({ node, messageId: "remote" });
        if (Option.isSome(runtimeEnvironment(node.source.value)))
          context.report({ node, messageId: "environment" });
      },
      CallExpression(node) {
        if (
          node.callee.type === "CallExpression" &&
          Option.exists(
            scopedEffectReference(context, node.callee.callee),
            (reference) =>
              isExport(reference, "effect/reactivity/AtomHttpApi", "Service") ||
              isExport(reference, "effect/reactivity/AtomRpc", "Service"),
          )
        ) {
          const sharedFactory = Array.some(
            node.arguments,
            (argument) =>
              argument.type === "ObjectExpression" &&
              Array.some(
                argument.properties,
                (property) =>
                  property.type === "Property" &&
                  Option.contains(propertyName(property.key), "runtime") &&
                  property.value.type === "MemberExpression" &&
                  Option.contains(propertyName(property.value.property), "factory") &&
                  property.value.object.type === "Identifier" &&
                  property.value.object.name === "browserRuntime",
              ),
          );
          if (!(owner("browserRuntime") && sharedFactory))
            context.report({ node, messageId: "runtime" });
        }
        Option.match(scopedEffectReference(context, node.callee), {
          onNone: Function.constVoid,
          onSome: (reference) => {
            if (prohibited(reference)) context.report({ node, messageId: "remote" });
            if (
              isExport(reference, "effect/ManagedRuntime", "make") &&
              !(owner("serverRuntime") && declaredAs(node, "runtime"))
            )
              context.report({ node, messageId: "runtime" });
            if (
              isExport(reference, "effect/reactivity/Atom", "runtime") &&
              !(owner("browserRuntime") && declaredAs(node, "browserRuntime"))
            )
              context.report({ node, messageId: "runtime" });
            if (
              isExport(reference, "effect/reactivity/AtomRegistry", "make") &&
              !registryOwner(node)
            )
              context.report({ node, messageId: "runtime" });
            if (isExport(reference, "effect/rpc/RpcClient", "make"))
              context.report({ node, messageId: "runtime" });
            Option.match(runtimeEnvironment(reference.module), {
              onNone: Function.constVoid,
              onSome: (environment) => {
                if (!inEnvironment(node, environment))
                  context.report({ node, messageId: "environment" });
              },
            });
            if (
              (isExport(reference, "@tanstack/react-router", "createFileRoute") ||
                isExport(reference, "@tanstack/react-start", "createServerFileRoute")) &&
              Option.exists(Array.head(node.arguments), (argument) =>
                Option.exists(moduleAddress(context, argument), (value) =>
                  /^\/rpc(?:\/|$)/u.test(value),
                ),
              )
            )
              context.report({ node, messageId: "remote" });
          },
        });
      },
      Identifier(node) {
        const read = scopedVariable(context.sourceCode.getScope(node), node.name).pipe(
          Option.exists((variable) =>
            Array.some(
              variable.references,
              (reference) => reference.identifier === node && reference.isRead(),
            ),
          ),
        );
        if (!read) return;
        if (
          Option.exists(scopedEffectReference(context, node), (reference) =>
            isExport(reference, "effect/reactivity/AtomRegistry", "make"),
          ) &&
          !registryOwner(node)
        )
          context.report({ node, messageId: "runtime" });
        Option.match(
          scopedEffectReference(context, node).pipe(
            Option.flatMap((reference) => runtimeEnvironment(reference.module)),
          ),
          {
            onNone: Function.constVoid,
            onSome: (environment) => {
              if (!inEnvironment(node, environment))
                context.report({ node, messageId: "environment" });
            },
          },
        );
      },
      MemberExpression(node) {
        if (
          Option.exists(scopedEffectReference(context, node), (reference) =>
            isExport(reference, "effect/reactivity/AtomRegistry", "make"),
          ) &&
          !registryOwner(node)
        )
          context.report({ node, messageId: "runtime" });
        if (Option.exists(scopedEffectReference(context, node), prohibited))
          context.report({ node, messageId: "remote" });
      },
    };
  },
});

const PromiseOptions = Schema.Struct({
  allowedFiles: Schema.Array(Schema.String),
  promiseOnlyFiles: Schema.optionalKey(Schema.Array(Schema.String)),
});
const promiseBoundarySchema = [
  {
    type: "object",
    properties: {
      allowedFiles: { type: "array", items: { type: "string" } },
      promiseOnlyFiles: { type: "array", items: { type: "string" } },
    },
    required: ["allowedFiles"],
    additionalProperties: false,
  },
];

const noPromiseWorkflow = defineRule({
  meta: {
    type: "problem",
    schema: promiseBoundarySchema,
    messages: {
      forbidden:
        "Use Effect for asynchronous work. Only an explicitly named host adapter may mention Promise; async, await and Promise chains remain forbidden there.",
      bridge:
        "Use a native Effect or Alchemy operation. Promise conversion belongs only in an explicitly named host or SDK adapter.",
    },
  },
  create(context) {
    const allowed = isBoundary(context.filename, context.cwd, context.options);
    const bindings = effectBindings(context.sourceCode.ast);
    const promiseOnly = Function.pipe(
      Array.head(context.options),
      Option.flatMap(Schema.decodeUnknownOption(PromiseOptions)),
      Option.exists((options) =>
        Array.some(options.promiseOnlyFiles ?? [], (file) =>
          exactOwnedFile(context.filename, context.cwd, file),
        ),
      ),
    );
    const checkBridge = (node: ESTree.Node) => {
      if (
        !allowed &&
        Option.exists(
          scopedEffectReference(context, node),
          (reference) =>
            isExport(reference, "effect/Effect", "tryPromise") ||
            (!promiseOnly && isExport(reference, "effect/Effect", "promise")),
        )
      )
        context.report({ node, messageId: "bridge" });
    };
    const report = (node: ESTree.Node) => context.report({ node, messageId: "forbidden" });
    const checkFunction = (node: ESTree.Function | ESTree.ArrowFunctionExpression) => {
      if (node.async) report(node);
    };
    return {
      ArrowFunctionExpression: checkFunction,
      FunctionExpression: checkFunction,
      FunctionDeclaration: checkFunction,
      AwaitExpression: report,
      NewExpression(node) {
        if (isGlobalPromise(node.callee)) report(node);
      },
      TSTypeReference(node) {
        if (!allowed && node.typeName.type === "Identifier" && node.typeName.name === "Promise")
          report(node);
      },
      Identifier(node) {
        const read = Function.pipe(
          scopedVariable(context.sourceCode.getScope(node), node.name),
          Option.exists((variable) =>
            Array.some(
              variable.references,
              (reference) => reference.identifier === node && reference.isRead(),
            ),
          ),
        );
        if (read) checkBridge(node);
      },
      MemberExpression: checkBridge,
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") return;
        const name = calleeName(node.callee);
        const chain = Option.exists(
          name,
          (value) => value === "then" || value === "catch" || value === "finally",
        );
        const promise = isGlobalPromise(node.callee.object);
        const effectMethod = Option.exists(
          resolveReference(bindings, node.callee),
          (reference) => reference.module === "effect/Effect",
        );
        if (
          (chain && !effectMethod) ||
          (promise && (!allowed || !Option.contains(name, "resolve")))
        )
          report(node);
      },
    };
  },
});

const noUnsafeOptionUnwrap = defineRule({
  meta: {
    type: "problem",
    schema: [],
    messages: {
      unsafe:
        "Handle Option with match, map or getOrElse. getOrThrow can turn an ordinary missing value into a defect.",
    },
  },
  create(context) {
    const check = (node: ESTree.Expression) => {
      if (
        Option.exists(resolveReference(effectBindings(context.sourceCode.ast), node), (reference) =>
          isExport(reference, "effect/Option", "getOrThrow"),
        )
      ) {
        context.report({ node, messageId: "unsafe" });
      }
    };
    return {
      MemberExpression: check,
      CallExpression(node) {
        if (node.callee.type === "Identifier") check(node.callee);
      },
    };
  },
});

const noUncheckedJson = defineRule({
  meta: {
    type: "problem",
    schema: [],
    messages: { json: "Decode JSON through an Effect Schema at the boundary." },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === "MemberExpression") {
          const name = calleeName(node.callee);
          const jsonMethod = Option.contains(name, "json");
          const globalMethod = Option.exists(
            name,
            (value) => value === "parse" || value === "stringify",
          );
          const object = node.callee.object;
          const json =
            (object.type === "Identifier" && object.name === "JSON") ||
            (object.type === "MemberExpression" &&
              object.object.type === "Identifier" &&
              object.object.name === "globalThis" &&
              Option.contains(calleeName(object), "JSON"));
          if (jsonMethod || (json && globalMethod)) context.report({ node, messageId: "json" });
        }
      },
    };
  },
});

const noRuntimeOutsideBoundary = defineRule({
  meta: {
    type: "problem",
    schema: boundarySchema,
    messages: {
      runtime:
        "Execute Effect only in an explicitly approved application or command runtime. Tests use @effect/vitest.",
    },
  },
  create(context) {
    const allowed = isBoundary(context.filename, context.cwd, context.options);
    return {
      CallExpression(node) {
        if (allowed) return;
        const name = calleeName(node.callee);
        const imported = resolveReference(effectBindings(context.sourceCode.ast), node.callee);
        const operation = Option.flatMap(imported, (reference) =>
          reference.module === "effect/Effect" ? reference.name : Option.none(),
        );
        const runs = Option.exists(
          Option.orElse(operation, () => name),
          (value) =>
            /^(?:runPromise(?:Exit)?|runSync(?:Exit)?|runFork|runCallback|runMain)$/u.test(value),
        );
        const creates = Option.exists(
          resolveReference(effectBindings(context.sourceCode.ast), node.callee),
          (reference) => isExport(reference, "effect/ManagedRuntime", "make"),
        );
        if (runs || creates) context.report({ node, messageId: "runtime" });
      },
    };
  },
});

// Recognises direct host spellings, not arbitrary local aliases or shadowed names.
const hostPath = (expression: ESTree.Expression): Option.Option<string> => {
  if (expression.type === "Identifier") return Option.some(expression.name);
  if (expression.type === "MetaProperty")
    return Option.some(`${expression.meta.name}.${expression.property.name}`);
  if (expression.type !== "MemberExpression") return Option.none();
  const property =
    expression.property.type === "Identifier" && !expression.computed
      ? Option.some(expression.property.name)
      : expression.property.type === "Literal"
        ? Option.liftPredicate(expression.property.value, Predicate.isString)
        : Option.none();
  return Function.pipe(
    Option.all([hostPath(expression.object), property]),
    Option.map(([object, name]) => `${object}.${name}`),
  );
};

const noNativeWork = defineRule({
  meta: {
    type: "problem",
    schema: [],
    messages: {
      nativeWork:
        "Use typed Effect failures, Config, Clock and Random instead of throws, try/catch or ambient host work.",
    },
  },
  create(context) {
    const report = (node: ESTree.Node) => context.report({ node, messageId: "nativeWork" });
    const clock = (expression: ESTree.Expression) =>
      Option.exists(hostPath(expression), (path) =>
        /^(?:(?:globalThis|window)\.)?Date$/u.test(path),
      );
    return {
      ThrowStatement: report,
      TryStatement: report,
      NewExpression(node) {
        // Explicit timestamp conversion is pure; acquiring the current time is not.
        if (node.arguments.length === 0 && clock(node.callee)) report(node);
      },
      CallExpression(node) {
        // Calling Date as a function reads the clock even when arguments are supplied.
        if (clock(node.callee)) report(node);
      },
      MemberExpression(node) {
        if (
          Option.exists(
            hostPath(node),
            (path) =>
              /^(?:(?:globalThis|window)\.)?(?:process\.env|Bun\.env|Date\.now|Math\.random|crypto\.(?:randomUUID|getRandomValues))$/u.test(
                path,
              ) || path === "import.meta.env",
          )
        )
          report(node);
      },
    };
  },
});

const CollectionOptions = Schema.Struct({
  allowedAssignments: Schema.OptionFromOptionalKey(
    Schema.Array(
      Schema.Struct({
        file: Schema.String,
        target: Schema.String,
      }),
    ),
  ),
  allowedMethods: Schema.OptionFromOptionalKey(
    Schema.Array(
      Schema.Struct({
        file: Schema.String,
        receiver: Schema.String,
        method: Schema.String,
      }),
    ),
  ),
});

const exactOwnedFile = (filename: string, cwd: string, file: string) =>
  !file.includes("*") &&
  !file.includes("..") &&
  !file.startsWith("/") &&
  filename.replaceAll("\\", "/") === `${cwd.replaceAll("\\", "/")}/${file}`;

// Check lexical scope as well as the import path: a shadowed namespace is not the import.
const referenceRoot = (expression: ESTree.Expression): Option.Option<string> =>
  expression.type === "Identifier"
    ? Option.some(expression.name)
    : expression.type === "MemberExpression" && !expression.computed
      ? referenceRoot(expression.object)
      : Option.none();
const importedInScope = (scope: Scope, name: string): boolean =>
  Option.match(
    Array.findFirst(scope.variables, (variable) => variable.name === name),
    {
      onSome: (variable) =>
        Array.some(variable.defs, (definition) => definition.type === "ImportBinding"),
      onNone: () =>
        Option.match(Option.fromNullishOr(scope.upper), {
          onNone: () => false,
          onSome: (upper) => importedInScope(upper, name),
        }),
    },
  );

const collectionMethods: ReadonlyArray<string> = [
  "map",
  "flatMap",
  "filter",
  "reduce",
  "reduceRight",
  "find",
  "findLast",
  "findIndex",
  "findLastIndex",
  "some",
  "every",
  "forEach",
  "sort",
  "toSorted",
  "reverse",
  "toReversed",
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "fill",
  "copyWithin",
  "beginMutation",
  "endMutation",
  "mutate",
];
const mutationMethods: ReadonlyArray<string> = ["beginMutation", "endMutation", "mutate"];

const noImperativeCollections = defineRule({
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          allowedAssignments: {
            type: "array",
            items: {
              type: "object",
              properties: { file: { type: "string" }, target: { type: "string" } },
              required: ["file", "target"],
              additionalProperties: false,
            },
          },
          allowedMethods: {
            type: "array",
            items: {
              type: "object",
              properties: {
                file: { type: "string" },
                receiver: { type: "string" },
                method: { type: "string" },
              },
              required: ["file", "receiver", "method"],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      traversal:
        "Use Effect Array folds/unfolds, a bounded Effect.forEach or an owned Stream instead of a loop.",
      mutable:
        "Use const and immutable Effect values. Ref owns genuine changing state with a pure immutable update.",
      collection:
        "Use immutable Effect collection functions instead of .{{method}}. Transient/mutable modes are forbidden.",
      matching:
        "Use exhaustive Match for closed alternatives, or Option/Result matching, instead of switch or manual _tag comparisons.",
    },
  },
  create(context) {
    const bindings = effectBindings(context.sourceCode.ast);
    const options = Function.pipe(
      Array.head(context.options),
      Option.flatMap(Schema.decodeUnknownOption(CollectionOptions)),
    );
    const traversal = (node: ESTree.Node) => context.report({ node, messageId: "traversal" });
    const mutable = (node: ESTree.Node) => context.report({ node, messageId: "mutable" });
    return {
      ForStatement: traversal,
      ForOfStatement: traversal,
      ForInStatement: traversal,
      WhileStatement: traversal,
      DoWhileStatement: traversal,
      VariableDeclaration(node) {
        if (node.kind !== "const") mutable(node);
      },
      UpdateExpression: mutable,
      AssignmentExpression(node) {
        const allowed = Option.exists(options, (value) =>
          Option.exists(value.allowedAssignments, (entries) =>
            Array.some(
              entries,
              (entry) =>
                exactOwnedFile(context.filename, context.cwd, entry.file) &&
                Option.contains(
                  node.left.type === "Identifier" || node.left.type === "MemberExpression"
                    ? hostPath(node.left)
                    : Option.none(),
                  entry.target,
                ),
            ),
          ),
        );
        if (!allowed) mutable(node);
      },
      MemberExpression(node) {
        if (node.computed || node.property.type !== "Identifier") return;
        const method = node.property.name;
        const nativeArray = Option.exists(
          hostPath(node.object),
          (path) => path === "Array" || path === "globalThis.Array",
        );
        if (
          !Array.contains(collectionMethods, method) &&
          !(nativeArray && Array.contains(["from", "of", "isArray"], method))
        )
          return;
        // Resolve imported functional operations, including aliases and root modules.
        // A namespace's transient mutation functions remain forbidden.
        const functional =
          Option.exists(referenceRoot(node), (root) =>
            importedInScope(context.sourceCode.getScope(node), root),
          ) &&
          Option.exists(
            resolveReference(bindings, node),
            (reference) =>
              !Array.contains(mutationMethods, method) &&
              (reference.module.startsWith("effect/") ||
                reference.module === "alchemy/Output" ||
                (reference.module === "alchemy/Namespace" && method === "push")),
          );
        const allowed = Option.exists(options, (value) =>
          Option.exists(value.allowedMethods, (entries) =>
            Array.some(
              entries,
              (entry) =>
                exactOwnedFile(context.filename, context.cwd, entry.file) &&
                entry.method === method &&
                Option.contains(hostPath(node.object), entry.receiver),
            ),
          ),
        );
        if (!functional && !allowed)
          context.report({ node, messageId: "collection", data: { method } });
      },
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          Option.exists(
            resolveReference(bindings, node.callee),
            (reference) =>
              reference.module.startsWith("effect/") &&
              Option.exists(reference.name, (name) => Array.contains(mutationMethods, name)),
          )
        )
          context.report({ node, messageId: "collection", data: { method: node.callee.name } });
      },
      UnaryExpression(node) {
        if (node.operator === "delete") mutable(node);
      },
      NewExpression(node) {
        if (
          Option.exists(
            hostPath(node.callee),
            (path) => path === "Array" || path === "globalThis.Array",
          )
        )
          context.report({ node, messageId: "collection", data: { method: "Array constructor" } });
      },
      SwitchStatement(node) {
        context.report({ node, messageId: "matching" });
      },
      BinaryExpression(node) {
        if (
          Array.contains(["===", "!==", "==", "!="], node.operator) &&
          Array.some(
            [node.left, node.right],
            (side) =>
              side.type === "MemberExpression" &&
              side.property.type === "Identifier" &&
              side.property.name === "_tag",
          )
        )
          context.report({ node, messageId: "matching" });
      },
    };
  },
});

// Computed identifiers are variable reads, not literal property names.
const staticPropertyName = (key: ESTree.Node, computed: boolean): Option.Option<string> =>
  computed && key.type !== "Literal" ? Option.none() : propertyName(key);

const LoaderRequestOptions = Schema.Struct({
  loaderFiles: Schema.Array(Schema.String),
  clientServices: Schema.optionalKey(
    Schema.Array(Schema.Struct({ module: Schema.String, name: Schema.String })),
  ),
});

const routeFactory = (context: Context, expression: ESTree.Node): boolean => {
  if (expression.type !== "CallExpression") return false;
  return (
    Option.exists(scopedEffectReference(context, expression.callee), (reference) =>
      Array.some<string>((name) => isExport(reference, "@tanstack/react-router", name))([
        "createFileRoute",
        "createRoute",
        "createRootRoute",
        "createRootRouteWithContext",
      ]),
    ) || routeFactory(context, expression.callee)
  );
};

const routeLoaderProperty = (context: Context, node: ESTree.Node): boolean =>
  node.type === "Property" &&
  Option.contains(staticPropertyName(node.key, node.computed), "loader") &&
  node.parent?.type === "ObjectExpression" &&
  node.parent.parent?.type === "CallExpression" &&
  routeFactory(context, node.parent.parent);

const insideRouteLoader = (context: Context, node: ESTree.Node): boolean => {
  if (routeLoaderProperty(context, node)) return true;
  if (
    (node.type === "VariableDeclarator" && node.id.type === "Identifier") ||
    (node.type === "FunctionDeclaration" && node.id)
  ) {
    const id = node.id;
    if (id?.type === "Identifier") {
      const loader = scopedVariable(context.sourceCode.getScope(id), id.name).pipe(
        Option.exists((variable) =>
          Array.some<Variable["references"][number]>((reference) =>
            Option.fromNullishOr(reference.identifier.parent).pipe(
              Option.exists((parent) => routeLoaderProperty(context, parent)),
            ),
          )(variable.references),
        ),
      );
      if (loader) return true;
    }
  }
  return node.parent ? insideRouteLoader(context, node.parent) : false;
};

const noLoaderRequestState = defineRule({
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          loaderFiles: { type: "array", items: { type: "string" } },
          clientServices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                module: { type: "string" },
                name: { type: "string" },
              },
              required: ["module", "name"],
              additionalProperties: false,
            },
          },
        },
        required: ["loaderFiles"],
        additionalProperties: false,
      },
    ],
    messages: {
      state:
        "TanStack owns route loading and freshness. Call the checked client directly; keep request Atoms and result caches with component-owned reads.",
    },
  },
  create(context) {
    const options = Array.head(context.options).pipe(
      Option.flatMap(Schema.decodeUnknownOption(LoaderRequestOptions)),
    );
    const loaderFile = Option.exists(options, ({ loaderFiles }) =>
      isBoundary(context.filename, context.cwd, [{ allowedFiles: loaderFiles }]),
    );
    const queryFactory = (
      expression: ESTree.Node,
      visited: readonly ESTree.Node[] = [],
    ): boolean => {
      if (Array.contains(expression)(visited)) return false;
      if (
        expression.type === "MemberExpression" &&
        Option.contains(staticPropertyName(expression.property, expression.computed), "query")
      ) {
        return Option.exists(scopedEffectReference(context, expression.object), (reference) =>
          Option.exists(options, ({ clientServices }) =>
            Array.some<{ readonly module: string; readonly name: string }>((service) =>
              isExport(reference, service.module, service.name),
            )(clientServices ?? []),
          ),
        );
      }
      if (expression.type !== "Identifier") return false;
      return scopedVariable(context.sourceCode.getScope(expression), expression.name).pipe(
        Option.flatMap(constantDeclaration),
        Option.flatMap((declaration) => Option.fromNullishOr(declaration.init)),
        Option.exists((value) => queryFactory(value, [...visited, expression])),
      );
    };
    const queryAtom = (expression: ESTree.Node, visited: readonly ESTree.Node[] = []): boolean => {
      if (Array.contains(expression)(visited)) return false;
      if (expression.type === "CallExpression") return queryFactory(expression.callee);
      if (expression.type !== "Identifier") return false;
      return scopedVariable(context.sourceCode.getScope(expression), expression.name).pipe(
        Option.flatMap(constantDeclaration),
        Option.flatMap((declaration) => Option.fromNullishOr(declaration.init)),
        Option.exists((value) => queryAtom(value, [...visited, expression])),
      );
    };
    return {
      CallExpression(node) {
        if (!loaderFile && !insideRouteLoader(context, node)) return;
        const ownsState = Option.exists(
          scopedEffectReference(context, node.callee),
          (reference) =>
            Array.some<string>((name) => isExport(reference, "effect/reactivity/Atom", name))([
              "make",
              "family",
              "fn",
              "runtime",
            ]) ||
            Array.some<string>((name) => isExport(reference, "effect/Effect", name))([
              "cached",
              "cachedWithTTL",
              "cachedInvalidateWithTTL",
            ]) ||
            Array.some<string>((name) => isExport(reference, "effect/Cache", name))([
              "make",
              "makeWith",
            ]),
        );
        const readsQuery = Option.exists(
          scopedEffectReference(context, node.callee),
          (reference) =>
            isExport(reference, "effect/reactivity/Atom", "getResult") &&
            Array.head(node.arguments).pipe(Option.exists((argument) => queryAtom(argument))),
        );
        if (ownsState || readsQuery || queryFactory(node.callee))
          context.report({ node, messageId: "state" });
      },
    };
  },
});

const nativeHttpClientMaker = (context: Context, expression: ESTree.Node): boolean =>
  expression.type === "CallExpression" &&
  Option.exists(
    scopedEffectReference(context, expression.callee),
    (reference) =>
      isExport(reference, "effect/http-api/HttpApiClient", "make") ||
      isExport(reference, "effect/http-api/HttpApiClient", "makeWith"),
  );

const acquiredHttpClient = (
  context: Context,
  expression: ESTree.Node,
  visited: readonly ESTree.Node[] = [],
): boolean => {
  if (Array.contains(expression)(visited)) return false;
  if (expression.type === "MemberExpression")
    return acquiredHttpClient(context, expression.object, [...visited, expression]);
  if (expression.type !== "Identifier") return false;
  return scopedVariable(context.sourceCode.getScope(expression), expression.name).pipe(
    Option.flatMap(constantDeclaration),
    Option.flatMap((declaration) => Option.fromNullishOr(declaration.init)),
    Option.exists((value) =>
      value.type === "YieldExpression" && value.argument
        ? nativeHttpClientMaker(context, value.argument)
        : acquiredHttpClient(context, value, [...visited, expression]),
    ),
  );
};

// A direct method copy or a callback that only forwards arguments adds no policy.
// A timeout, validation, mapping, named failure or other composition is not bare.
const bareHttpForwarder = (context: Context, expression: ESTree.Node): boolean => {
  if (expression.type === "MemberExpression") return acquiredHttpClient(context, expression);
  if (expression.type === "ArrowFunctionExpression" || expression.type === "FunctionExpression") {
    const selectedBody = (body: ESTree.Node): Option.Option<ESTree.Node> => {
      if (body.type === "YieldExpression") return Option.fromNullishOr(body.argument);
      if (body.type !== "BlockStatement") return Option.some(body);
      return Array.head(body.body).pipe(
        Option.filter(() => body.body.length === 1),
        Option.flatMap((statement) =>
          statement.type === "ReturnStatement"
            ? Option.fromNullishOr(statement.argument).pipe(Option.flatMap(selectedBody))
            : Option.none(),
        ),
      );
    };
    return Option.fromNullishOr(expression.body).pipe(
      Option.flatMap(selectedBody),
      Option.exists(
        (body) =>
          body.type === "CallExpression" &&
          body.callee.type === "MemberExpression" &&
          acquiredHttpClient(context, body.callee) &&
          // Fixed selection and argument conversion can be genuine feature policy.
          Array.every<ESTree.Argument>(
            (argument) =>
              (argument.type === "ObjectExpression" && argument.properties.length === 0) ||
              (argument.type === "Identifier" &&
                Array.some<ESTree.ArrowFunctionExpression["params"][number]>(
                  (parameter) =>
                    parameter.type === "Identifier" && parameter.name === argument.name,
                )(expression.params)),
          )(body.arguments),
      ),
    );
  }
  if (expression.type === "YieldExpression" && expression.argument)
    return bareHttpForwarder(context, expression.argument);
  if (expression.type !== "CallExpression") return false;
  if (
    Option.exists(
      scopedEffectReference(context, expression.callee),
      (reference) =>
        isExport(reference, "effect/Effect", "fn") ||
        isExport(reference, "effect/Effect", "fnUntraced"),
    )
  )
    return (
      expression.arguments.length === 1 &&
      Array.head(expression.arguments).pipe(
        Option.exists((callback) => bareHttpForwarder(context, callback)),
      )
    );
  if (
    expression.callee.type === "CallExpression" &&
    Option.exists(
      scopedEffectReference(context, expression.callee.callee),
      (reference) =>
        isExport(reference, "effect/Effect", "fn") ||
        isExport(reference, "effect/Effect", "fnUntraced"),
    )
  )
    return (
      expression.arguments.length === 1 &&
      Array.head(expression.arguments).pipe(
        Option.exists((callback) => bareHttpForwarder(context, callback)),
      )
    );
  return (
    expression.callee.type === "MemberExpression" && acquiredHttpClient(context, expression.callee)
  );
};

const noNativeClientReplica = defineRule({
  meta: {
    type: "problem",
    schema: [],
    messages: {
      replica:
        "Use the generated HttpApiClient operations directly. A second service that only copies or forwards those methods adds no policy.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          !Option.contains(staticPropertyName(node.callee.property, node.callee.computed), "of")
        )
          return;
        const implementation = Array.head(node.arguments);
        if (
          !Option.exists(
            implementation,
            (value) =>
              value.type === "ObjectExpression" &&
              value.properties.length > 0 &&
              Array.every<ESTree.ObjectPropertyKind>(
                (property) =>
                  property.type === "Property" && bareHttpForwarder(context, property.value),
              )(value.properties),
          )
        )
          return;
        // Only an actual Layer.effect service construction owns this restriction.
        const layerOwner = (parent: ESTree.Node): boolean => {
          if (
            parent.type === "CallExpression" &&
            Option.exists(scopedEffectReference(context, parent.callee), (reference) =>
              isExport(reference, "effect/Layer", "effect"),
            )
          ) {
            return Array.head(parent.arguments).pipe(
              Option.exists(
                (tag) =>
                  node.callee.type === "MemberExpression" &&
                  tag.type === "Identifier" &&
                  node.callee.object.type === "Identifier" &&
                  Option.all([
                    scopedVariable(context.sourceCode.getScope(tag), tag.name),
                    scopedVariable(
                      context.sourceCode.getScope(node.callee.object),
                      node.callee.object.name,
                    ),
                  ]).pipe(Option.exists(([outer, inner]) => outer === inner)),
              ),
            );
          }
          return parent.parent ? layerOwner(parent.parent) : false;
        };
        if (layerOwner(node)) context.report({ node, messageId: "replica" });
      },
    };
  },
});

// Resolve relative import addresses without evaluating code or trusting a name.
const relativeModule = (filename: string, address: string): string => {
  if (!address.startsWith(".")) {
    return address;
  }
  const directory = filename.replaceAll("\\", "/").replace(/\/[^/]+$/u, "");
  return Function.pipe(
    `${directory}/${address}`.split("/"),
    Array.reduce<readonly string[], string>([], (parts, part) => {
      if (part === "." || part === "") {
        return parts;
      }
      if (part === "..") {
        return Array.dropRight(parts, 1);
      }
      return [...parts, part];
    }),
    Array.join("/"),
  );
};

const CheckedPageOptions = Schema.Struct({
  checkedHelper: Schema.Struct({ module: Schema.String, export: Schema.String }),
  responseSchema: Schema.Struct({ module: Schema.String, export: Schema.String }),
});
type CheckedPageOptions = typeof CheckedPageOptions.Type;

const requestPageCall = (
  context: Context,
  node: ESTree.Node,
  options: CheckedPageOptions,
): boolean =>
  node.type === "CallExpression" &&
  scopedImportedReference(context, node.callee, [], Function.constTrue).pipe(
    Option.exists(
      (reference) =>
        Option.contains(reference.name, options.checkedHelper.export) &&
        (relativeModule(context.filename, reference.module)
          .replace(/\.tsx?$/u, "")
          .endsWith(`/${options.checkedHelper.module}`) ||
          reference.module === options.checkedHelper.module),
    ),
  );

const checkedPageEffect = (
  context: Context,
  node: ESTree.Node,
  options: CheckedPageOptions,
  visited: readonly ESTree.Node[] = [],
): Option.Option<ESTree.CallExpression> => {
  if (Array.contains(node)(visited)) {
    return Option.none();
  }
  const next = [...visited, node];
  if (node.type === "CallExpression" && requestPageCall(context, node, options)) {
    return Option.some(node);
  }
  if (node.type === "Identifier") {
    return scopedVariable(context.sourceCode.getScope(node), node.name).pipe(
      Option.flatMap(constantDeclaration),
      Option.filter((declaration) => declaration.id.type === "Identifier"),
      Option.flatMap((declaration) => Option.fromNullishOr(declaration.init)),
      Option.flatMap((initialiser) => checkedPageEffect(context, initialiser, options, next)),
    );
  }
  if (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    Option.contains(staticPropertyName(node.callee.property, node.callee.computed), "pipe") &&
    Array.every<ESTree.Argument>(
      (argument) =>
        argument.type === "CallExpression" &&
        scopedEffectReference(context, argument.callee).pipe(
          Option.exists((reference) =>
            Array.some<string>((name) => isExport(reference, "effect/Effect", name))([
              "timeout",
              "filterOrFail",
              "mapError",
              "tap",
              "withSpan",
            ]),
          ),
        ),
    )(node.arguments)
  ) {
    return checkedPageEffect(context, node.callee.object, options, next);
  }
  return Option.none();
};

const checkedPageValue = (
  context: Context,
  node: ESTree.Node,
  options: CheckedPageOptions,
  visited: readonly ESTree.Node[] = [],
): Option.Option<ESTree.CallExpression> => {
  if (Array.contains(node)(visited) || node.type !== "Identifier") {
    return Option.none();
  }
  const next = [...visited, node];
  return scopedVariable(context.sourceCode.getScope(node), node.name).pipe(
    Option.flatMap((variable) => {
      const constant = constantDeclaration(variable).pipe(
        Option.filter((declaration) => declaration.id.type === "Identifier"),
        Option.flatMap((declaration) => Option.fromNullishOr(declaration.init)),
        Option.flatMap((initialiser) => {
          if (initialiser.type === "YieldExpression") {
            return Option.fromNullishOr(initialiser.argument).pipe(
              Option.flatMap((effect) => checkedPageEffect(context, effect, options)),
            );
          }
          return checkedPageValue(context, initialiser, options, next);
        }),
      );
      const callback = variable.scope.block;
      if (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression") {
        return constant;
      }
      const call = callback.parent;
      if (
        call.type !== "CallExpression" ||
        !Option.all([Array.head(callback.params), Array.head(variable.identifiers)]).pipe(
          Option.exists(([parameter, identifier]) => parameter === identifier),
        ) ||
        !scopedEffectReference(context, call.callee).pipe(
          Option.exists((reference) =>
            Array.some<string>((name) => isExport(reference, "effect/Effect", name))([
              "map",
              "flatMap",
              "tap",
              "filterOrFail",
            ]),
          ),
        )
      ) {
        return constant;
      }
      if (call.arguments.length >= 2) {
        return Array.head(call.arguments).pipe(
          Option.flatMap((effect) => checkedPageEffect(context, effect, options)),
          Option.orElse(() => constant),
        );
      }
      const pipe = call.parent;
      if (
        pipe.type === "CallExpression" &&
        pipe.callee.type === "MemberExpression" &&
        Option.contains(propertyName(pipe.callee.property), "pipe")
      ) {
        return checkedPageEffect(context, pipe.callee.object, options).pipe(
          Option.orElse(() => constant),
        );
      }
      return constant;
    }),
  );
};

const literalPageFormat = (call: ESTree.CallExpression): boolean =>
  Array.head(call.arguments).pipe(
    Option.filter((argument) => argument.type === "ObjectExpression"),
    Option.flatMap((argument) => {
      if (argument.type !== "ObjectExpression") {
        return Option.none();
      }
      return Array.findFirst<ESTree.ObjectPropertyKind>(
        (property) =>
          property.type === "Property" &&
          Option.contains(staticPropertyName(property.key, property.computed), "input"),
      )(argument.properties);
    }),
    Option.exists(
      (input) =>
        input.type === "Property" &&
        input.value.type === "ObjectExpression" &&
        Array.some<ESTree.ObjectPropertyKind>(
          (property) =>
            property.type === "Property" &&
            Option.contains(staticPropertyName(property.key, property.computed), "format") &&
            property.value.type === "Literal" &&
            Predicate.isString(property.value.value),
        )(input.value.properties),
    ),
  );

const checkedPageResponse = defineRule({
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        additionalProperties: false,
        required: ["checkedHelper", "responseSchema"],
        properties: {
          checkedHelper: {
            type: "object",
            additionalProperties: false,
            required: ["module", "export"],
            properties: {
              module: { type: "string", minLength: 1 },
              export: { type: "string", minLength: 1 },
            },
          },
          responseSchema: {
            type: "object",
            additionalProperties: false,
            required: ["module", "export"],
            properties: {
              module: { type: "string", minLength: 1 },
              export: { type: "string", minLength: 1 },
            },
          },
        },
      },
    ],
    messages: {
      redundant:
        "The configured helper already checks the reply and its requested format. Use its checked value; keep only feature checks such as page path, title or course identity.",
    },
  },
  create(context) {
    const options = Array.head(context.options).pipe(
      Option.flatMap(Schema.decodeUnknownOption(CheckedPageOptions)),
    );
    if (Option.isNone(options)) {
      return {};
    }
    const settings = options.value;
    return {
      BinaryExpression(node) {
        if (!Array.contains(node.operator)(["===", "!==", "==", "!="])) {
          return;
        }
        if (
          Array.some<ESTree.Node>(
            (value) =>
              value.type === "MemberExpression" &&
              Option.contains(staticPropertyName(value.property, value.computed), "format") &&
              checkedPageValue(context, value.object, settings).pipe(
                Option.exists(literalPageFormat),
              ),
          )([node.left, node.right])
        ) {
          context.report({ node, messageId: "redundant" });
        }
      },
      CallExpression(node) {
        if (
          node.callee.type !== "CallExpression" ||
          !scopedEffectReference(context, node.callee.callee).pipe(
            Option.exists(
              (reference) =>
                reference.module === "effect/Schema" &&
                reference.name.pipe(Option.exists((name) => name.startsWith("decode"))),
            ),
          ) ||
          !Array.head(node.callee.arguments).pipe(
            Option.flatMap((schema) =>
              scopedImportedReference(context, schema, [], Function.constTrue),
            ),
            Option.exists((reference) =>
              isExport(reference, settings.responseSchema.module, settings.responseSchema.export),
            ),
          ) ||
          !Array.head(node.arguments).pipe(
            Option.flatMap((value) => checkedPageValue(context, value, settings)),
            Option.isSome,
          )
        ) {
          return;
        }
        context.report({ node, messageId: "redundant" });
      },
    };
  },
});

const unboundGlobal = (context: Context, node: ESTree.Node, name: string): boolean =>
  node.type === "Identifier" &&
  node.name === name &&
  scopedVariable(context.sourceCode.getScope(node), name).pipe(
    Option.match({ onNone: Function.constTrue, onSome: (variable) => variable.defs.length === 0 }),
  );

const globalObjectRead = (
  context: Context,
  node: ESTree.Node,
  visited: readonly ESTree.Node[] = [],
): boolean => {
  if (Array.contains(node)(visited)) {
    return false;
  }
  if (unboundGlobal(context, node, "globalThis")) {
    return true;
  }
  if (node.type !== "Identifier") {
    return false;
  }
  return scopedVariable(context.sourceCode.getScope(node), node.name).pipe(
    Option.flatMap(constantDeclaration),
    Option.filter((declaration) => declaration.id.type === "Identifier"),
    Option.flatMap((declaration) => Option.fromNullishOr(declaration.init)),
    Option.exists((initialiser) => globalObjectRead(context, initialiser, [...visited, node])),
  );
};

const globalCacheRead = (
  context: Context,
  node: ESTree.Node,
  visited: readonly ESTree.Node[] = [],
): boolean => {
  if (Array.contains(node)(visited)) {
    return false;
  }
  if (unboundGlobal(context, node, "caches")) {
    return true;
  }
  if (node.type === "MemberExpression") {
    return (
      (globalObjectRead(context, node.object) &&
        Option.contains(staticPropertyName(node.property, node.computed), "caches")) ||
      globalCacheRead(context, node.object, [...visited, node])
    );
  }
  if (node.type !== "Identifier") {
    return false;
  }
  return scopedVariable(context.sourceCode.getScope(node), node.name).pipe(
    Option.flatMap(constantDeclaration),
    Option.exists((declaration) => {
      const initialiser = Option.fromNullishOr(declaration.init);
      if (declaration.id.type === "ObjectPattern") {
        const cacheProperty = Array.some<ESTree.BindingProperty | ESTree.BindingRestElement>(
          (property) =>
            property.type === "Property" &&
            property.value.type === "Identifier" &&
            property.value.name === node.name &&
            Option.contains(staticPropertyName(property.key, property.computed), "caches"),
        )(declaration.id.properties);
        if (
          cacheProperty &&
          initialiser.pipe(Option.exists((value) => globalObjectRead(context, value)))
        ) {
          return true;
        }
      }
      return initialiser.pipe(
        Option.exists((value) => globalCacheRead(context, value, [...visited, node])),
      );
    }),
  );
};

const nativeCloudflareCache = defineRule({
  meta: {
    type: "problem",
    schema: [],
    messages: {
      native:
        "Use native Alchemy Worker/Website caching. Do not add a custom runtime using the global Cache API.",
    },
  },
  create(context) {
    return {
      Identifier(node) {
        const variable = scopedVariable(context.sourceCode.getScope(node), node.name);
        const read = variable.pipe(
          Option.match({
            onNone: () =>
              Array.some<Scope["through"][number]>(
                (reference) => reference.identifier === node && reference.isRead(),
              )(context.sourceCode.getScope(node).through),
            onSome: (binding) =>
              Array.some<Variable["references"][number]>(
                (reference) => reference.identifier === node && reference.isRead(),
              )(binding.references),
          }),
        );
        if (read && globalCacheRead(context, node)) {
          context.report({ node, messageId: "native" });
        }
      },
      MemberExpression(node) {
        if (
          globalObjectRead(context, node.object) &&
          Option.contains(staticPropertyName(node.property, node.computed), "caches")
        ) {
          context.report({ node, messageId: "native" });
        }
      },
    };
  },
});

const localObject = (
  context: Context,
  node: ESTree.Node,
  visited: readonly ESTree.Node[] = [],
): Option.Option<ESTree.ObjectExpression> => {
  if (Array.contains(node)(visited)) {
    return Option.none();
  }
  if (node.type === "ObjectExpression") {
    return Option.some(node);
  }
  if (node.type !== "Identifier") {
    return Option.none();
  }
  return scopedVariable(context.sourceCode.getScope(node), node.name).pipe(
    Option.flatMap(constantDeclaration),
    Option.filter((declaration) => declaration.id.type === "Identifier"),
    Option.flatMap((declaration) => Option.fromNullishOr(declaration.init)),
    Option.flatMap((initialiser) => localObject(context, initialiser, [...visited, node])),
  );
};

const objectField = (object: ESTree.ObjectExpression, name: string): Option.Option<ESTree.Node> =>
  Array.findFirst<ESTree.ObjectPropertyKind>(
    (property) =>
      property.type === "Property" &&
      Option.contains(staticPropertyName(property.key, property.computed), name),
  )(object.properties).pipe(
    Option.flatMap((property) => {
      if (property.type === "Property") {
        return Option.some(property.value);
      }
      return Option.none();
    }),
  );

const websiteDataProxy = defineRule({
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        additionalProperties: false,
        required: ["websiteDirectory", "publicApiPaths"],
        properties: {
          websiteDirectory: { type: "string", minLength: 1 },
          publicApiPaths: { type: "array", minItems: 1, items: { type: "string", pattern: "^/" } },
        },
      },
    ],
    messages: {
      direct:
        "Browser reads call the API directly. Do not add a Website proxy at the configured public API paths; use native TanStack loaders for HTML.",
    },
  },
  create(context) {
    const options = Array.head(context.options).pipe(
      Option.flatMap(
        Schema.decodeUnknownOption(
          Schema.Struct({
            websiteDirectory: Schema.String,
            publicApiPaths: Schema.Array(Schema.String),
          }),
        ),
      ),
    );
    if (
      Option.isNone(options) ||
      !context.filename.replaceAll("\\", "/").includes(`/${options.value.websiteDirectory}/`)
    ) {
      return {};
    }
    return {
      CallExpression(node) {
        const settings = Array.head(node.arguments).pipe(
          Option.flatMap((argument) => localObject(context, argument)),
        );
        const path = () => {
          if (
            node.callee.type === "CallExpression" &&
            scopedImportedReference(context, node.callee.callee, [], Function.constTrue).pipe(
              Option.exists((reference) =>
                isExport(reference, "@tanstack/react-router", "createFileRoute"),
              ),
            )
          ) {
            return Array.head(node.callee.arguments).pipe(
              Option.flatMap((argument) => moduleAddress(context, argument)),
            );
          }
          if (
            scopedImportedReference(context, node.callee, [], Function.constTrue).pipe(
              Option.exists((reference) =>
                isExport(reference, "@tanstack/react-router", "createRoute"),
              ),
            )
          ) {
            return settings.pipe(
              Option.flatMap((object) => objectField(object, "path")),
              Option.flatMap((argument) => moduleAddress(context, argument)),
            );
          }
          return Option.none();
        };
        const dataPath = path().pipe(
          Option.exists((path) =>
            Array.some<string>((prefix) => path === prefix || path.startsWith(`${prefix}/`))(
              options.value.publicApiPaths,
            ),
          ),
        );
        const serverHandler = settings.pipe(
          Option.flatMap((object) => objectField(object, "server")),
          Option.flatMap((server) => localObject(context, server)),
          Option.flatMap((server) => objectField(server, "handlers")),
          Option.isSome,
        );
        if (dataPath && serverHandler) {
          context.report({ node, messageId: "direct" });
        }
      },
    };
  },
});

export default eslintCompatPlugin({
  meta: { name: "strict-effect" },
  rules: {
    "checked-page-response": checkedPageResponse,
    "native-cloudflare-cache": nativeCloudflareCache,
    "website-data-proxy": websiteDataProxy,
    "no-loader-request-state": noLoaderRequestState,
    "no-native-client-replica": noNativeClientReplica,
    "website-rpc-boundary": websiteRpcBoundary,
    "static-layers": staticLayers,
    "no-unchecked-index": noUncheckedIndex,
    "no-native-at": noNativeAt,
    "runtime-file-convention": runtimeFileConvention,
    "tagged-error-name": taggedErrorName,
    "error-constructor-new": errorConstructorNew,
    "no-promise-workflow": noPromiseWorkflow,
    "module-ownership": moduleOwnership,
    "no-unsafe-option-unwrap": noUnsafeOptionUnwrap,
    "no-unchecked-json": noUncheckedJson,
    "no-runtime-outside-boundary": noRuntimeOutsideBoundary,
    "no-native-work": noNativeWork,
    "no-imperative-collections": noImperativeCollections,
  },
});
