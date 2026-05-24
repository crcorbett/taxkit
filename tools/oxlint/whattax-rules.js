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

export default {
  meta: {
    name: "whattax",
  },
  rules: {
    "no-ambient-time-or-random": noAmbientTimeOrRandom,
    "no-async-await-promise": noAsyncAwaitPromise,
    "no-conditional-object-spread": noConditionalObjectSpread,
    "no-context-nullish-default": noContextNullishDefault,
    "no-in-operator": noInOperator,
    "no-instanceof": noInstanceof,
    "no-json-parse-stringify": noJsonParseStringify,
    "no-layer-exports-in-service-files": noLayerExportsInServiceFiles,
    "no-manual-tag": noManualTag,
    "no-native-array-methods": noNativeArrayMethods,
    "no-native-collections": noNativeCollections,
    "no-nested-wrapper-calls": noNestedWrapperCalls,
    "no-nullish-comparison": noNullishComparison,
    "no-runtime-execution-outside-boundaries":
      noRuntimeExecutionOutsideBoundaries,
    "no-throw": noThrow,
    "no-typeof": noTypeof,
    "no-undefined-comparison": noUndefinedComparison,
  },
};
