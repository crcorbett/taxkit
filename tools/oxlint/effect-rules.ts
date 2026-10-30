import {
  Predicate,
  Match,
  Function as EffectFunction,
  Array as EffectArray,
  HashMap,
  HashSet,
  MutableRef,
  Option,
  Ref,
} from "effect";
import { forEach } from "effect/Array";

import {
  createBindingTracker,
  importSourceValue,
  propertyName,
  syntaxParents,
} from "./binding-tracker.ts";
import type {
  ImportSemantic,
  OxlintRule,
  SyntaxKind,
  SyntaxNode,
} from "./host.types.js";

const effectImportSemantic: ImportSemantic = (source, kind, imported) => {
  if (source === "effect") {
    if (kind === "ImportNamespaceSpecifier") {
      return Option.some("effect");
    }
    if (kind === "ImportSpecifier") {
      return imported.pipe(
        Option.filter((name) =>
          HashSet.has(
            HashSet.fromIterable([
              "Data",
              "Effect",
              "ManagedRuntime",
              "Schema",
            ]),
            name
          )
        )
      );
    }
  }
  return HashMap.get(
    HashMap.make(
      ["effect/Data", "Data"],
      ["effect/Effect", "Effect"],
      ["effect/ManagedRuntime", "ManagedRuntime"],
      ["effect/Schema", "Schema"]
    ),
    source
  ).pipe(
    Option.map((module) => {
      if (kind === "ImportSpecifier" && Option.isSome(imported)) {
        return `${module}.${imported.value}`;
      }
      return module;
    })
  );
};
const platformBunImportSemantic: ImportSemantic = (source, kind, imported) => {
  if (source === "@effect/platform-bun") {
    if (kind === "ImportNamespaceSpecifier") {
      return Option.some("platform-bun");
    }
    if (kind === "ImportSpecifier") {
      return imported.pipe(Option.filter((name) => name === "BunRuntime"));
    }
  }
  if (source === "@effect/platform-bun/BunRuntime") {
    if (kind === "ImportSpecifier" && Option.isSome(imported)) {
      return Option.some(`BunRuntime.${imported.value}`);
    }
    return Option.some("BunRuntime");
  }
  return Option.none();
};
const platformNodeImportSemantic: ImportSemantic = (source, kind, imported) => {
  if (source === "@effect/platform-node") {
    if (kind === "ImportNamespaceSpecifier") {
      return Option.some("platform-node");
    }
    if (kind === "ImportSpecifier") {
      return imported.pipe(Option.filter((name) => name === "NodeRuntime"));
    }
  }
  if (source === "@effect/platform-node/NodeRuntime") {
    if (kind === "ImportSpecifier" && Option.isSome(imported)) {
      return Option.some(`NodeRuntime.${imported.value}`);
    }
    return Option.some("NodeRuntime");
  }
  return Option.none();
};
const portableImportSemantic: ImportSemantic = (source, kind, imported) =>
  effectImportSemantic(source, kind, imported).pipe(
    Option.orElse(() => platformBunImportSemantic(source, kind, imported)),
    Option.orElse(() => platformNodeImportSemantic(source, kind, imported))
  );
const noManualTag: OxlintRule = {
  create(context) {
    return {
      Property(node) {
        if (
          node.parent?.type === "ObjectExpression" &&
          Option.contains(propertyName(node.key), "_tag")
        ) {
          context.report({ messageId: "noManualTag", node: node.key });
        }
      },
    };
  },
  meta: {
    docs: { description: "Disallow manual Effect _tag object literals." },
    messages: {
      noManualTag:
        "Do not construct manual _tag object literals. Define the canonical variant with Data.TaggedClass, Data.TaggedError, Schema.TaggedClass, or Schema.TaggedError and use its constructor.",
    },
    type: "problem",
  },
};
const noSwitch: OxlintRule = {
  create(context) {
    return {
      SwitchStatement(node) {
        context.report({ messageId: "noSwitch", node });
      },
    };
  },
  meta: {
    docs: { description: "Disallow switch statements in Effect-native code." },
    messages: {
      noSwitch:
        "Use Effect Match with Match.exhaustive for closed tagged variants instead of switch.",
    },
    type: "problem",
  },
};
const layerExportNamePattern = /(?:Live|Mock|Test|TestLive)$/u;
const noLayerExportsInServiceFiles: OxlintRule = {
  create(context) {
    const reportName = (node: SyntaxNode | null | undefined) => {
      if (
        node?.type === "Identifier" &&
        layerExportNamePattern.test(node.name)
      ) {
        context.report({ messageId: "noLayerExportsInServiceFiles", node });
      }
    };
    return {
      ExportDefaultDeclaration(node) {
        reportName(node.declaration);
        Match.value(node.declaration).pipe(
          Match.when(
            {
              type: Match.is(
                "ClassDeclaration",
                "FunctionDeclaration",
                "TSEnumDeclaration",
                "TSInterfaceDeclaration",
                "TSTypeAliasDeclaration",
                "TSModuleDeclaration"
              ),
            },
            (declaration) => declaration.id
          ),
          Match.orElse(EffectFunction.constUndefined),
          reportName
        );
      },
      ExportNamedDeclaration(node) {
        if (node.declaration?.type === "VariableDeclaration") {
          EffectFunction.pipe(
            node.declaration.declarations,
            forEach((declarator) => {
              reportName(declarator.id);
            })
          );
        } else {
          Match.value(node.declaration).pipe(
            Match.when(
              {
                type: Match.is(
                  "ClassDeclaration",
                  "FunctionDeclaration",
                  "TSEnumDeclaration",
                  "TSInterfaceDeclaration",
                  "TSTypeAliasDeclaration",
                  "TSModuleDeclaration"
                ),
              },
              (declaration) => declaration.id
            ),
            Match.orElse(EffectFunction.constUndefined),
            reportName
          );
        }
        EffectFunction.pipe(
          node.specifiers ?? [],
          forEach((specifier) => {
            reportName(specifier.local);
            if (
              propertyName(specifier.exported) !== propertyName(specifier.local)
            ) {
              reportName(specifier.exported);
            }
          })
        );
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow Live, Mock, and Test layer exports from service contracts.",
    },
    messages: {
      noLayerExportsInServiceFiles:
        "Keep service.ts limited to the Context.Service contract and canonical request/error types. Put production wiring in live.layer.ts and test wiring in test.layer.ts or package test helpers.",
    },
    type: "problem",
  },
};
const runtimeMethods = HashSet.fromIterable([
  "runCallback",
  "runCallbackWith",
  "runFork",
  "runForkWith",
  "runPromise",
  "runPromiseExit",
  "runPromiseExitWith",
  "runPromiseWith",
  "runSync",
  "runSyncExit",
  "runSyncExitWith",
  "runSyncWith",
]);
const runtimeExecutionSemantics = HashSet.fromIterable([
  ...EffectFunction.pipe(
    [...runtimeMethods],
    EffectArray.map((method) => `Effect.${method}`)
  ),
  ...EffectFunction.pipe(
    [...runtimeMethods],
    EffectArray.map((method) => `effect.Effect.${method}`)
  ),
  "BunRuntime.runMain",
  "NodeRuntime.runMain",
  "ManagedRuntime.make",
  "effect.ManagedRuntime.make",
  "platform-bun.BunRuntime.runMain",
  "platform-node.NodeRuntime.runMain",
]);
const noRuntimeExecutionOutsideBoundaries: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (
          tracker
            .calledSemantic(node)
            .pipe(
              Option.exists((name) =>
                HashSet.has(runtimeExecutionSemantics, name)
              )
            )
        ) {
          context.report({
            messageId: "noRuntimeExecutionOutsideBoundaries",
            node: node.callee,
          });
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, portableImportSemantic);
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description:
        "Restrict Effect runtime execution to configured runtime boundaries.",
    },
    messages: {
      noRuntimeExecutionOutsideBoundaries:
        "Do not execute Effects or construct ManagedRuntime in package/service logic. Return Effect values and compose Layers; let an exact app, runtime, server, script, or test boundary execute the program.",
    },
    type: "problem",
  },
};
// Calls have their existing rule. This owner rejects exporting or handing a
// runner to another callback before that callback can execute it elsewhere.
const noRuntimeReferencesOutsideBoundaries: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    const reportReference = (node: SyntaxNode) => {
      if (node.type === "Identifier" && !tracker.isReadReference(node)) {
        return;
      }
      if (
        node.parent?.type === "CallExpression" &&
        node.parent.callee === node
      ) {
        return;
      }
      if (
        tracker
          .semanticOfExpression(node)
          .pipe(
            Option.exists((name) =>
              HashSet.has(runtimeExecutionSemantics, name)
            )
          )
      ) {
        context.report({
          messageId: "noRuntimeReferencesOutsideBoundaries",
          node,
        });
      }
    };
    const reportDestructuredRunner = (
      pattern: SyntaxNode | null | undefined,
      source: Option.Option<string>
    ): void => {
      if (Option.isNone(source)) {
        return;
      }
      if (pattern?.type === "Identifier") {
        if (HashSet.has(runtimeExecutionSemantics, source.value)) {
          context.report({
            messageId: "noRuntimeReferencesOutsideBoundaries",
            node: pattern,
          });
        }
        return;
      }
      if (pattern?.type === "ObjectPattern") {
        EffectFunction.pipe(
          pattern.properties ?? [],
          forEach<SyntaxKind<"ObjectPattern">["properties"][number]>(
            (property) => {
              if (property.type === "Property") {
                const member = propertyName(property.key);
                if (Option.isSome(member)) {
                  const memberSemantic = Option.some(
                    `${source.value}.${member.value}`
                  );
                  reportDestructuredRunner(property.value, memberSemantic);
                }
              }
            }
          )
        );
      }
    };
    return {
      AssignmentExpression(node) {
        const source = tracker.semanticOfExpression(node.right);
        tracker.trackAssignment(node);
        if (node.left?.type === "ObjectPattern") {
          reportDestructuredRunner(node.left, source);
        }
      },
      Identifier: reportReference,
      ImportDeclaration(node) {
        tracker.trackImport(node, portableImportSemantic);
      },
      MemberExpression: reportReference,
      VariableDeclarator(node) {
        const source = tracker.semanticOfExpression(node.init);
        tracker.trackVariable(node);
        if (node.id?.type === "ObjectPattern") {
          reportDestructuredRunner(node.id, source);
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Keep Effect runner references inside named runtime boundaries.",
    },
    messages: {
      noRuntimeReferencesOutsideBoundaries:
        "Return an Effect value. Do not export, capture or pass an Effect runner or ManagedRuntime constructor as a callback outside its named runtime owner.",
    },
    type: "problem",
  },
};
const noConsoleOutsideRuntime: OxlintRule = {
  create(context) {
    const tracker = EffectFunction.pipe(context.sourceCode, (argument1) =>
      EffectFunction.pipe(
        HashMap.fromIterable([["console", "Global.console"]]),
        (argument2) => createBindingTracker(argument1, argument2)
      )
    );
    return {
      AssignmentExpression(node) {
        const source = tracker.semanticOfExpression(node.right);
        tracker.trackAssignment(node);
        if (
          node.left?.type === "ObjectPattern" &&
          Option.contains(source, "Global.console")
        ) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
      CallExpression(node) {
        if (
          node.callee?.type === "Identifier" &&
          tracker
            .calledSemantic(node)
            .pipe(Option.exists((name) => name.startsWith("Global.console.")))
        ) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
      MemberExpression(node) {
        if (
          tracker
            .semanticOfExpression(node)
            .pipe(Option.exists((name) => name.startsWith("Global.console.")))
        ) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
      VariableDeclarator(node) {
        const source = tracker.semanticOfExpression(node.init);
        tracker.trackVariable(node);
        if (
          node.id?.type === "ObjectPattern" &&
          Option.contains(source, "Global.console")
        ) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Restrict console output to configured runtime adapters.",
    },
    messages: {
      noConsoleOutsideRuntime:
        "Do not call console.* from Effect-owned logic. Return typed values or tagged errors and let the configured runtime, CLI, or test adapter render diagnostics.",
    },
    type: "problem",
  },
};
const processBoundaryMembers = HashSet.fromIterable([
  "argv",
  "env",
  "exit",
  "exitCode",
]);
const noProcessOutsideBoundaries: OxlintRule = {
  create(context) {
    const tracker = EffectFunction.pipe(context.sourceCode, (argument3) =>
      EffectFunction.pipe(
        HashMap.fromIterable([["process", "Global.process"]]),
        (argument4) => createBindingTracker(argument3, argument4)
      )
    );
    const reportDestructuredMembers = (
      pattern: SyntaxNode | null | undefined,
      source: Option.Option<string>,
      node: SyntaxNode
    ) => {
      if (
        pattern?.type !== "ObjectPattern" ||
        !Option.contains(source, "Global.process")
      ) {
        return;
      }
      EffectFunction.pipe(
        pattern.properties ?? [],
        forEach<SyntaxKind<"ObjectPattern">["properties"][number]>(
          (property) => {
            if (
              property.type === "Property" &&
              propertyName(property.key).pipe(
                Option.exists((name) =>
                  HashSet.has(processBoundaryMembers, name)
                )
              )
            ) {
              context.report({ messageId: "noProcessOutsideBoundaries", node });
            }
          }
        )
      );
    };
    return {
      AssignmentExpression(node) {
        const source = tracker.semanticOfExpression(node.right);
        tracker.trackAssignment(node);
        reportDestructuredMembers(node.left, source, node.left);
      },
      CallExpression(node) {
        const semantic = tracker.calledSemantic(node);
        if (
          node.callee?.type === "Identifier" &&
          Option.isSome(semantic) &&
          semantic.value.startsWith("Global.process.") &&
          HashSet.has(
            processBoundaryMembers,
            semantic.value.slice("Global.process.".length)
          )
        ) {
          context.report({ messageId: "noProcessOutsideBoundaries", node });
        }
      },
      MemberExpression(node) {
        const semantic = tracker.semanticOfExpression(node);
        if (
          Option.isSome(semantic) &&
          semantic.value.startsWith("Global.process.") &&
          HashSet.has(
            processBoundaryMembers,
            semantic.value.slice("Global.process.".length)
          )
        ) {
          context.report({ messageId: "noProcessOutsideBoundaries", node });
        }
      },
      VariableDeclarator(node) {
        tracker.trackVariable(node);
        EffectFunction.pipe(node.id, (argument5) => {
          EffectFunction.pipe(
            tracker.semanticOfExpression(node.init),
            (argument6) => {
              EffectFunction.pipe(node.id, (argument7) => {
                reportDestructuredMembers(argument5, argument6, argument7);
              });
            }
          );
        });
      },
    };
  },
  meta: {
    docs: {
      description: "Restrict process access to configured host boundaries.",
    },
    messages: {
      noProcessOutsideBoundaries:
        "Do not read process.env/process.argv or mutate process exit state in package logic. Decode configuration with Effect Config or Schema and keep process lifecycle access in an exact runtime or CLI adapter.",
    },
    type: "problem",
  },
};
const isHostImport = (source: string) =>
  source.startsWith("node:") ||
  source === "bun" ||
  source.startsWith("bun:") ||
  source.startsWith("@effect/platform-bun") ||
  source.startsWith("@effect/platform-node");
const noHostImportsInContracts: OxlintRule = {
  create(context) {
    return {
      ImportDeclaration(node) {
        if (EffectFunction.pipe(importSourceValue(node), isHostImport)) {
          context.report({ messageId: "noHostImportsInContracts", node });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Keep service, schema, error, and config contracts host-independent.",
    },
    messages: {
      noHostImportsInContracts:
        "Do not import Node, Bun, or platform adapters into service/schema/error/config contracts. Depend on Effect Platform services or a Context.Service contract and provide the Bun/Node Layer from a live runtime adapter.",
    },
    type: "problem",
  },
};
const schemaEncoderMethodPattern = /^encode(?!To)[A-Za-z]*$/u;
const throwingSchemaSyncCodecPattern =
  /^(?:decode|encode)(?!To)[A-Za-z]*Sync$/u;
const schemaCodecRule = ({
  description,
  message,
  messageId,
  matches,
}: {
  readonly description: string;
  readonly message: string;
  readonly messageId: string;
  readonly matches: (method: string) => boolean;
}): OxlintRule => ({
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        const semantic = tracker.calledSemantic(node);
        const method = semantic.pipe(
          Option.flatMap((name) =>
            EffectFunction.pipe(
              ["Schema.", "effect.Schema."],
              EffectArray.findFirst((prefix) => name.startsWith(prefix)),
              Option.map((prefix) => name.slice(prefix.length))
            )
          )
        );
        if (Option.exists(method, matches)) {
          context.report({ messageId, node: node.callee });
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, effectImportSemantic);
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: { description },
    messages: { [messageId]: message },
    type: "problem",
  },
});
const noSchemaEncoderOutsideEgress = schemaCodecRule({
  description:
    "Restrict Effect Schema encoder execution to configured egress boundaries.",
  matches: (method) => schemaEncoderMethodPattern.test(method),
  message:
    "Schema encoder execution belongs at an exact serialization egress: an HTTP response, route transport, persisted representation, provider request, or command output. Pass schema-derived values inward and encode once with the owning Schema where the value leaves the system.",
  messageId: "noSchemaEncoderOutsideEgress",
});
const noThrowingSchemaSyncCodec = schemaCodecRule({
  description: "Disallow throwing synchronous Effect Schema codecs.",
  matches: (method) => throwingSchemaSyncCodecPattern.test(method),
  message:
    "Do not call throwing Schema *Sync codecs. Use Schema.decodeUnknownEffect/encodeUnknownEffect in an Effect boundary, or a non-throwing Result, Exit, or Option codec in a synchronous consumer, then handle the typed failure explicitly.",
  messageId: "noThrowingSchemaSyncCodec",
});
const tryPromiseSemantics = HashSet.fromIterable([
  "Effect.tryPromise",
  "effect.Effect.tryPromise",
]);
const noBareEffectTryPromise: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (
          !tracker
            .calledSemantic(node)
            .pipe(
              Option.exists((name) => HashSet.has(tryPromiseSemantics, name))
            )
        ) {
          return;
        }
        const options = Option.getOrUndefined(
          EffectArray.head(node.arguments ?? [])
        );
        const optionProperties: readonly SyntaxKind<"ObjectExpression">["properties"][number][] =
          Match.value(options).pipe(
            Match.when({ type: "ObjectExpression" }, (matchedValue) =>
              EffectFunction.pipe(
                matchedValue.properties,
                EffectArray.filter(
                  (property) =>
                    property.type === "Property" &&
                    (Option.contains(propertyName(property.key), "try") ||
                      Option.contains(propertyName(property.key), "catch"))
                )
              )
            ),
            Match.orElse(() => [])
          );
        const inlineFunctionKeys = HashSet.fromIterable(
          EffectFunction.pipe(
            EffectFunction.pipe(
              optionProperties,
              EffectArray.filter(
                (property) =>
                  property.type === "Property" &&
                  property.kind === "init" &&
                  (property.value?.type === "ArrowFunctionExpression" ||
                    property.value?.type === "FunctionExpression")
              )
            ),
            EffectArray.map((property) =>
              Match.value(property).pipe(
                Match.when(
                  { type: "Property" },
                  (matchedValue) => matchedValue.key
                ),
                Match.orElse(EffectFunction.constUndefined),
                propertyName
              )
            )
          )
        );
        const hasDynamicSpread =
          options?.type === "ObjectExpression" &&
          EffectFunction.pipe(
            options.properties,
            EffectArray.some((property) => property.type === "SpreadElement")
          );
        if (
          optionProperties.length !== 2 ||
          HashSet.size(inlineFunctionKeys) !== 2 ||
          hasDynamicSpread
        ) {
          context.report({
            messageId: "noBareEffectTryPromise",
            node: node.callee,
          });
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, effectImportSemantic);
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description:
        "Require explicit inline rejection mapping at Effect.tryPromise boundaries.",
    },
    messages: {
      noBareEffectTryPromise:
        "Use Effect.tryPromise({ try: () => ..., catch: (cause) => ... }) with direct inline function-valued properties, and map rejection at this callsite to the boundary's canonical tagged error. Do not extract, spread, shorthand, or omit the rejection policy. Use Effect.promise only when rejection is intentionally a defect.",
    },
    type: "problem",
  },
};
const taggedErrorConstructorSemantics = HashSet.fromIterable([
  "Data.TaggedError",
  "Schema.TaggedError",
  "effect.Data.TaggedError",
  "effect.Schema.TaggedError",
]);
const hasTaggedErrorCallAncestor = (
  node: SyntaxNode,
  tracker: ReturnType<typeof createBindingTracker>
) =>
  EffectFunction.pipe(
    syntaxParents(node),
    EffectArray.some((current) => {
      if (current.type === "CallExpression") {
        const semantic = Match.value(current.callee).pipe(
          Match.when({ type: "CallExpression" }, (matchedValue) =>
            tracker.calledSemantic(matchedValue)
          ),
          Match.orElse(() => tracker.calledSemantic(current))
        );
        if (
          semantic.pipe(
            Option.exists((name) =>
              HashSet.has(taggedErrorConstructorSemantics, name)
            )
          )
        ) {
          return true;
        }
      }
      return false;
    })
  );
const isUnknownCauseProperty = (node: SyntaxNode) =>
  Option.exists(
    EffectFunction.pipe(
      syntaxParents(node),
      EffectArray.findFirst((current) => current.type === "TSPropertySignature")
    ),
    (current) =>
      current.type === "TSPropertySignature" &&
      Option.contains(propertyName(current.key), "cause")
  );
const unknownSchemaSemantics = HashSet.fromIterable([
  "Schema.Unknown",
  "effect.Schema.Unknown",
]);
const noUnknownTaggedErrorCause: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      ImportDeclaration(node) {
        tracker.trackImport(node, effectImportSemantic);
      },
      Property(node) {
        if (
          Option.contains(propertyName(node.key), "cause") &&
          tracker
            .semanticOfExpression(node.value)
            .pipe(
              Option.exists((name) => HashSet.has(unknownSchemaSemantics, name))
            ) &&
          hasTaggedErrorCallAncestor(node, tracker)
        ) {
          context.report({
            messageId: "noUnknownTaggedErrorCause",
            node: node.value,
          });
        }
      },
      TSUnknownKeyword(node) {
        if (
          isUnknownCauseProperty(node) &&
          hasTaggedErrorCallAncestor(node, tracker)
        ) {
          context.report({ messageId: "noUnknownTaggedErrorCause", node });
        }
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: { description: "Disallow unknown tagged-error causes." },
    messages: {
      noUnknownTaggedErrorCause:
        "Tagged errors must not expose an unknown cause. Reuse the owning tagged error/schema, preserve an actual defect with Schema.Defect() at the adapter boundary, or expose schema-safe diagnostic fields such as message, command, status, and canonical identifiers.",
    },
    type: "problem",
  },
};
const functionNodeTypes = HashSet.fromIterable([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
  "TSCallSignatureDeclaration",
  "TSFunctionType",
  "TSMethodSignature",
]);
const isUnknownFunctionParameter = (node: SyntaxNode) => {
  const annotation = node.parent;
  const parameter = annotation?.parent;
  return (
    annotation?.type === "TSTypeAnnotation" &&
    !Predicate.isUndefined(parameter) &&
    HashSet.has(functionNodeTypes, parameter?.parent?.type ?? "")
  );
};
const effectTypeSemantics = HashSet.fromIterable([
  "Effect.Effect",
  "effect.Effect.Effect",
]);
const isUnknownEffectError = (
  node: SyntaxNode,
  tracker: ReturnType<typeof createBindingTracker>
) => {
  const parameters = node.parent;
  const reference = parameters?.parent;
  return (
    parameters?.type === "TSTypeParameterInstantiation" &&
    reference?.type === "TSTypeReference" &&
    tracker
      .semanticOfTypeName(reference.typeName)
      .pipe(Option.exists((name) => HashSet.has(effectTypeSemantics, name))) &&
    Option.contains(EffectArray.get(parameters.params ?? [], 1), node)
  );
};
const noUnknownServiceContract: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    return {
      AssignmentExpression: tracker.trackAssignment,
      ImportDeclaration(node) {
        tracker.trackImport(node, effectImportSemantic);
      },
      TSUnknownKeyword(node) {
        if (
          isUnknownFunctionParameter(node) ||
          isUnknownEffectError(node, tracker)
        ) {
          context.report({ messageId: "noUnknownServiceContract", node });
        }
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description:
        "Disallow unknown parameters and error channels in service contracts.",
    },
    messages: {
      noUnknownServiceContract:
        "Service contracts must accept schema-derived inputs and expose closed tagged Effect errors, not unknown. Decode raw values at the owning ingress and map expected failures to canonical tagged errors before entering the service.",
    },
    type: "problem",
  },
};
const importedName = (
  specifier: SyntaxKind<"ImportDeclaration">["specifiers"][number]
) =>
  Match.value(specifier).pipe(
    Match.when({ type: "ImportSpecifier" }, (matchedValue) =>
      propertyName(matchedValue.imported)
    ),
    Match.orElse(() => Option.none<string>())
  );
const localName = (
  specifier: SyntaxKind<"ImportDeclaration">["specifiers"][number]
) =>
  Match.value(specifier?.local).pipe(
    Match.when({ type: "Identifier" }, () => specifier.local.name),
    Match.orElse(() => null)
  );
const hasUnaliasedImport = (
  node: SyntaxKind<"ImportDeclaration">,
  names: HashSet.HashSet<string>
) =>
  EffectFunction.pipe(
    node.specifiers ?? [],
    EffectArray.some((specifier) => {
      const name = importedName(specifier);
      return (
        Option.isSome(name) &&
        HashSet.has(names, name.value) &&
        localName(specifier) === name.value
      );
    })
  );
const effectVitestSharedGlobals = HashSet.fromIterable([
  "describe",
  "expect",
  "it",
  "test",
]);
const noEffectTestGlobalMix: OxlintRule = {
  create(context) {
    const imports = Ref.makeUnsafe<{
      readonly effectTestImport: Option.Option<SyntaxKind<"ImportDeclaration">>;
      readonly vitestGlobalImport: Option.Option<
        SyntaxKind<"ImportDeclaration">
      >;
    }>({
      effectTestImport: Option.none(),
      vitestGlobalImport: Option.none(),
    });
    return {
      ImportDeclaration(node) {
        const source = importSourceValue(node);
        if (
          source === "@effect/vitest" &&
          hasUnaliasedImport(node, effectVitestSharedGlobals)
        ) {
          MutableRef.update(imports.ref, (current) => ({
            ...current,
            effectTestImport: Option.some(node),
          }));
        }
        if (
          source === "vitest" &&
          hasUnaliasedImport(node, effectVitestSharedGlobals)
        ) {
          MutableRef.update(imports.ref, (current) => ({
            ...current,
            vitestGlobalImport: Option.some(node),
          }));
        }
      },
      "Program:exit"() {
        const { effectTestImport, vitestGlobalImport } = Ref.getUnsafe(imports);
        if (
          Option.isSome(effectTestImport) &&
          Option.isSome(vitestGlobalImport)
        ) {
          context.report({
            messageId: "noEffectTestGlobalMix",
            node: vitestGlobalImport.value,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow mixed unaliased Effect Vitest and Vitest test globals.",
    },
    messages: {
      noEffectTestGlobalMix:
        "Do not split unaliased describe, expect, it, or test imports between @effect/vitest and vitest. Import the shared test API from one module; Vitest-only utilities may still come from vitest, and an explicitly aliased secondary API is allowed.",
    },
    type: "problem",
  },
};
const runtimeFunctionNodeTypes = HashSet.fromIterable([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);
const isModuleLevel = (node: SyntaxNode) => {
  const ancestors = syntaxParents(node);
  return (
    EffectFunction.pipe(
      ancestors,
      EffectArray.some((current) => current.type === "Program")
    ) &&
    !EffectFunction.pipe(
      EffectArray.takeWhile(ancestors, (current) => current.type !== "Program"),
      EffectArray.some(
        (current) =>
          HashSet.has(runtimeFunctionNodeTypes, current.type) ||
          (current.type === "TSModuleDeclaration" &&
            (current.declare ||
              current.global ||
              Option.contains(propertyName(current.id), "global")))
      )
    )
  );
};
const noModuleLevelMutableTestState: OxlintRule = {
  create(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind !== "const" && isModuleLevel(node)) {
          context.report({
            messageId: "noModuleLevelMutableTestState",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow module-level mutable bindings in tests that can leak state between cases.",
    },
    messages: {
      noModuleLevelMutableTestState:
        "Do not keep mutable test state in a module-level let or var binding. Build isolated state inside each test or test Layer; use Effect Ref, Deferred, Queue, or a scoped service for observations and coordination. Keep unavoidable synchronous host-adapter mutation inside that per-test boundary.",
    },
    type: "problem",
  },
};
export default {
  meta: { name: "effect" },
  rules: {
    "no-bare-effect-try-promise": noBareEffectTryPromise,
    "no-console-outside-runtime": noConsoleOutsideRuntime,
    "no-effect-test-global-mix": noEffectTestGlobalMix,
    "no-host-imports-in-contracts": noHostImportsInContracts,
    "no-layer-exports-in-service-files": noLayerExportsInServiceFiles,
    "no-manual-tag": noManualTag,
    "no-module-level-mutable-test-state": noModuleLevelMutableTestState,
    "no-process-outside-boundaries": noProcessOutsideBoundaries,
    "no-runtime-execution-outside-boundaries":
      noRuntimeExecutionOutsideBoundaries,
    "no-runtime-references-outside-boundaries":
      noRuntimeReferencesOutsideBoundaries,
    "no-schema-encoder-outside-egress": noSchemaEncoderOutsideEgress,
    "no-switch": noSwitch,
    "no-throwing-schema-sync-codec": noThrowingSchemaSyncCodec,
    "no-unknown-service-contract": noUnknownServiceContract,
    "no-unknown-tagged-error-cause": noUnknownTaggedErrorCause,
  },
};
