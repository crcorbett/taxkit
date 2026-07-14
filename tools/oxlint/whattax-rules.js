import { resolve } from "node:path";

const noManualTag = {
  create(context) {
    return {
      Property(node) {
        const { key } = node;

        if (
          node.parent?.type === "ObjectExpression" &&
          ((key.type === "Identifier" && key.name === "_tag") ||
            (key.type === "Literal" && key.value === "_tag"))
        ) {
          context.report({
            messageId: "noManualTag",
            node: key,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow manual Effect _tag object literals.",
    },
    messages: {
      noManualTag:
        'Manual _tag object literals are not allowed. Define the tag at the canonical boundary with Data.TaggedClass, Data.TaggedError, or Schema.TaggedClass, then construct that type: class MissingFact extends Data.TaggedError("MissingFact")<{ readonly factId: FactId }>() {}. Do not write { _tag: "MissingFact", ... } at callsites.',
    },
    type: "problem",
  },
};

const noTypeof = {
  create(context) {
    return {
      UnaryExpression(node) {
        if (node.operator === "typeof") {
          context.report({
            messageId: "noTypeof",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow typeof checks in Effect-native service code.",
    },
    messages: {
      noTypeof:
        'Do not use typeof checks for service policy. Unknown input must be decoded by the owning Schema: Schema.decodeUnknown(CalculatorRequest)(input). Closed-domain branching must use Match: Match.value(value).pipe(Match.when({ _tag: "Known" }, onKnown), Match.exhaustive). Optional values must be Schema.optional + Option, not typeof value === "undefined".',
    },
    type: "problem",
  },
};

const noInstanceof = {
  create(context) {
    return {
      BinaryExpression(node) {
        if (node.operator === "instanceof") {
          context.report({
            messageId: "noInstanceof",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow instanceof checks in Effect-native service code.",
    },
    messages: {
      noInstanceof:
        'Do not use instanceof checks for service policy. Model domain variants as tagged Schema/Data classes and branch with Match on _tag: Match.value(error).pipe(Match.when({ _tag: "SchemaDecodeError" }, handleDecode), Match.exhaustive). For Effect outcomes, use Exit.match, Result.match, or typed tagged errors instead of instanceof Error.',
    },
    type: "problem",
  },
};

const noInOperator = {
  create(context) {
    return {
      BinaryExpression(node) {
        if (node.operator === "in") {
          context.report({
            messageId: "noInOperator",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow in-operator branching in Effect-native service code.",
    },
    messages: {
      noInOperator:
        "Do not use the in operator for service policy. Decode shape with the owning Schema instead of probing keys: Schema.decodeUnknown(FactInput)(value). For keyed collections, use HashMap.get(map, key).pipe(Option.match(...)) or Record.get(record, key).pipe(Option.match(...)). For variants, use Match on tagged Schema/Data classes.",
    },
    type: "problem",
  },
};

const isUndefinedIdentifier = (node) =>
  node?.type === "Identifier" && node.name === "undefined";

const isNullLiteral = (node) => node?.type === "Literal" && node.value === null;

const noUndefinedComparison = {
  create(context) {
    return {
      BinaryExpression(node) {
        if (
          (node.operator === "===" || node.operator === "!==") &&
          (isUndefinedIdentifier(node.left) ||
            isUndefinedIdentifier(node.right))
        ) {
          context.report({
            messageId: "noUndefinedComparison",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow raw undefined comparison in Effect-native service code.",
    },
    messages: {
      noUndefinedComparison:
        "Do not branch on raw undefined. Optional request/response fields must be owned by Schema.optional and immediately normalized to Option: const jurisdiction = Option.fromNullable(payload.jurisdiction); jurisdiction.pipe(Option.match({ onNone: () => ..., onSome: (value) => ... })). Do not write value === undefined or value !== undefined.",
    },
    type: "problem",
  },
};

const noNullishComparison = {
  create(context) {
    return {
      BinaryExpression(node) {
        if (
          ["==", "!=", "===", "!=="].includes(node.operator) &&
          (isNullLiteral(node.left) || isNullLiteral(node.right))
        ) {
          context.report({
            messageId: "noNullishComparison",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow raw nullish comparison in Effect-native service code.",
    },
    messages: {
      noNullishComparison:
        "Do not compare against null in calculator services. Own nullable input in Schema with Schema.NullOr or an explicit transform, normalize with Option.fromNullable(value), and branch with Option.match or Match. To fail an Effect from nullable input, use Effect.fromNullishOr(value).pipe(Effect.mapError(() => new MissingValue(...))). Undefined checks are separately banned; both cases should flow through Schema + Option.",
    },
    type: "problem",
  },
};

const isConditionalShape = (node) =>
  node?.type === "ConditionalExpression" || node?.type === "LogicalExpression";

const noConditionalObjectSpread = {
  create(context) {
    return {
      SpreadElement(node) {
        if (
          node.parent?.type === "ObjectExpression" &&
          isConditionalShape(node.argument)
        ) {
          context.report({
            messageId: "noConditionalObjectSpread",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow conditional object spreads for schema-backed response shaping.",
    },
    messages: {
      noConditionalObjectSpread:
        'Do not shape schema-backed responses with conditional object spreads. Put optional fields in the response Schema, then build them with Option/Match or service-owned policy: const help = query.help.pipe(Option.filter((mode) => mode === "errors"), Option.map(() => helpPayload)); return ResponseSchema.make({ calculatorId, help }); Do not write ...(condition ? { help } : {}).',
    },
    type: "problem",
  },
};

const contextFieldNames = new Set(["jurisdiction", "taxYear"]);

const contextFieldName = (node) => {
  if (node?.type !== "MemberExpression") {
    return null;
  }

  if (node.property?.type === "Identifier") {
    return node.property.name;
  }

  if (node.property?.type === "Literal") {
    return String(node.property.value);
  }

  return null;
};

const noContextNullishDefault = {
  create(context) {
    return {
      LogicalExpression(node) {
        if (
          node.operator === "??" &&
          contextFieldNames.has(contextFieldName(node.left))
        ) {
          context.report({
            messageId: "noContextNullishDefault",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow jurisdiction or tax-year defaults in calculator service code.",
    },
    messages: {
      noContextNullishDefault:
        'Do not invent missing jurisdiction or taxYear with ??. Calculator context must come from canonical config/request schemas. Missing context must stay Option.none or fail with a tagged service error: payload.jurisdiction.pipe(Option.match({ onNone: () => Effect.fail(new MissingJurisdiction()), onSome: useJurisdiction })). Only use defaults declared by the owning Schema, never payload.jurisdiction ?? "AU".',
    },
    type: "problem",
  },
};

const nativeArrayMethods = new Set([
  "concat",
  "every",
  "filter",
  "find",
  "findIndex",
  "flat",
  "flatMap",
  "forEach",
  "map",
  "reduce",
  "reduceRight",
  "slice",
  "some",
  "sort",
]);

const effectCollectionNamespaces = new Set([
  "Array",
  "Chunk",
  "Effect",
  "HashMap",
  "HashSet",
  "Option",
  "Record",
]);

const propertyName = (node) => {
  if (node?.type === "Identifier") {
    return node.name;
  }

  if (node?.type === "Literal") {
    return String(node.value);
  }

  return null;
};

const sourceFileName = (context) =>
  context.filename ?? context.getFilename?.() ?? "";

const isEffectCollectionNamespaceCall = (callee) =>
  callee?.type === "MemberExpression" &&
  callee.object?.type === "Identifier" &&
  effectCollectionNamespaces.has(callee.object.name);

const isMemberCall = (node, objectName, methodName) =>
  node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  node.callee.object?.type === "Identifier" &&
  node.callee.object.name === objectName &&
  propertyName(node.callee.property) === methodName;

const noNativeArrayMethods = {
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee?.type === "MemberExpression" &&
          !isEffectCollectionNamespaceCall(node.callee) &&
          nativeArrayMethods.has(propertyName(node.callee.property))
        ) {
          context.report({
            messageId: "noNativeArrayMethods",
            node: node.callee.property,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow native array method pipelines in Effect-native service code.",
    },
    messages: {
      noNativeArrayMethods:
        "Do not use native array methods in calculator services. Use Effect Array or Chunk so collection policy is explicit and pipeable: Array.filter(items, predicate), Array.map(items, toValue), Chunk.fromIterable(items).pipe(Chunk.map(toValue)). For optional lookup use Array.findFirst(...).pipe(Option.match(...)), not items.find(...).",
    },
    type: "problem",
  },
};

const noNestedWrapperCalls = {
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee?.type === "Identifier" &&
          node.arguments.some((argument) => argument?.type === "CallExpression")
        ) {
          context.report({
            messageId: "noNestedWrapperCalls",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow nested wrapper-call composition in calculator service code.",
    },
    messages: {
      noNestedWrapperCalls:
        "Do not compose calculator transformations as nested wrapper calls like toResponse(filterEntries(query)). Use pipe-first data flow when sequencing transformations: query.pipe(filterEntries, toResponse) or pipe(query, filterEntries, toResponse). Keep inline Effect error transforms at the callsite with .pipe(Effect.mapError(...), Effect.catchTag(...)).",
    },
    type: "problem",
  },
};

const nativeCollectionConstructors = new Set([
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
]);

const noNativeCollections = {
  create(context) {
    return {
      NewExpression(node) {
        if (
          node.callee?.type === "Identifier" &&
          nativeCollectionConstructors.has(node.callee.name)
        ) {
          context.report({
            messageId: "noNativeCollections",
            node: node.callee,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow native Map and Set constructors in Effect-native service code.",
    },
    messages: {
      noNativeCollections:
        "Do not use native Map/Set in calculator services. Use Effect HashMap and HashSet so lookups, equality, and absence are typed: HashMap.empty<Key, Value>().pipe(HashMap.set(key, value)); HashMap.get(map, key).pipe(Option.match(...)); HashSet.fromIterable(ids).",
    },
    type: "problem",
  },
};

const serviceFileNamePattern = /(^|[/\\])(service|services)\.ts$/u;
const layerExportNamePattern = /(Live|Mock|Test|TestLive)$/u;

const noLayerExportsInServiceFiles = {
  create(context) {
    const fileName = sourceFileName(context);

    if (!serviceFileNamePattern.test(fileName)) {
      return {};
    }

    return {
      ExportNamedDeclaration(node) {
        const { declaration } = node;

        if (declaration?.type !== "VariableDeclaration") {
          return;
        }

        for (const declarator of declaration.declarations) {
          if (
            declarator.id?.type === "Identifier" &&
            layerExportNamePattern.test(declarator.id.name)
          ) {
            context.report({
              messageId: "noLayerExportsInServiceFiles",
              node: declarator.id,
            });
          }
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow Live/Mock/Test layer exports from service definition files.",
    },
    messages: {
      noLayerExportsInServiceFiles:
        "Do not export Live, Mock, or Test layers from service definition files. service.ts owns the Context.Service contract and canonical request/error schemas. Put production wiring in live.layer.ts, test wiring in test.layer.ts or test helpers, then compose layers at package/app boundaries.",
    },
    type: "problem",
  },
};

const noThrow = {
  create(context) {
    return {
      ThrowStatement(node) {
        context.report({
          messageId: "noThrow",
          node,
        });
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow thrown exceptions in Effect-native service code.",
    },
    messages: {
      noThrow:
        'Do not throw from calculator services. Model failures as tagged errors and return them through Effect: class MissingFact extends Data.TaggedError("MissingFact")<{ readonly factId: FactId }>() {}; return Effect.fail(new MissingFact({ factId })). At boundaries, use Effect.try/Effect.tryPromise with catch mapping to tagged errors.',
    },
    type: "problem",
  },
};

const runtimeBoundaryPattern =
  /(^|[/\\])(index|main|server|runtime(\.(client|server))?|.*\.runtime|.*\.layer)\.ts$/u;

const isRuntimeExecutionCall = (node) =>
  node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  node.callee.object?.type === "Identifier" &&
  ((node.callee.object.name === "Effect" &&
    [
      "runFork",
      "runPromise",
      "runPromiseExit",
      "runSync",
      "runSyncExit",
    ].includes(propertyName(node.callee.property))) ||
    (node.callee.object.name === "ManagedRuntime" &&
      propertyName(node.callee.property) === "make") ||
    (node.callee.object.name === "BunRuntime" &&
      propertyName(node.callee.property) === "runMain"));

const noRuntimeExecutionOutsideBoundaries = {
  create(context) {
    const fileName = sourceFileName(context);

    return {
      CallExpression(node) {
        if (
          isRuntimeExecutionCall(node) &&
          !runtimeBoundaryPattern.test(fileName)
        ) {
          context.report({
            messageId: "noRuntimeExecutionOutsideBoundaries",
            node: node.callee,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Restrict Effect runtime execution to app/runtime boundary files.",
    },
    messages: {
      noRuntimeExecutionOutsideBoundaries:
        "Do not execute Effects or create ManagedRuntime inside package/service logic. Runtime execution belongs in app entrypoints, runtime files, server files, or layer boundary modules. Services should return Effect values and expose Layers; apps run them with BunRuntime.runMain or a module-scoped ManagedRuntime that is disposed by the owning runtime lifecycle.",
    },
    type: "problem",
  },
};

const noAsyncAwaitPromise = {
  create(context) {
    return {
      AwaitExpression(node) {
        context.report({
          messageId: "noAwait",
          node,
        });
      },
      FunctionDeclaration(node) {
        if (node.async) {
          context.report({
            messageId: "noAsync",
            node,
          });
        }
      },
      FunctionExpression(node) {
        if (node.async) {
          context.report({
            messageId: "noAsync",
            node,
          });
        }
      },
      NewExpression(node) {
        if (
          node.callee?.type === "Identifier" &&
          node.callee.name === "Promise"
        ) {
          context.report({
            messageId: "noPromise",
            node: node.callee,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow async, await, and new Promise in Effect-native service code.",
    },
    messages: {
      noAsync:
        "Do not use async functions in calculator services. Return Effect values directly: const program = Effect.gen(function* () { const value = yield* service.read(...); return value; }). Use Effect.promise/Effect.tryPromise only at external boundaries and map errors inline to tagged errors.",
      noAwait:
        "Do not await inside calculator services. Compose Effects with pipe, Effect.gen, Effect.flatMap, Effect.all, and Layer-provided services. Boundary promises must enter through Effect.tryPromise with inline tagged-error mapping.",
      noPromise:
        "Do not construct Promise in calculator services. Use Effect.async for callback APIs, Effect.promise for infallible promise boundaries, or Effect.tryPromise with inline tagged-error mapping for fallible boundaries.",
    },
    type: "problem",
  },
};

const noJsonParseStringify = {
  create(context) {
    return {
      CallExpression(node) {
        if (isMemberCall(node, "JSON", "parse")) {
          context.report({
            messageId: "noJsonParse",
            node: node.callee,
          });
        }

        if (isMemberCall(node, "JSON", "stringify")) {
          context.report({
            messageId: "noJsonStringify",
            node: node.callee,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow ad hoc JSON parse/stringify in schema-owned service code.",
    },
    messages: {
      noJsonParse:
        "Do not JSON.parse calculator inputs directly. Decode unknown JSON through the owning Schema: Schema.decodeUnknown(CalculatorRequest)(value), or Schema.decodeJson(CalculatorRequest)(text) at an HTTP/file boundary, then map ParseResult errors to tagged service errors.",
      noJsonStringify:
        "Do not JSON.stringify calculator outputs directly. Encode through the owning Schema at the boundary: Schema.encode(CalculatorResponse)(value) or Schema.encodeJson(CalculatorResponse)(value), keeping response shape owned by Schema.",
    },
    type: "problem",
  },
};

const noAmbientTimeOrRandom = {
  create(context) {
    return {
      CallExpression(node) {
        if (isMemberCall(node, "Date", "now")) {
          context.report({
            messageId: "noDateNow",
            node: node.callee,
          });
        }

        if (isMemberCall(node, "Math", "random")) {
          context.report({
            messageId: "noMathRandom",
            node: node.callee,
          });
        }
      },
      NewExpression(node) {
        if (node.callee?.type === "Identifier" && node.callee.name === "Date") {
          context.report({
            messageId: "noNewDate",
            node: node.callee,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow ambient time and randomness in deterministic calculator service code.",
    },
    messages: {
      noDateNow:
        "Do not read ambient time with Date.now in calculator services. Time must be explicit input, canonical config, or an Effect Clock dependency at the boundary: yield* Clock.currentTimeMillis. Deterministic tax calculations must not hide clock reads.",
      noMathRandom:
        "Do not use Math.random in calculator services. Randomness must be explicit input or an Effect Random dependency at the boundary, and deterministic calculators should avoid randomness entirely.",
      noNewDate:
        "Do not construct Date from ambient state in calculator services. Dates and tax years must come from canonical schemas/config. For boundary time, use Effect Clock and convert through canonical Schema-owned date/year types.",
    },
    type: "problem",
  },
};

const effectSchemaRuntimeDecoderNames = new Set([
  "decodeEffect",
  "decodeExit",
  "decodeOption",
  "decodePromise",
  "decodeResult",
  "decodeSync",
  "decodeUnknownEffect",
  "decodeUnknownExit",
  "decodeUnknownOption",
  "decodeUnknownPromise",
  "decodeUnknownResult",
  "decodeUnknownSync",
]);

const isDecoderCallName = (name) =>
  name === "decode" || /^decode[A-Z]/u.test(name ?? "");

const importName = (node) => {
  if (node?.type === "Identifier") {
    return node.name;
  }

  if (node?.type === "Literal") {
    return String(node.value);
  }

  return null;
};

const localBindingName = (node) =>
  node?.type === "Identifier" ? node.name : null;

const isEffectSchemaMember = (node, schemaBindings) =>
  node?.type === "MemberExpression" &&
  node.object?.type === "Identifier" &&
  schemaBindings.has(node.object.name) &&
  effectSchemaRuntimeDecoderNames.has(propertyName(node.property));

const trackSchemaAlias = (node, schemaBindings) => {
  const bindingName = localBindingName(node.id);

  if (
    bindingName !== null &&
    node.init?.type === "Identifier" &&
    schemaBindings.has(node.init.name)
  ) {
    schemaBindings.add(bindingName);
  }
};

const trackStaticDecoderAlias = (
  node,
  schemaBindings,
  decoderBindings,
  report
) => {
  const bindingName = localBindingName(node.id);

  if (bindingName === null) {
    return;
  }

  if (isEffectSchemaMember(node.init, schemaBindings)) {
    decoderBindings.add(bindingName);
    report(node.init);
    return;
  }

  if (node.init?.type === "Identifier" && decoderBindings.has(node.init.name)) {
    decoderBindings.add(bindingName);
    report(node.init);
  }
};

const trackDestructuredDecoderAliases = (
  node,
  schemaBindings,
  decoderBindings,
  report
) => {
  if (
    node.id?.type !== "ObjectPattern" ||
    node.init?.type !== "Identifier" ||
    !schemaBindings.has(node.init.name)
  ) {
    return;
  }

  for (const property of node.id.properties ?? []) {
    if (property.type !== "Property") {
      continue;
    }

    const decoderName = propertyName(property.key);
    const extractedName = localBindingName(property.value);

    if (
      extractedName !== null &&
      effectSchemaRuntimeDecoderNames.has(decoderName)
    ) {
      decoderBindings.add(extractedName);
      report(property);
    }
  }
};

const noDecodingOutsideBoundaries = {
  create(context) {
    const schemaBindings = new Set();
    const decoderBindings = new Set();

    const report = (node) =>
      context.report({
        messageId: "noDecodingOutsideBoundaries",
        node,
      });

    return {
      CallExpression(node) {
        if (node.callee?.type === "Identifier") {
          if (
            decoderBindings.has(node.callee.name) ||
            isDecoderCallName(node.callee.name)
          ) {
            report(node.callee);
          }

          return;
        }

        if (node.callee?.type !== "MemberExpression") {
          return;
        }

        const memberName = propertyName(node.callee.property);

        if (
          memberName === "decodeTo" &&
          node.callee.object?.type === "Identifier" &&
          schemaBindings.has(node.callee.object.name)
        ) {
          return;
        }

        if (
          isEffectSchemaMember(node.callee, schemaBindings) ||
          isDecoderCallName(memberName)
        ) {
          report(node.callee.property);
        }
      },
      ImportDeclaration(node) {
        const source = importName(node.source);

        for (const specifier of node.specifiers ?? []) {
          const localName = localBindingName(specifier.local);

          if (localName === null) {
            continue;
          }

          if (
            source === "effect" &&
            specifier.type === "ImportSpecifier" &&
            importName(specifier.imported) === "Schema"
          ) {
            schemaBindings.add(localName);
          }

          if (source === "effect/Schema") {
            if (specifier.type === "ImportNamespaceSpecifier") {
              schemaBindings.add(localName);
            }

            if (
              specifier.type === "ImportSpecifier" &&
              effectSchemaRuntimeDecoderNames.has(
                importName(specifier.imported)
              )
            ) {
              decoderBindings.add(localName);
            }
          }
        }
      },
      VariableDeclarator(node) {
        trackSchemaAlias(node, schemaBindings);
        trackStaticDecoderAlias(node, schemaBindings, decoderBindings, report);
        trackDestructuredDecoderAliases(
          node,
          schemaBindings,
          decoderBindings,
          report
        );
      },
    };
  },
  meta: {
    docs: {
      description:
        "Restrict executable decoders to reviewed trust and type-erasure boundary files.",
    },
    messages: {
      noDecodingOutsideBoundaries:
        "Executable decoding belongs only at an explicit trust or type-erasure boundary. Move this operation to the owning boundary module or add that exact reviewed file to decodingBoundaryFiles in oxlint.config.ts. See docs/architecture/effect-services.md.",
    },
    type: "problem",
  },
};

const routeConsumerFunctionTypes = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const routeTransportDeclaredVariable = (sourceCode, node, name) =>
  sourceCode
    .getDeclaredVariables(node)
    .find((variable) => variable.name === name) ?? null;

const isRouteTransportReference = (variable, identifier) =>
  variable !== null &&
  identifier?.type === "Identifier" &&
  variable.references.some((reference) => reference.identifier === identifier);

const isReassignedRouteTransportVariable = (variable) =>
  variable.references.some((reference) => reference.isWrite?.());

const referencesRouteTransportVariable = (variables, identifier) =>
  variables.some((variable) => isRouteTransportReference(variable, identifier));

const routeConsumerFunction = (node) => {
  let current = node?.parent;

  while (current !== undefined && current !== null) {
    if (routeConsumerFunctionTypes.has(current.type)) {
      return current;
    }

    current = current.parent;
  }

  return null;
};

const isTopLevelRouteConsumerDeclaration = (node) => {
  const declaration =
    node.parent?.type === "VariableDeclaration" ? node.parent : node;
  const owner = declaration.parent;

  return (
    owner?.type === "Program" ||
    (owner?.type === "ExportNamedDeclaration" &&
      owner.parent?.type === "Program")
  );
};

const routeDefinitionOptions = (node, canonicalImports) => {
  const createFileRouteVariable = canonicalImports.get("createFileRoute");

  if (
    createFileRouteVariable === undefined ||
    node.init?.type !== "CallExpression" ||
    node.init.callee?.type !== "CallExpression" ||
    node.init.callee.callee?.type !== "Identifier" ||
    !isRouteTransportReference(createFileRouteVariable, node.init.callee.callee)
  ) {
    return null;
  }

  const [options] = node.init.arguments;
  return options?.type === "ObjectExpression" ? options : null;
};

const routeConsumerCanonicalImports = (importDeclarations, sourceCode) => {
  const canonicalImports = new Map();

  for (const declaration of importDeclarations) {
    const source = importName(declaration.source);

    for (const specifier of declaration.specifiers ?? []) {
      if (
        declaration.importKind === "type" ||
        specifier.type !== "ImportSpecifier" ||
        specifier.importKind === "type"
      ) {
        continue;
      }

      const importedName = importName(specifier.imported);
      const localName = localBindingName(specifier.local);

      if (
        importedName === localName &&
        ((source === "@tanstack/react-router" &&
          importedName === "createFileRoute") ||
          (source === "effect" &&
            (importedName === "Option" || importedName === "Result")))
      ) {
        const variable = routeTransportDeclaredVariable(
          sourceCode,
          specifier,
          localName
        );

        if (variable !== null) {
          canonicalImports.set(importedName, variable);
        }
      }
    }
  }

  return canonicalImports;
};

const isRouteUseLoaderDataCall = (node, routeVariable) =>
  node?.type === "CallExpression" &&
  node.arguments.length === 0 &&
  node.callee?.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.object?.type === "Identifier" &&
  isRouteTransportReference(routeVariable, node.callee.object) &&
  propertyName(node.callee.property) === "useLoaderData";

const headLoaderDataBinding = (functionNode, sourceCode) => {
  const [parameter] = functionNode.params ?? [];

  if (parameter?.type !== "ObjectPattern") {
    return null;
  }

  for (const property of parameter.properties ?? []) {
    if (
      property.type === "Property" &&
      propertyName(property.key) === "loaderData" &&
      property.value?.type === "Identifier" &&
      property.value.name === "loaderData"
    ) {
      const variable = routeTransportDeclaredVariable(
        sourceCode,
        functionNode,
        property.value.name
      );

      return variable === null
        ? null
        : { identifier: property.value, variable };
    }
  }

  return null;
};

const isOptionFromUndefinedOrCall = (
  node,
  loaderDataVariable,
  optionVariable
) =>
  node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.object?.type === "Identifier" &&
  isRouteTransportReference(optionVariable, node.callee.object) &&
  propertyName(node.callee.property) === "fromUndefinedOr" &&
  node.arguments.length === 1 &&
  node.arguments[0]?.type === "Identifier" &&
  isRouteTransportReference(loaderDataVariable, node.arguments[0]);

const isOptionGetOrElseCall = (node, optionVariable) =>
  node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.object?.type === "Identifier" &&
  isRouteTransportReference(optionVariable, node.callee.object) &&
  propertyName(node.callee.property) === "getOrElse" &&
  node.arguments.length === 1;

const isNormalisedHeadLoaderData = (
  node,
  loaderDataVariable,
  canonicalImports
) => {
  const optionVariable = canonicalImports.get("Option");

  return (
    optionVariable !== undefined &&
    node?.type === "CallExpression" &&
    node.callee?.type === "MemberExpression" &&
    !node.callee.computed &&
    propertyName(node.callee.property) === "pipe" &&
    isOptionFromUndefinedOrCall(
      node.callee.object,
      loaderDataVariable,
      optionVariable
    ) &&
    node.arguments.length === 1 &&
    isOptionGetOrElseCall(node.arguments[0], optionVariable)
  );
};

const routeConsumerLocalDeclarator = (
  identifier,
  functionNode,
  sourceCode,
  variableDeclarators
) => {
  const matches = variableDeclarators.filter(
    (declarator) =>
      declarator.id?.type === "Identifier" &&
      routeConsumerFunction(declarator) === functionNode &&
      isRouteTransportReference(
        routeTransportDeclaredVariable(
          sourceCode,
          declarator,
          declarator.id.name
        ),
        identifier
      )
  );

  return matches.length === 1 ? matches[0] : null;
};

const isResultMatchCallee = (node, resultVariable) =>
  node?.type === "MemberExpression" &&
  !node.computed &&
  node.object?.type === "Identifier" &&
  isRouteTransportReference(resultVariable, node.object) &&
  propertyName(node.property) === "match";

const isResultMatchFor = (node, resultValue, resultBinding, resultVariable) =>
  node?.type === "CallExpression" &&
  isResultMatchCallee(node.callee, resultVariable) &&
  (node.arguments[0] === resultValue ||
    (resultValue?.type === "Identifier" &&
      node.arguments[0]?.type === "Identifier" &&
      isRouteTransportReference(resultBinding, node.arguments[0])));

const isInsideJsxExpression = (node, functionNode) => {
  let current = node.parent;

  while (
    current !== undefined &&
    current !== null &&
    current !== functionNode
  ) {
    if (current.type === "JSXExpressionContainer") {
      return true;
    }

    current = current.parent;
  }

  return false;
};

const directRouteBoundaryBinding = (specifier, sourceCode) => {
  if (specifier.type !== "ImportSpecifier") {
    return null;
  }

  const localName = localBindingName(specifier.local);
  return importName(specifier.imported) === localName
    ? routeTransportDeclaredVariable(sourceCode, specifier, localName)
    : null;
};

const routeTransportBoundaryBindings = ({
  boundaryModules,
  callExpressions,
  importDeclarations,
  importExpressions,
  report,
  sourceCode,
}) => {
  const boundaryBindings = new Set();

  for (const declaration of importDeclarations) {
    if (!boundaryModules.has(importName(declaration.source))) {
      continue;
    }

    for (const specifier of declaration.specifiers ?? []) {
      if (
        declaration.importKind === "type" ||
        specifier.importKind === "type"
      ) {
        continue;
      }

      const boundaryBinding = directRouteBoundaryBinding(specifier, sourceCode);

      if (boundaryBinding === null) {
        report("unsupportedBoundaryImport", specifier);
      } else {
        boundaryBindings.add(boundaryBinding);
      }
    }
  }

  for (const expression of importExpressions) {
    if (boundaryModules.has(importName(expression.source))) {
      report("unsupportedBoundaryImport", expression);
    }
  }

  for (const call of callExpressions) {
    const importsBoundary =
      call.callee?.type === "Import" &&
      boundaryModules.has(importName(call.arguments[0]));
    const requiresBoundary =
      call.callee?.type === "Identifier" &&
      call.callee.name === "require" &&
      boundaryModules.has(importName(call.arguments[0]));

    if (importsBoundary || requiresBoundary) {
      report("unsupportedBoundaryImport", call);
    }
  }

  return boundaryBindings;
};

const isCanonicalRestoreMemberObject = (identifier) =>
  identifier.parent?.type === "MemberExpression" &&
  identifier.parent.object === identifier &&
  propertyName(identifier.parent.property) === "restore";

const isRouteBoundaryTypeQuery = (identifier) => {
  let current = identifier.parent;

  while (current !== undefined && current !== null) {
    if (current.type === "TSTypeQuery") {
      return true;
    }

    if (
      current.type === "Program" ||
      current.type.endsWith("Statement") ||
      routeConsumerFunctionTypes.has(current.type)
    ) {
      return false;
    }

    current = current.parent;
  }

  return false;
};

const reportUnsupportedRouteBoundaryReferences = ({
  boundaryBindings,
  report,
}) => {
  for (const binding of boundaryBindings) {
    for (const reference of binding.references) {
      if (
        !isRouteBoundaryTypeQuery(reference.identifier) &&
        !isCanonicalRestoreMemberObject(reference.identifier)
      ) {
        report("indirectRestoreReference", reference.identifier);
      }
    }
  }
};

const sameFileRouteConsumerFunctions = ({
  functionDeclarations,
  sourceCode,
  variableDeclarators,
}) => {
  const namedFunctions = [];

  for (const declaration of functionDeclarations) {
    if (
      declaration.id?.type === "Identifier" &&
      isTopLevelRouteConsumerDeclaration(declaration)
    ) {
      const variable = routeTransportDeclaredVariable(
        sourceCode,
        declaration,
        declaration.id.name
      );

      if (variable !== null) {
        namedFunctions.push({ functionNode: declaration, variable });
      }
    }
  }

  for (const declarator of variableDeclarators) {
    if (
      declarator.id?.type === "Identifier" &&
      routeConsumerFunctionTypes.has(declarator.init?.type) &&
      isTopLevelRouteConsumerDeclaration(declarator)
    ) {
      const variable = routeTransportDeclaredVariable(
        sourceCode,
        declarator,
        declarator.id.name
      );

      if (variable !== null) {
        namedFunctions.push({ functionNode: declarator.init, variable });
      }
    }
  }

  return namedFunctions;
};

const routeConsumerPropertyFunction = (property, namedFunctions) => {
  if (routeConsumerFunctionTypes.has(property.value?.type)) {
    return property.value;
  }

  if (property.value?.type === "Identifier") {
    return (
      namedFunctions.find(({ variable }) =>
        isRouteTransportReference(variable, property.value)
      )?.functionNode ?? null
    );
  }

  return null;
};

const configuredRouteConsumers = ({
  canonicalImports,
  isConfiguredConsumerFile,
  namedFunctions,
  report,
  sourceCode,
  variableDeclarators,
}) => {
  const routeConsumers = [];
  let routeDefinitionCount = 0;

  if (!isConfiguredConsumerFile) {
    return { routeConsumers, routeDefinitionCount };
  }

  for (const declarator of variableDeclarators) {
    const optionsNode = routeDefinitionOptions(declarator, canonicalImports);

    if (optionsNode === null) {
      continue;
    }

    routeDefinitionCount += 1;

    if (declarator.id?.type !== "Identifier") {
      report("unresolvedRouteConsumer", declarator.id);
      continue;
    }

    const routeVariable = routeTransportDeclaredVariable(
      sourceCode,
      declarator,
      declarator.id.name
    );

    if (routeVariable === null) {
      report("unresolvedRouteConsumer", declarator.id);
      continue;
    }

    for (const property of optionsNode.properties ?? []) {
      if (property.type !== "Property") {
        continue;
      }

      const kind = propertyName(property.key);
      if (kind !== "component" && kind !== "head") {
        continue;
      }

      const functionNode = routeConsumerPropertyFunction(
        property,
        namedFunctions
      );

      if (functionNode === null) {
        report("unresolvedRouteConsumer", property.value);
        continue;
      }

      routeConsumers.push({
        functionNode,
        kind,
        routeVariable,
      });
    }
  }

  return { routeConsumers, routeDefinitionCount };
};

const canonicalRouteRestoreCalls = ({
  boundaryBindings,
  memberExpressions,
  report,
}) => {
  const directRestoreCalls = [];

  for (const member of memberExpressions) {
    if (
      member.object?.type !== "Identifier" ||
      !referencesRouteTransportVariable([...boundaryBindings], member.object) ||
      propertyName(member.property) !== "restore"
    ) {
      continue;
    }

    if (
      member.computed ||
      member.optional ||
      member.parent?.type !== "CallExpression" ||
      member.parent.optional ||
      member.parent.callee !== member
    ) {
      report("indirectRestoreReference", member);
      continue;
    }

    directRestoreCalls.push(member.parent);
  }

  return directRestoreCalls;
};

const componentRestoreInput = ({
  consumer,
  restoreCall,
  sourceCode,
  variableDeclarators,
}) => {
  const [restoreInput] = restoreCall.arguments;

  if (
    restoreCall.arguments.length === 1 &&
    isRouteUseLoaderDataCall(restoreInput, consumer.routeVariable)
  ) {
    return { loaderVariable: null, valid: true };
  }

  if (
    restoreCall.arguments.length !== 1 ||
    restoreInput?.type !== "Identifier"
  ) {
    return { loaderVariable: null, valid: false };
  }

  const loaderDeclarator = routeConsumerLocalDeclarator(
    restoreInput,
    consumer.functionNode,
    sourceCode,
    variableDeclarators
  );
  const valid =
    loaderDeclarator?.parent?.kind === "const" &&
    isRouteUseLoaderDataCall(loaderDeclarator.init, consumer.routeVariable);

  const loaderVariable = valid
    ? routeTransportDeclaredVariable(
        sourceCode,
        loaderDeclarator,
        loaderDeclarator.id.name
      )
    : null;

  return {
    loaderVariable,
    valid,
  };
};

const headRestoreInput = ({
  canonicalImports,
  consumer,
  restoreCall,
  sourceCode,
  variableDeclarators,
}) => {
  const [restoreInput] = restoreCall.arguments;
  const headLoaderData = headLoaderDataBinding(
    consumer.functionNode,
    sourceCode
  );

  if (
    restoreCall.arguments.length !== 1 ||
    restoreInput?.type !== "Identifier" ||
    headLoaderData === null
  ) {
    return {
      headLoaderDataVariable: headLoaderData?.variable ?? null,
      loaderVariable: null,
      valid: false,
    };
  }

  if (
    isRouteTransportReference(headLoaderData.variable, restoreInput) &&
    !isReassignedRouteTransportVariable(headLoaderData.variable)
  ) {
    return {
      headLoaderDataVariable: headLoaderData.variable,
      loaderVariable: headLoaderData.variable,
      valid: true,
    };
  }

  const loaderDeclarator = routeConsumerLocalDeclarator(
    restoreInput,
    consumer.functionNode,
    sourceCode,
    variableDeclarators
  );
  const valid =
    loaderDeclarator?.parent?.kind === "const" &&
    !isReassignedRouteTransportVariable(headLoaderData.variable) &&
    isNormalisedHeadLoaderData(
      loaderDeclarator.init,
      headLoaderData.variable,
      canonicalImports
    );

  const loaderVariable = valid
    ? routeTransportDeclaredVariable(
        sourceCode,
        loaderDeclarator,
        loaderDeclarator.id.name
      )
    : null;

  return {
    headLoaderDataVariable: headLoaderData.variable,
    loaderVariable,
    valid,
  };
};

const restoreResultDeclarator = ({
  consumer,
  restoreCall,
  variableDeclarators,
}) =>
  variableDeclarators.find(
    (declarator) =>
      declarator.init === restoreCall &&
      declarator.id?.type === "Identifier" &&
      routeConsumerFunction(declarator) === consumer.functionNode
  );

const isRestoreResultMatched = ({
  callExpressions,
  canonicalImports,
  consumer,
  restoreCall,
  resultVariable,
  resultDeclarator,
}) => {
  const resultImportVariable = canonicalImports.get("Result");

  if (resultImportVariable === undefined) {
    return false;
  }

  const resultValue = resultDeclarator?.id ?? restoreCall;

  return callExpressions.some(
    (call) =>
      routeConsumerFunction(call) === consumer.functionNode &&
      isResultMatchFor(call, resultValue, resultVariable, resultImportVariable)
  );
};

const isRouteValueAliasOrAssignment = (identifier) =>
  (identifier.parent?.type === "VariableDeclarator" &&
    identifier.parent.init === identifier) ||
  (identifier.parent?.type === "AssignmentExpression" &&
    identifier.parent.right === identifier);

const isRouteResultCallArgument = (identifier, functionNode) => {
  let current = identifier;

  while (current.parent !== undefined && current.parent !== functionNode) {
    const { parent } = current;

    if (
      parent.type === "CallExpression" &&
      parent.arguments.includes(current)
    ) {
      return { argument: current, call: parent };
    }

    current = parent;
  }

  return null;
};

const routeValueForwardingMessage = ({
  canonicalImports,
  consumer,
  forwardingBindings,
  identifier,
  restoreCall,
  resultDeclarator,
  resultVariable,
}) => {
  const forwardingBinding = forwardingBindings.find(({ variable }) =>
    isRouteTransportReference(variable, identifier)
  );

  if (forwardingBinding === undefined) {
    return null;
  }

  const resultCallArgument =
    forwardingBinding.messageId === "forwardedRouteResult"
      ? isRouteResultCallArgument(identifier, consumer.functionNode)
      : null;
  const resultImportVariable = canonicalImports.get("Result");
  const isAllowedResultMatch =
    resultCallArgument !== null &&
    resultCallArgument.argument === identifier &&
    resultImportVariable !== undefined &&
    isResultMatchFor(
      resultCallArgument.call,
      resultDeclarator?.id ?? restoreCall,
      resultVariable,
      resultImportVariable
    );

  if (isAllowedResultMatch) {
    return null;
  }

  return isInsideJsxExpression(identifier, consumer.functionNode) ||
    isRouteValueAliasOrAssignment(identifier) ||
    resultCallArgument !== null
    ? forwardingBinding.messageId
    : null;
};

const reportRouteValueForwarding = ({
  callExpressions,
  canonicalImports,
  consumer,
  headLoaderDataVariable,
  identifiers,
  loaderVariable,
  report,
  reportedForwardingNodes,
  restoreCall,
  resultDeclarator,
  resultVariable,
}) => {
  const forwardingBindings = [];

  if (loaderVariable !== null) {
    forwardingBindings.push({
      messageId: "forwardedLoaderTransport",
      variable: loaderVariable,
    });
  }

  if (
    headLoaderDataVariable !== null &&
    headLoaderDataVariable !== loaderVariable
  ) {
    forwardingBindings.push({
      messageId: "forwardedLoaderTransport",
      variable: headLoaderDataVariable,
    });
  }

  if (resultVariable !== null) {
    forwardingBindings.push({
      messageId: "forwardedRouteResult",
      variable: resultVariable,
    });
  }

  for (const identifier of identifiers) {
    const messageId = routeValueForwardingMessage({
      canonicalImports,
      consumer,
      forwardingBindings,
      identifier,
      restoreCall,
      resultDeclarator,
      resultVariable,
    });

    if (messageId !== null && !reportedForwardingNodes.has(identifier)) {
      reportedForwardingNodes.add(identifier);
      report(messageId, identifier);
    }
  }

  for (const call of callExpressions) {
    if (
      isRouteUseLoaderDataCall(call, consumer.routeVariable) &&
      restoreCall.arguments[0] !== call &&
      isInsideJsxExpression(call, consumer.functionNode) &&
      !reportedForwardingNodes.has(call)
    ) {
      reportedForwardingNodes.add(call);
      report("forwardedLoaderTransport", call);
    }
  }
};

const validateDirectRouteRestores = ({
  callExpressions,
  canonicalImports,
  directRestoreCalls,
  identifiers,
  isConfiguredConsumerFile,
  report,
  routeConsumers,
  routeDefinitionCount,
  sourceCode,
  variableDeclarators,
}) => {
  const callsByConsumer = new Map();
  const reportedForwardingNodes = new Set();

  for (const restoreCall of directRestoreCalls) {
    const functionNode = routeConsumerFunction(restoreCall);
    const matchingConsumers = routeConsumers.filter(
      (consumer) => consumer.functionNode === functionNode
    );

    if (!isConfiguredConsumerFile) {
      report("restoreOutsideConsumer", restoreCall);
      continue;
    }

    if (routeDefinitionCount === 0) {
      report("unresolvedRouteConsumer", restoreCall);
      continue;
    }

    if (matchingConsumers.length === 0) {
      report("restoreOutsideConsumer", restoreCall);
      continue;
    }

    if (matchingConsumers.length !== 1) {
      report("unresolvedRouteConsumer", restoreCall);
      continue;
    }

    const [consumer] = matchingConsumers;
    const existingCalls = callsByConsumer.get(consumer) ?? [];
    existingCalls.push(restoreCall);
    callsByConsumer.set(consumer, existingCalls);

    const restoreInput =
      consumer.kind === "component"
        ? componentRestoreInput({
            consumer,
            restoreCall,
            sourceCode,
            variableDeclarators,
          })
        : headRestoreInput({
            canonicalImports,
            consumer,
            restoreCall,
            sourceCode,
            variableDeclarators,
          });

    if (!restoreInput.valid) {
      report(
        consumer.kind === "component"
          ? "invalidComponentLoaderInput"
          : "invalidHeadLoaderInput",
        restoreCall
      );
    }

    const resultDeclarator = restoreResultDeclarator({
      consumer,
      restoreCall,
      variableDeclarators,
    });
    const resultVariable =
      resultDeclarator?.id?.type === "Identifier"
        ? routeTransportDeclaredVariable(
            sourceCode,
            resultDeclarator,
            resultDeclarator.id.name
          )
        : null;

    if (
      !isRestoreResultMatched({
        callExpressions,
        canonicalImports,
        consumer,
        restoreCall,
        resultDeclarator,
        resultVariable,
      })
    ) {
      report("restoreResultNotMatched", restoreCall);
    }

    reportRouteValueForwarding({
      callExpressions,
      canonicalImports,
      consumer,
      headLoaderDataVariable: restoreInput.headLoaderDataVariable ?? null,
      identifiers,
      loaderVariable: restoreInput.loaderVariable,
      report,
      reportedForwardingNodes,
      restoreCall,
      resultDeclarator,
      resultVariable,
    });
  }

  for (const restoreCalls of callsByConsumer.values()) {
    for (const duplicateRestore of restoreCalls.slice(1)) {
      report("multipleRestores", duplicateRestore);
    }
  }
};

const noRouteTransportRestoreOutsideConsumers = {
  create(context) {
    const [options] = context.options;
    const { sourceCode } = context;
    const boundaryModules = new Set(options.routeTransportBoundaryModules);
    const consumerFiles = new Set(
      options.routeTransportConsumerFiles.map((fileName) => resolve(fileName))
    );
    const isConfiguredConsumerFile = consumerFiles.has(
      resolve(sourceFileName(context))
    );
    const importDeclarations = [];
    const importExpressions = [];
    const callExpressions = [];
    const functionDeclarations = [];
    const identifiers = [];
    const memberExpressions = [];
    const variableDeclarators = [];

    const report = (messageId, node) =>
      context.report({
        messageId,
        node,
      });

    return {
      CallExpression(node) {
        callExpressions.push(node);
      },
      FunctionDeclaration(node) {
        functionDeclarations.push(node);
      },
      Identifier(node) {
        identifiers.push(node);
      },
      ImportDeclaration(node) {
        importDeclarations.push(node);
      },
      ImportExpression(node) {
        importExpressions.push(node);
      },
      MemberExpression(node) {
        memberExpressions.push(node);
      },
      "Program:exit"() {
        const canonicalImports = routeConsumerCanonicalImports(
          importDeclarations,
          sourceCode
        );
        const boundaryBindings = routeTransportBoundaryBindings({
          boundaryModules,
          callExpressions,
          importDeclarations,
          importExpressions,
          report,
          sourceCode,
        });
        reportUnsupportedRouteBoundaryReferences({
          boundaryBindings,
          report,
        });

        const namedFunctions = sameFileRouteConsumerFunctions({
          functionDeclarations,
          sourceCode,
          variableDeclarators,
        });
        const { routeConsumers, routeDefinitionCount } =
          configuredRouteConsumers({
            canonicalImports,
            isConfiguredConsumerFile,
            namedFunctions,
            report,
            sourceCode,
            variableDeclarators,
          });
        const directRestoreCalls = canonicalRouteRestoreCalls({
          boundaryBindings,
          memberExpressions,
          report,
        });

        validateDirectRouteRestores({
          callExpressions,
          canonicalImports,
          directRestoreCalls,
          identifiers,
          isConfiguredConsumerFile,
          report,
          routeConsumers,
          routeDefinitionCount,
          sourceCode,
          variableDeclarators,
        });
      },
      VariableDeclarator(node) {
        variableDeclarators.push(node);
      },
    };
  },
  meta: {
    docs: {
      description:
        "Restrict canonical loader transport restoration to direct route consumers.",
    },
    messages: {
      forwardedLoaderTransport:
        "Do not forward encoded loader transport into JSX composition. Restore it in this direct route consumer, match the Result, and pass only focused canonical values to children.",
      forwardedRouteResult:
        "Do not forward the restored route Result into JSX composition. Match it in this direct route consumer and pass only focused canonical values to children.",
      indirectRestoreReference:
        "Canonical route transport restore must be a direct non-computed member call. Do not alias, destructure, extract, compute, pass as a callback, or invoke it through call, apply, or bind.",
      invalidComponentLoaderInput:
        "A route component restore must consume its Route.useLoaderData() call directly or one const local binding initialised directly from that call. getRouteApi, props, context, aliases, reassignment, closures, and forwarded values are not route transport inputs.",
      invalidHeadLoaderInput:
        "A route head restore must consume its loaderData parameter directly or one const local binding normalised from it with Effect Option.fromUndefinedOr and Option.getOrElse.",
      multipleRestores:
        "Restore loader transport once per direct route consumer invocation. Remove this additional canonical restore call.",
      restoreOutsideConsumer:
        "Canonical route transport restore is allowed only in the exact inline or statically referenced same-file createFileRoute component or head consumer. Ordinary components, leaves, hooks, helpers, callbacks, and providers must receive canonical values.",
      restoreResultNotMatched:
        "Match the restored Result in this direct route consumer with Result.match before composing children. Do not return or forward the whole route Result.",
      unresolvedRouteConsumer:
        "The createFileRoute route or component/head binding could not be resolved statically. Use an inline consumer or a direct same-file named function binding.",
      unsupportedBoundaryImport:
        "Import canonical route boundaries with direct, unaliased named imports. Namespace, default, aliased, dynamic, and CommonJS forms fail closed.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          routeTransportBoundaryModules: {
            items: { type: "string" },
            minItems: 1,
            type: "array",
            uniqueItems: true,
          },
          routeTransportConsumerFiles: {
            items: { type: "string" },
            minItems: 1,
            type: "array",
            uniqueItems: true,
          },
        },
        required: [
          "routeTransportBoundaryModules",
          "routeTransportConsumerFiles",
        ],
        type: "object",
      },
    ],
    type: "problem",
  },
};

export default {
  meta: {
    name: "whattax",
  },
  rules: {
    "no-ambient-time-or-random": noAmbientTimeOrRandom,
    "no-async-await-promise": noAsyncAwaitPromise,
    "no-conditional-object-spread": noConditionalObjectSpread,
    "no-context-nullish-default": noContextNullishDefault,
    "no-decoding-outside-boundaries": noDecodingOutsideBoundaries,
    "no-in-operator": noInOperator,
    "no-instanceof": noInstanceof,
    "no-json-parse-stringify": noJsonParseStringify,
    "no-layer-exports-in-service-files": noLayerExportsInServiceFiles,
    "no-manual-tag": noManualTag,
    "no-native-array-methods": noNativeArrayMethods,
    "no-native-collections": noNativeCollections,
    "no-nested-wrapper-calls": noNestedWrapperCalls,
    "no-nullish-comparison": noNullishComparison,
    "no-route-transport-restore-outside-consumers":
      noRouteTransportRestoreOutsideConsumers,
    "no-runtime-execution-outside-boundaries":
      noRuntimeExecutionOutsideBoundaries,
    "no-throw": noThrow,
    "no-typeof": noTypeof,
    "no-undefined-comparison": noUndefinedComparison,
  },
};
