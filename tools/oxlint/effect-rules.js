import {
  createBindingTracker,
  importSourceValue,
  propertyName,
} from "./binding-tracker.js";

const effectImportSemantic = (source, specifierType, imported) => {
  if (source === "effect") {
    if (specifierType === "ImportNamespaceSpecifier") {
      return "effect";
    }

    if (specifierType === "ImportSpecifier") {
      return new Set(["Data", "Effect", "ManagedRuntime", "Schema"]).has(
        imported
      )
        ? imported
        : null;
    }
  }

  const moduleSemantics = new Map([
    ["effect/Data", "Data"],
    ["effect/Effect", "Effect"],
    ["effect/ManagedRuntime", "ManagedRuntime"],
    ["effect/Schema", "Schema"],
  ]);
  const moduleSemantic = moduleSemantics.get(source);
  if (!moduleSemantic) {
    return null;
  }

  return specifierType === "ImportSpecifier" && imported
    ? `${moduleSemantic}.${imported}`
    : moduleSemantic;
};

const platformBunImportSemantic = (source, specifierType, imported) => {
  if (
    source === "@effect/platform-bun" &&
    specifierType === "ImportSpecifier" &&
    imported === "BunRuntime"
  ) {
    return "BunRuntime";
  }

  if (
    source === "@effect/platform-bun" &&
    specifierType === "ImportNamespaceSpecifier"
  ) {
    return "platform-bun";
  }

  if (source === "@effect/platform-bun/BunRuntime") {
    return specifierType === "ImportSpecifier" && imported
      ? `BunRuntime.${imported}`
      : "BunRuntime";
  }

  return null;
};

const portableImportSemantic = (source, specifierType, imported) =>
  effectImportSemantic(source, specifierType, imported) ??
  platformBunImportSemantic(source, specifierType, imported);

const noManualTag = {
  create(context) {
    return {
      Property(node) {
        if (
          node.parent?.type === "ObjectExpression" &&
          propertyName(node.key) === "_tag"
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
        "Do not construct manual _tag object literals. Define the canonical variant with Data.TaggedClass, Data.TaggedError, Schema.TaggedClass, or Schema.TaggedErrorClass and use its constructor.",
    },
    type: "problem",
  },
};

const noSwitch = {
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

const layerExportNamePattern = /(Live|Mock|Test|TestLive)$/u;

const noLayerExportsInServiceFiles = {
  create(context) {
    const reportName = (node) => {
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
        reportName(node.declaration?.id);
      },
      ExportNamedDeclaration(node) {
        if (node.declaration?.type === "VariableDeclaration") {
          for (const declarator of node.declaration.declarations) {
            reportName(declarator.id);
          }
        } else {
          reportName(node.declaration?.id);
        }

        for (const specifier of node.specifiers ?? []) {
          reportName(specifier.local);
          if (specifier.exported?.name !== specifier.local?.name) {
            reportName(specifier.exported);
          }
        }
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

const runtimeMethods = new Set([
  "runFork",
  "runPromise",
  "runPromiseExit",
  "runSync",
  "runSyncExit",
]);

const runtimeExecutionSemantics = new Set([
  ...[...runtimeMethods].map((method) => `Effect.${method}`),
  ...[...runtimeMethods].map((method) => `effect.Effect.${method}`),
  "BunRuntime.runMain",
  "ManagedRuntime.make",
  "effect.ManagedRuntime.make",
  "platform-bun.BunRuntime.runMain",
]);

const noRuntimeExecutionOutsideBoundaries = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);

    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (runtimeExecutionSemantics.has(tracker.calledSemantic(node))) {
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

const noConsoleOutsideRuntime = {
  create(context) {
    const tracker = createBindingTracker(
      context.sourceCode,
      new Map([["console", "Global.console"]])
    );

    return {
      AssignmentExpression(node) {
        const source = tracker.semanticOfExpression(node.right);
        tracker.trackAssignment(node);
        if (
          node.left?.type === "ObjectPattern" &&
          source === "Global.console"
        ) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
      CallExpression(node) {
        if (
          node.callee?.type === "Identifier" &&
          tracker.calledSemantic(node)?.startsWith("Global.console.")
        ) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
      MemberExpression(node) {
        if (tracker.semanticOfExpression(node)?.startsWith("Global.console.")) {
          context.report({ messageId: "noConsoleOutsideRuntime", node });
        }
      },
      VariableDeclarator(node) {
        const source = tracker.semanticOfExpression(node.init);
        tracker.trackVariable(node);
        if (node.id?.type === "ObjectPattern" && source === "Global.console") {
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

const processBoundaryMembers = new Set(["argv", "env", "exit", "exitCode"]);

const noProcessOutsideBoundaries = {
  create(context) {
    const tracker = createBindingTracker(
      context.sourceCode,
      new Map([["process", "Global.process"]])
    );
    const reportDestructuredMembers = (pattern, source, node) => {
      if (pattern?.type !== "ObjectPattern" || source !== "Global.process") {
        return;
      }

      for (const property of pattern.properties ?? []) {
        if (
          property.type === "Property" &&
          processBoundaryMembers.has(propertyName(property.key))
        ) {
          context.report({ messageId: "noProcessOutsideBoundaries", node });
        }
      }
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
          semantic?.startsWith("Global.process.") &&
          processBoundaryMembers.has(semantic.slice("Global.process.".length))
        ) {
          context.report({ messageId: "noProcessOutsideBoundaries", node });
        }
      },
      MemberExpression(node) {
        const semantic = tracker.semanticOfExpression(node);
        if (
          semantic?.startsWith("Global.process.") &&
          processBoundaryMembers.has(semantic.slice("Global.process.".length))
        ) {
          context.report({ messageId: "noProcessOutsideBoundaries", node });
        }
      },
      VariableDeclarator(node) {
        tracker.trackVariable(node);
        reportDestructuredMembers(
          node.id,
          tracker.semanticOfExpression(node.init),
          node.id
        );
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

const isHostImport = (source) =>
  source.startsWith("node:") ||
  source === "bun" ||
  source.startsWith("bun:") ||
  source.startsWith("@effect/platform-bun") ||
  source.startsWith("@effect/platform-node");

const noHostImportsInContracts = {
  create(context) {
    return {
      ImportDeclaration(node) {
        if (isHostImport(importSourceValue(node))) {
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

const schemaCodecRule = ({ description, message, messageId, matches }) => ({
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);

    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        const semantic = tracker.calledSemantic(node);
        let method = null;
        if (semantic?.startsWith("Schema.")) {
          method = semantic.slice("Schema.".length);
        } else if (semantic?.startsWith("effect.Schema.")) {
          method = semantic.slice("effect.Schema.".length);
        }
        if (method && matches(method)) {
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

const tryPromiseSemantics = new Set([
  "Effect.tryPromise",
  "effect.Effect.tryPromise",
]);

const noBareEffectTryPromise = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);

    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (!tryPromiseSemantics.has(tracker.calledSemantic(node))) {
          return;
        }

        const options = node.arguments?.[0];
        const optionProperties =
          options?.type === "ObjectExpression"
            ? options.properties.filter(
                (property) =>
                  property.type === "Property" &&
                  (propertyName(property.key) === "try" ||
                    propertyName(property.key) === "catch")
              )
            : [];
        const inlineFunctionKeys = new Set(
          optionProperties
            .filter(
              (property) =>
                property.kind === "init" &&
                (property.value?.type === "ArrowFunctionExpression" ||
                  property.value?.type === "FunctionExpression")
            )
            .map((property) => propertyName(property.key))
        );
        const hasDynamicSpread =
          options?.type === "ObjectExpression" &&
          options.properties.some(
            (property) => property.type === "SpreadElement"
          );

        if (
          optionProperties.length !== 2 ||
          inlineFunctionKeys.size !== 2 ||
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

const hasTaggedErrorCallAncestor = (node, tracker) => {
  let current = node?.parent;

  while (current) {
    if (current.type === "CallExpression") {
      const semantic =
        current.callee?.type === "CallExpression"
          ? tracker.calledSemantic(current.callee)
          : tracker.calledSemantic(current);
      if (taggedErrorConstructorSemantics.has(semantic)) {
        return true;
      }
    }
    current = current.parent;
  }

  return false;
};

const isUnknownCauseProperty = (node) => {
  let current = node?.parent;

  while (current && current.type !== "TSPropertySignature") {
    current = current.parent;
  }

  return (
    current?.type === "TSPropertySignature" &&
    propertyName(current.key) === "cause"
  );
};

const taggedErrorConstructorSemantics = new Set([
  "Data.TaggedError",
  "Schema.TaggedErrorClass",
  "effect.Data.TaggedError",
  "effect.Schema.TaggedErrorClass",
]);

const unknownSchemaSemantics = new Set([
  "Schema.Unknown",
  "effect.Schema.Unknown",
]);

const noUnknownTaggedErrorCause = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);

    return {
      AssignmentExpression: tracker.trackAssignment,
      ImportDeclaration(node) {
        tracker.trackImport(node, effectImportSemantic);
      },
      Property(node) {
        if (
          propertyName(node.key) === "cause" &&
          unknownSchemaSemantics.has(
            tracker.semanticOfExpression(node.value)
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

const functionNodeTypes = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
  "TSCallSignatureDeclaration",
  "TSFunctionType",
  "TSMethodSignature",
]);

const isUnknownFunctionParameter = (node) => {
  const annotation = node.parent;
  const parameter = annotation?.parent;
  return (
    annotation?.type === "TSTypeAnnotation" &&
    parameter !== undefined &&
    functionNodeTypes.has(parameter.parent?.type)
  );
};

const effectTypeSemantics = new Set(["Effect.Effect", "effect.Effect.Effect"]);

const isUnknownEffectError = (node, tracker) => {
  const parameters = node.parent;
  const reference = parameters?.parent;
  return (
    parameters?.type === "TSTypeParameterInstantiation" &&
    reference?.type === "TSTypeReference" &&
    effectTypeSemantics.has(tracker.semanticOfTypeName(reference.typeName)) &&
    parameters.params?.[1] === node
  );
};

const noUnknownServiceContract = {
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

const importedName = (specifier) =>
  specifier?.type === "ImportSpecifier"
    ? propertyName(specifier.imported)
    : null;

const localName = (specifier) =>
  specifier?.local?.type === "Identifier" ? specifier.local.name : null;

const hasUnaliasedImport = (node, names) =>
  (node.specifiers ?? []).some((specifier) => {
    const name = importedName(specifier);
    return name !== null && names.has(name) && localName(specifier) === name;
  });

const effectVitestSharedGlobals = new Set(["describe", "expect", "it", "test"]);

const noEffectTestGlobalMix = {
  create(context) {
    let effectTestImport = null;
    let vitestGlobalImport = null;

    return {
      ImportDeclaration(node) {
        const source = importSourceValue(node);
        if (
          source === "@effect/vitest" &&
          hasUnaliasedImport(node, effectVitestSharedGlobals)
        ) {
          effectTestImport = node;
        }
        if (
          source === "vitest" &&
          hasUnaliasedImport(node, effectVitestSharedGlobals)
        ) {
          vitestGlobalImport = node;
        }
      },
      "Program:exit"() {
        if (effectTestImport && vitestGlobalImport) {
          context.report({
            messageId: "noEffectTestGlobalMix",
            node: vitestGlobalImport,
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

export default {
  meta: { name: "effect" },
  rules: {
    "no-bare-effect-try-promise": noBareEffectTryPromise,
    "no-console-outside-runtime": noConsoleOutsideRuntime,
    "no-effect-test-global-mix": noEffectTestGlobalMix,
    "no-host-imports-in-contracts": noHostImportsInContracts,
    "no-layer-exports-in-service-files": noLayerExportsInServiceFiles,
    "no-manual-tag": noManualTag,
    "no-process-outside-boundaries": noProcessOutsideBoundaries,
    "no-runtime-execution-outside-boundaries":
      noRuntimeExecutionOutsideBoundaries,
    "no-schema-encoder-outside-egress": noSchemaEncoderOutsideEgress,
    "no-switch": noSwitch,
    "no-throwing-schema-sync-codec": noThrowingSchemaSyncCodec,
    "no-unknown-service-contract": noUnknownServiceContract,
    "no-unknown-tagged-error-cause": noUnknownTaggedErrorCause,
  },
};
