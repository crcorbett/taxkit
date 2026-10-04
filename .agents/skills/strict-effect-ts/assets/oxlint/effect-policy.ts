import { defineRule, eslintCompatPlugin } from "@oxlint/plugins";
import type { ESTree, Scope } from "@oxlint/plugins";
import * as Array from "effect/Array";
import * as Function from "effect/Function";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

// Derived from DAW's owned rules at e47ecfb; this is the portable skill owner.
const RuntimeOptions = Schema.Struct({ webSourceRoots: Schema.Array(Schema.String) });

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
  if (reference.module === "effect" || reference.module === "alchemy") {
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

const noPromiseWorkflow = defineRule({
  meta: {
    type: "problem",
    schema: boundarySchema,
    messages: {
      forbidden:
        "Use Effect for asynchronous work. Only an explicitly named host adapter may mention Promise; async, await and Promise chains remain forbidden there.",
    },
  },
  create(context) {
    const allowed = isBoundary(context.filename, context.cwd, context.options);
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
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") return;
        const name = calleeName(node.callee);
        const chain = Option.exists(
          name,
          (value) => value === "then" || value === "catch" || value === "finally",
        );
        const promise = isGlobalPromise(node.callee.object);
        const effectMethod = Option.exists(
          resolveReference(effectBindings(context.sourceCode.ast), node.callee),
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
              (reference.module.startsWith("effect/") || reference.module === "alchemy/Output"),
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

export default eslintCompatPlugin({
  meta: { name: "strict-effect" },
  rules: {
    "no-unchecked-index": noUncheckedIndex,
    "no-native-at": noNativeAt,
    "runtime-file-convention": runtimeFileConvention,
    "tagged-error-name": taggedErrorName,
    "error-constructor-new": errorConstructorNew,
    "no-promise-workflow": noPromiseWorkflow,
    "no-unsafe-option-unwrap": noUnsafeOptionUnwrap,
    "no-unchecked-json": noUncheckedJson,
    "no-runtime-outside-boundary": noRuntimeOutsideBoundary,
    "no-native-work": noNativeWork,
    "no-imperative-collections": noImperativeCollections,
  },
});
