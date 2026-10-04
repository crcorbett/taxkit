import nodePath from "node:path";

import {
  Array as EffectArray,
  HashMap,
  HashSet,
  MutableRef,
  Option,
  Ref,
  Result,
  Schema,
} from "effect";
import { forEach } from "effect/Array";

import {
  createBindingTracker,
  referenceIdentity,
  syntaxParents,
} from "./binding-tracker.ts";
import type {
  ImportSemantic,
  OxlintContext,
  OxlintRule,
  OxlintSourceCode,
  SyntaxKind,
  SyntaxNode,
  SyntaxVariable,
} from "./host.types.js";

const { resolve } = nodePath;
const firstArgument = (node: SyntaxKind<"CallExpression" | "NewExpression">) =>
  Option.getOrUndefined(EffectArray.head(node.arguments ?? []));
const noTypeof: OxlintRule = {
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

const noInstanceof: OxlintRule = {
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

const noInOperator: OxlintRule = {
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

const isUndefinedIdentifier = (node: SyntaxNode | null | undefined) =>
  node?.type === "Identifier" && node.name === "undefined";

const isNullLiteral = (node: SyntaxNode | null | undefined) =>
  node?.type === "Literal" && node.value === null;

const noUndefinedComparison: OxlintRule = {
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

const noNullishComparison: OxlintRule = {
  create(context) {
    return {
      BinaryExpression(node) {
        if (
          EffectArray.contains(["==", "!=", "===", "!=="], node.operator) &&
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

const isConditionalObjectSpread = (node: SyntaxNode | null | undefined) =>
  node?.type === "ConditionalExpression" || node?.type === "LogicalExpression";

const noConditionalObjectSpread: OxlintRule = {
  create(context) {
    return {
      SpreadElement(node) {
        if (
          node.parent?.type === "ObjectExpression" &&
          isConditionalObjectSpread(node.argument)
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

const contextFieldNames = HashSet.fromIterable(["jurisdiction", "taxYear"]);

const contextFieldName = (node: SyntaxNode | null | undefined) => {
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

const noContextNullishDefault: OxlintRule = {
  create(context) {
    return {
      LogicalExpression(node) {
        if (
          node.operator === "??" &&
          HashSet.has(contextFieldNames, contextFieldName(node.left))
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

const nativeArrayMethods = HashSet.fromIterable([
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

const effectCollectionNamespaces = HashSet.fromIterable([
  "Array",
  "Chunk",
  "Effect",
  "HashMap",
  "HashSet",
  "Option",
  "Record",
]);

const propertyName = (node: SyntaxNode | null | undefined) => {
  if (node?.type === "Identifier") {
    return node.name;
  }

  if (node?.type === "Literal") {
    return String(node.value);
  }

  return null;
};

const sourceFileName = (context: OxlintContext) =>
  context.filename ?? context.getFilename?.() ?? "";

const isEffectCollectionNamespaceCall = (
  callee: SyntaxNode | null | undefined
) =>
  callee?.type === "MemberExpression" &&
  callee.object?.type === "Identifier" &&
  HashSet.has(effectCollectionNamespaces, callee.object.name);

const isMemberCall = (
  node: SyntaxNode | null | undefined,
  objectName: string,
  methodName: string
) =>
  node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  node.callee.object?.type === "Identifier" &&
  node.callee.object.name === objectName &&
  propertyName(node.callee.property) === methodName;

const noNativeArrayMethods: OxlintRule = {
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee?.type === "MemberExpression" &&
          !isEffectCollectionNamespaceCall(node.callee) &&
          HashSet.has(nativeArrayMethods, propertyName(node.callee.property))
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

const noNestedWrapperCalls: OxlintRule = {
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee?.type === "Identifier" &&
          EffectArray.some(
            node.arguments,
            (argument) => argument?.type === "CallExpression"
          )
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

const nativeCollectionConstructors = HashSet.fromIterable([
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
]);
const nativeCollectionSemantics = HashSet.fromIterable(
  EffectArray.flatMap([...nativeCollectionConstructors], (name) => [
    `Native.${name}`,
    `Global.${name}`,
  ])
);

const noNativeCollections: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(
      context.sourceCode,
      HashMap.fromIterable([
        ...EffectArray.map(
          [...nativeCollectionConstructors],
          (name) => [name, `Native.${name}`] as const
        ),
        ["globalThis", "Global"],
        ["window", "Global"],
      ])
    );
    return {
      AssignmentExpression: tracker.trackAssignment,
      NewExpression(node) {
        if (
          HashSet.has(
            nativeCollectionSemantics,
            tracker.semanticOfExpression(node.callee)
          )
        ) {
          context.report({
            messageId: "noNativeCollections",
            node: node.callee,
          });
        }
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description:
        "Disallow native Map, Set and weak collections, including lexical aliases.",
    },
    messages: {
      noNativeCollections:
        "Use persistent Effect HashMap or HashSet instead of native Map, Set, WeakMap or WeakSet. Follow aliases to their actual built-in owner; a same-named local value is separate.",
    },
    type: "problem",
  },
};

const objectWriteSemantics = HashSet.fromIterable([
  "Global.Object.assign",
  "Global.Object.defineProperty",
  "Global.Object.defineProperties",
  "Global.Object.setPrototypeOf",
  "Global.Reflect.set",
  "Global.Reflect.deleteProperty",
  "Global.Reflect.defineProperty",
  "Global.Reflect.setPrototypeOf",
]);

const noObjectWrites: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(
      context.sourceCode,
      HashMap.fromIterable([
        ["Object", "Global.Object"],
        ["Reflect", "Global.Reflect"],
        ["globalThis", "Global"],
        ["window", "Global"],
      ])
    );
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
        HashSet.has(objectWriteSemantics, tracker.semanticOfExpression(node))
      ) {
        context.report({ messageId: "noObjectWrites", node });
      }
    };
    const reportDestructuredWrite = (
      pattern: SyntaxNode | null | undefined,
      source: string | null
    ): void => {
      if (!source) {
        return;
      }
      if (pattern?.type === "Identifier") {
        if (HashSet.has(objectWriteSemantics, source)) {
          context.report({ messageId: "noObjectWrites", node: pattern });
        }
        return;
      }
      if (pattern?.type === "ObjectPattern") {
        forEach<SyntaxKind<"ObjectPattern">["properties"][number]>(
          pattern.properties ?? [],
          (property) => {
            if (property.type === "Property") {
              const member = propertyName(property.key);
              if (member) {
                reportDestructuredWrite(property.value, `${source}.${member}`);
              }
            }
          }
        );
      }
    };
    return {
      AssignmentExpression(node) {
        const source = tracker.semanticOfExpression(node.right);
        tracker.trackAssignment(node);
        if (node.left?.type === "ObjectPattern") {
          reportDestructuredWrite(node.left, source);
        }
      },
      CallExpression(node) {
        if (HashSet.has(objectWriteSemantics, tracker.calledSemantic(node))) {
          context.report({ messageId: "noObjectWrites", node: node.callee });
        }
      },
      Identifier: reportReference,
      MemberExpression: reportReference,
      VariableDeclarator(node) {
        const source = tracker.semanticOfExpression(node.init);
        tracker.trackVariable(node);
        if (node.id?.type === "ObjectPattern") {
          reportDestructuredWrite(node.id, source);
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Reject Object/Reflect writes and escaping write operations through lexical aliases.",
    },
    messages: {
      noObjectWrites:
        "Return an immutable value instead of writing with Object or Reflect. Effect-managed state keeps immutable values in its named owner; built-in write aliases do not change this requirement.",
    },
    type: "problem",
  },
};

const noThrow: OxlintRule = {
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

const noAsyncAwaitPromise: OxlintRule = {
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

const noJsonParseStringify: OxlintRule = {
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

const noAmbientTimeOrRandom: OxlintRule = {
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

const effectSchemaRuntimeDecoderNames = HashSet.fromIterable([
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

const isDecoderCallName = (name: string) =>
  name === "decode" || /^decode[A-Z]/u.test(name ?? "");

const importName = (node: SyntaxNode | null | undefined) => {
  if (node?.type === "Identifier") {
    return node.name;
  }

  if (node?.type === "Literal") {
    return String(node.value);
  }

  return null;
};

const localBindingName = (node: SyntaxNode | null | undefined) =>
  node?.type === "Identifier" ? node.name : null;

const schemaImportSemantic: ImportSemantic = (source, kind, imported) => {
  if (source === "effect") {
    if (kind === "ImportSpecifier" && imported === "Schema") {
      return "Schema";
    }
    if (kind === "ImportNamespaceSpecifier") {
      return "effect";
    }
  }
  if (source === "effect/Schema") {
    return kind === "ImportSpecifier" && imported
      ? `Schema.${imported}`
      : "Schema";
  }
  return null;
};

const isSchemaDecoderSemantic = (semantic: string | null) =>
  Option.exists(
    EffectArray.findFirst(
      ["Schema.", "effect.Schema."],
      (prefix) => semantic?.startsWith(prefix) ?? false
    ),
    (prefix) =>
      HashSet.has(
        effectSchemaRuntimeDecoderNames,
        semantic?.slice(prefix.length) ?? ""
      )
  );

const noDecodingOutsideBoundaries: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    const report = (node: SyntaxNode) =>
      context.report({ messageId: "noDecodingOutsideBoundaries", node });
    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (node.callee?.type === "Identifier") {
          if (
            isSchemaDecoderSemantic(tracker.calledSemantic(node)) ||
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
        const objectSemantic = tracker.semanticOfExpression(node.callee.object);
        if (
          memberName === "decodeTo" &&
          (objectSemantic === "Schema" || objectSemantic === "effect.Schema")
        ) {
          return;
        }
        if (
          isSchemaDecoderSemantic(tracker.calledSemantic(node)) ||
          isDecoderCallName(memberName ?? "")
        ) {
          report(node.callee.property);
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, schemaImportSemantic);
      },
      VariableDeclarator(node) {
        const semantic = tracker.semanticOfExpression(node.init);
        tracker.trackVariable(node);
        if (
          node.id?.type === "Identifier" &&
          isSchemaDecoderSemantic(semantic)
        ) {
          report(node.init ?? node);
        }
        if (
          node.id?.type === "ObjectPattern" &&
          (semantic === "Schema" || semantic === "effect.Schema")
        ) {
          forEach(node.id.properties ?? [], (property) => {
            if (
              property.type === "Property" &&
              localBindingName(property.value) !== null &&
              HashSet.has(
                effectSchemaRuntimeDecoderNames,
                propertyName(property.key)
              )
            ) {
              report(property);
            }
          });
        }
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

type RouteFunction = Extract<SyntaxNode, { params: readonly SyntaxNode[] }> & {
  readonly type:
    | "ArrowFunctionExpression"
    | "FunctionDeclaration"
    | "FunctionExpression";
};
interface RouteConsumer {
  readonly functionNode: RouteFunction;
  readonly kind: "component" | "head";
  readonly routeVariable: SyntaxVariable;
}
interface NamedRouteFunction {
  readonly functionNode: RouteFunction;
  readonly variable: SyntaxVariable;
}
interface RouteSyntaxObservations {
  readonly callExpressions: readonly SyntaxKind<"CallExpression">[];
  readonly functionDeclarations: readonly Extract<
    SyntaxNode,
    { params: readonly SyntaxNode[] }
  >[];
  readonly identifiers: readonly SyntaxKind<"Identifier">[];
  readonly importDeclarations: readonly SyntaxKind<"ImportDeclaration">[];
  readonly importExpressions: readonly SyntaxKind<"ImportExpression">[];
  readonly memberExpressions: readonly SyntaxKind<"MemberExpression">[];
  readonly variableDeclarators: readonly SyntaxKind<"VariableDeclarator">[];
}
type RoutePolicyInput = RouteSyntaxObservations & {
  readonly boundaryBindings: readonly SyntaxVariable[];
  readonly boundaryModules: HashSet.HashSet<string>;
  readonly canonicalImports: HashMap.HashMap<string, SyntaxVariable>;
  readonly consumer: RouteConsumer;
  readonly directRestoreCalls: readonly SyntaxKind<"CallExpression">[];
  readonly forwardingBindings: readonly {
    readonly messageId: string;
    readonly variable: SyntaxVariable | null;
  }[];
  readonly headLoaderDataVariable: SyntaxVariable | null;
  readonly identifier: SyntaxKind<"Identifier">;
  readonly isConfiguredConsumerFile: boolean;
  readonly loaderVariable: SyntaxVariable | null;
  readonly namedFunctions: readonly NamedRouteFunction[];
  readonly report: (messageId: string, node: SyntaxNode) => void;
  readonly reportedForwardingNodes: HashSet.HashSet<
    ReturnType<typeof referenceIdentity<SyntaxNode>>
  >;
  readonly restoreCall: SyntaxKind<"CallExpression">;
  readonly resultDeclarator: SyntaxKind<"VariableDeclarator"> | undefined;
  readonly resultVariable: SyntaxVariable | null;
  readonly routeConsumers: readonly RouteConsumer[];
  readonly routeDefinitionCount: number;
  readonly sourceCode: OxlintSourceCode;
};

const isRouteConsumerFunction = (
  node: SyntaxNode | null | undefined
): node is RouteFunction =>
  node?.type === "ArrowFunctionExpression" ||
  node?.type === "FunctionDeclaration" ||
  node?.type === "FunctionExpression";

const routeTransportDeclaredVariable = (
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

const isRouteTransportReference = (
  variable: SyntaxVariable | null | undefined,
  identifier: SyntaxNode | null | undefined
) =>
  variable !== null &&
  variable !== undefined &&
  identifier?.type === "Identifier" &&
  EffectArray.some(
    variable.references,
    (reference) => reference.identifier === identifier
  );

const isReassignedRouteTransportVariable = (variable: SyntaxVariable) =>
  EffectArray.some(variable.references, (reference) => reference.isWrite?.());

const referencesRouteTransportVariable = (
  variables: readonly SyntaxVariable[],
  identifier: SyntaxNode | null | undefined
) =>
  EffectArray.some(variables, (variable) =>
    isRouteTransportReference(variable, identifier)
  );

const routeConsumerFunction = (node: SyntaxNode) =>
  Option.getOrNull(
    EffectArray.findFirst(syntaxParents(node), (current) =>
      isRouteConsumerFunction(current)
    )
  );

const isTopLevelRouteConsumerDeclaration = (node: SyntaxNode) => {
  const declaration =
    node.parent?.type === "VariableDeclaration" ? node.parent : node;
  const owner = declaration.parent;

  return (
    owner?.type === "Program" ||
    (owner?.type === "ExportNamedDeclaration" &&
      owner.parent?.type === "Program")
  );
};

const routeDefinitionOptions = (
  node: SyntaxKind<"VariableDeclarator">,
  canonicalImports: HashMap.HashMap<string, SyntaxVariable>
) => {
  const createFileRouteVariable = Option.getOrUndefined(
    HashMap.get(canonicalImports, "createFileRoute")
  );

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

const routeConsumerCanonicalImports = (
  importDeclarations: readonly SyntaxKind<"ImportDeclaration">[],
  sourceCode: OxlintSourceCode
) =>
  EffectArray.reduce(
    importDeclarations,
    HashMap.empty<string, SyntaxVariable>(),
    (imports, declaration) => {
      const source = importName(declaration.source);
      return EffectArray.reduce(
        declaration.specifiers ?? [],
        imports,
        (current, specifier) => {
          if (
            declaration.importKind === "type" ||
            specifier.type !== "ImportSpecifier" ||
            specifier.importKind === "type"
          ) {
            return current;
          }
          const importedName = importName(specifier.imported);
          const localName = localBindingName(specifier.local);
          if (
            localName !== null &&
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
            return variable === null
              ? current
              : HashMap.set(current, importedName, variable);
          }
          return current;
        }
      );
    }
  );

const isRouteUseLoaderDataCall = (
  node: SyntaxNode | null | undefined,
  routeVariable: SyntaxVariable | null
) =>
  node?.type === "CallExpression" &&
  node.arguments.length === 0 &&
  node.callee?.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.object?.type === "Identifier" &&
  isRouteTransportReference(routeVariable, node.callee.object) &&
  propertyName(node.callee.property) === "useLoaderData";

const headLoaderDataBinding = (
  functionNode: RouteFunction,
  sourceCode: OxlintSourceCode
) => {
  const parameter = Option.getOrUndefined(
    EffectArray.head(functionNode.params ?? [])
  );
  if (parameter?.type !== "ObjectPattern") {
    return null;
  }
  return Option.getOrNull(
    EffectArray.findFirst(parameter.properties ?? [], (property) => {
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
          ? Option.none()
          : Option.some({ identifier: property.value, variable });
      }
      return Option.none();
    })
  );
};

const isOptionFromUndefinedOrCall = (
  node: SyntaxNode | null | undefined,
  loaderDataVariable: SyntaxVariable,
  optionVariable: SyntaxVariable
) =>
  node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.object?.type === "Identifier" &&
  isRouteTransportReference(optionVariable, node.callee.object) &&
  propertyName(node.callee.property) === "fromUndefinedOr" &&
  node.arguments.length === 1 &&
  firstArgument(node)?.type === "Identifier" &&
  isRouteTransportReference(loaderDataVariable, firstArgument(node));

const isOptionGetOrElseCall = (
  node: SyntaxNode | null | undefined,
  optionVariable: SyntaxVariable
) =>
  node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.object?.type === "Identifier" &&
  isRouteTransportReference(optionVariable, node.callee.object) &&
  propertyName(node.callee.property) === "getOrElse" &&
  node.arguments.length === 1;

const isNormalisedHeadLoaderData = (
  node: SyntaxNode | null | undefined,
  loaderDataVariable: SyntaxVariable,
  canonicalImports: HashMap.HashMap<string, SyntaxVariable>
) => {
  const optionVariable = Option.getOrUndefined(
    HashMap.get(canonicalImports, "Option")
  );

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
    isOptionGetOrElseCall(firstArgument(node), optionVariable)
  );
};

const routeConsumerLocalDeclarator = (
  identifier: SyntaxNode,
  functionNode: RouteFunction,
  sourceCode: OxlintSourceCode,
  variableDeclarators: readonly SyntaxKind<"VariableDeclarator">[]
) => {
  const matches = EffectArray.filter(
    variableDeclarators,
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

  return matches.length === 1
    ? Option.getOrNull(EffectArray.head(matches))
    : null;
};

const isResultMatchCallee = (
  node: SyntaxNode | null | undefined,
  resultVariable: SyntaxVariable
) =>
  node?.type === "MemberExpression" &&
  !node.computed &&
  node.object?.type === "Identifier" &&
  isRouteTransportReference(resultVariable, node.object) &&
  propertyName(node.property) === "match";

const isResultMatchFor = (
  node: SyntaxNode,
  resultValue: SyntaxNode,
  resultBinding: SyntaxVariable | null,
  resultVariable: SyntaxVariable
) =>
  node?.type === "CallExpression" &&
  isResultMatchCallee(node.callee, resultVariable) &&
  (firstArgument(node) === resultValue ||
    (resultValue?.type === "Identifier" &&
      firstArgument(node)?.type === "Identifier" &&
      isRouteTransportReference(resultBinding, firstArgument(node))));

const isInsideJsxExpression = (node: SyntaxNode, functionNode: SyntaxNode) =>
  EffectArray.some(
    EffectArray.takeWhile(
      syntaxParents(node),
      (current) => current !== functionNode
    ),
    (current) => current.type === "JSXExpressionContainer"
  );

const directRouteBoundaryBinding = (
  specifier: SyntaxKind<"ImportDeclaration">["specifiers"][number],
  sourceCode: OxlintSourceCode
) => {
  if (specifier.type !== "ImportSpecifier") {
    return null;
  }

  const localName = localBindingName(specifier.local);
  return importName(specifier.imported) === localName
    ? routeTransportDeclaredVariable(sourceCode, specifier, localName ?? "")
    : null;
};

const routeTransportBoundaryBindings = ({
  boundaryModules,
  callExpressions,
  importDeclarations,
  importExpressions,
  report,
  sourceCode,
}: Pick<
  RoutePolicyInput,
  | "boundaryModules"
  | "callExpressions"
  | "importDeclarations"
  | "importExpressions"
  | "report"
  | "sourceCode"
>) => {
  const bindings = EffectArray.flatMap(importDeclarations, (declaration) => {
    if (!HashSet.has(boundaryModules, importName(declaration.source) ?? "")) {
      return [];
    }
    return EffectArray.filterMap(declaration.specifiers ?? [], (specifier) => {
      if (
        declaration.importKind === "type" ||
        (specifier.type === "ImportSpecifier" &&
          specifier.importKind === "type")
      ) {
        return Result.failVoid;
      }
      const binding = directRouteBoundaryBinding(specifier, sourceCode);
      if (binding === null) {
        report("unsupportedBoundaryImport", specifier);
      }
      return binding === null ? Result.failVoid : Result.succeed(binding);
    });
  });
  forEach(importExpressions, (expression) => {
    if (HashSet.has(boundaryModules, importName(expression.source) ?? "")) {
      report("unsupportedBoundaryImport", expression);
    }
  });
  forEach(callExpressions, (call) => {
    const requiresBoundary =
      call.callee?.type === "Identifier" &&
      call.callee.name === "require" &&
      HashSet.has(boundaryModules, importName(firstArgument(call)) ?? "");
    if (requiresBoundary) {
      report("unsupportedBoundaryImport", call);
    }
  });
  return EffectArray.dedupeWith(bindings, (left, right) => left === right);
};

const isCanonicalRestoreMemberObject = (identifier: SyntaxNode) =>
  identifier.parent?.type === "MemberExpression" &&
  identifier.parent.object === identifier &&
  propertyName(identifier.parent.property) === "restore";

const isRouteBoundaryTypeQuery = (identifier: SyntaxNode) =>
  Option.exists(
    EffectArray.findFirst(
      syntaxParents(identifier),
      (current) =>
        current.type === "TSTypeQuery" ||
        current.type === "Program" ||
        current.type.endsWith("Statement") ||
        isRouteConsumerFunction(current)
    ),
    (current) => current.type === "TSTypeQuery"
  );

const reportUnsupportedRouteBoundaryReferences = ({
  boundaryBindings,
  report,
}: Pick<RoutePolicyInput, "boundaryBindings" | "report">) =>
  forEach(boundaryBindings, (binding) =>
    forEach(binding.references, (reference) => {
      if (
        !isRouteBoundaryTypeQuery(reference.identifier) &&
        !isCanonicalRestoreMemberObject(reference.identifier)
      ) {
        report("indirectRestoreReference", reference.identifier);
      }
    })
  );

const sameFileRouteConsumerFunctions = ({
  functionDeclarations,
  sourceCode,
  variableDeclarators,
}: Pick<
  RoutePolicyInput,
  "functionDeclarations" | "sourceCode" | "variableDeclarators"
>) => [
  ...EffectArray.filterMap(functionDeclarations, (declaration) => {
    if (
      !isRouteConsumerFunction(declaration) ||
      declaration.id?.type !== "Identifier" ||
      !isTopLevelRouteConsumerDeclaration(declaration)
    ) {
      return Result.failVoid;
    }
    const variable = routeTransportDeclaredVariable(
      sourceCode,
      declaration,
      declaration.id.name
    );
    return variable === null
      ? Result.failVoid
      : Result.succeed({ functionNode: declaration, variable });
  }),
  ...EffectArray.filterMap(variableDeclarators, (declarator) => {
    if (
      declarator.id?.type !== "Identifier" ||
      !isRouteConsumerFunction(declarator.init) ||
      !isTopLevelRouteConsumerDeclaration(declarator)
    ) {
      return Result.failVoid;
    }
    const variable = routeTransportDeclaredVariable(
      sourceCode,
      declarator,
      declarator.id.name
    );
    return variable === null
      ? Result.failVoid
      : Result.succeed({ functionNode: declarator.init, variable });
  }),
];

const routeConsumerPropertyFunction = (
  property: SyntaxKind<"ObjectExpression">["properties"][number] & {
    readonly type: "Property";
  },
  namedFunctions: readonly NamedRouteFunction[]
) => {
  if (isRouteConsumerFunction(property.value)) {
    return property.value;
  }

  if (property.value?.type === "Identifier") {
    return (
      Option.getOrUndefined(
        EffectArray.findFirst(namedFunctions, ({ variable }) =>
          isRouteTransportReference(variable, property.value)
        )
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
}: Pick<
  RoutePolicyInput,
  | "canonicalImports"
  | "isConfiguredConsumerFile"
  | "namedFunctions"
  | "report"
  | "sourceCode"
  | "variableDeclarators"
>) => {
  if (!isConfiguredConsumerFile) {
    return { routeConsumers: [], routeDefinitionCount: 0 };
  }
  return EffectArray.reduce(
    variableDeclarators,
    {
      routeConsumers: EffectArray.empty<RouteConsumer>(),
      routeDefinitionCount: 0,
    },
    (current, declarator) => {
      const optionsNode = routeDefinitionOptions(declarator, canonicalImports);
      if (optionsNode === null) {
        return current;
      }
      const routeDefinitionCount = current.routeDefinitionCount + 1;
      if (declarator.id?.type !== "Identifier") {
        report("unresolvedRouteConsumer", declarator.id);
        return { ...current, routeDefinitionCount };
      }
      const routeVariable = routeTransportDeclaredVariable(
        sourceCode,
        declarator,
        declarator.id.name
      );
      if (routeVariable === null) {
        report("unresolvedRouteConsumer", declarator.id);
        return { ...current, routeDefinitionCount };
      }
      const consumers = EffectArray.filterMap(
        optionsNode.properties ?? [],
        (property) => {
          if (property.type !== "Property") {
            return Result.failVoid;
          }
          const kind = propertyName(property.key);
          if (kind !== "component" && kind !== "head") {
            return Result.failVoid;
          }
          const functionNode = routeConsumerPropertyFunction(
            property,
            namedFunctions
          );
          if (functionNode === null) {
            report("unresolvedRouteConsumer", property.value);
            return Result.failVoid;
          }
          return Result.succeed({
            functionNode,
            kind,
            routeVariable,
          } satisfies RouteConsumer);
        }
      );
      return {
        routeConsumers: [...current.routeConsumers, ...consumers],
        routeDefinitionCount,
      };
    }
  );
};

const canonicalRouteRestoreCalls = ({
  boundaryBindings,
  memberExpressions,
  report,
}: Pick<
  RoutePolicyInput,
  "boundaryBindings" | "memberExpressions" | "report"
>) =>
  EffectArray.filterMap(memberExpressions, (member) => {
    if (
      member.object?.type !== "Identifier" ||
      !referencesRouteTransportVariable(boundaryBindings, member.object) ||
      propertyName(member.property) !== "restore"
    ) {
      return Result.failVoid;
    }
    if (
      member.computed ||
      member.optional ||
      member.parent?.type !== "CallExpression" ||
      member.parent.optional ||
      member.parent.callee !== member
    ) {
      report("indirectRestoreReference", member);
      return Result.failVoid;
    }
    return Result.succeed(member.parent);
  });

const componentRestoreInput = ({
  consumer,
  restoreCall,
  sourceCode,
  variableDeclarators,
}: Pick<
  RoutePolicyInput,
  "consumer" | "restoreCall" | "sourceCode" | "variableDeclarators"
>) => {
  const [restoreInput] = restoreCall.arguments;

  if (
    restoreCall.arguments.length === 1 &&
    isRouteUseLoaderDataCall(restoreInput, consumer.routeVariable)
  ) {
    return { headLoaderDataVariable: null, loaderVariable: null, valid: true };
  }

  if (
    restoreCall.arguments.length !== 1 ||
    restoreInput?.type !== "Identifier"
  ) {
    return { headLoaderDataVariable: null, loaderVariable: null, valid: false };
  }

  const loaderDeclarator = routeConsumerLocalDeclarator(
    restoreInput,
    consumer.functionNode,
    sourceCode,
    variableDeclarators
  );
  const valid =
    loaderDeclarator?.parent?.type === "VariableDeclaration" &&
    loaderDeclarator.parent.kind === "const" &&
    loaderDeclarator.id.type === "Identifier" &&
    isRouteUseLoaderDataCall(loaderDeclarator.init, consumer.routeVariable);

  const loaderVariable =
    valid && loaderDeclarator?.id.type === "Identifier"
      ? routeTransportDeclaredVariable(
          sourceCode,
          loaderDeclarator,
          loaderDeclarator.id.name
        )
      : null;

  return {
    headLoaderDataVariable: null,
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
}: Pick<
  RoutePolicyInput,
  | "canonicalImports"
  | "consumer"
  | "restoreCall"
  | "sourceCode"
  | "variableDeclarators"
>) => {
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
    loaderDeclarator?.parent?.type === "VariableDeclaration" &&
    loaderDeclarator.parent.kind === "const" &&
    loaderDeclarator.id.type === "Identifier" &&
    !isReassignedRouteTransportVariable(headLoaderData.variable) &&
    isNormalisedHeadLoaderData(
      loaderDeclarator.init,
      headLoaderData.variable,
      canonicalImports
    );

  const loaderVariable =
    valid && loaderDeclarator?.id.type === "Identifier"
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
}: Pick<
  RoutePolicyInput,
  "consumer" | "restoreCall" | "variableDeclarators"
>) =>
  Option.getOrUndefined(
    EffectArray.findFirst(
      variableDeclarators,
      (declarator) =>
        declarator.init === restoreCall &&
        declarator.id?.type === "Identifier" &&
        routeConsumerFunction(declarator) === consumer.functionNode
    )
  );

const isRestoreResultMatched = ({
  callExpressions,
  canonicalImports,
  consumer,
  restoreCall,
  resultVariable,
  resultDeclarator,
}: Pick<
  RoutePolicyInput,
  | "callExpressions"
  | "canonicalImports"
  | "consumer"
  | "restoreCall"
  | "resultVariable"
  | "resultDeclarator"
>) => {
  const resultImportVariable = Option.getOrUndefined(
    HashMap.get(canonicalImports, "Result")
  );

  if (resultImportVariable === undefined) {
    return false;
  }

  const resultValue = resultDeclarator?.id ?? restoreCall;

  return EffectArray.some(
    callExpressions,
    (call) =>
      routeConsumerFunction(call) === consumer.functionNode &&
      isResultMatchFor(call, resultValue, resultVariable, resultImportVariable)
  );
};

const isRouteValueAliasOrAssignment = (identifier: SyntaxNode) =>
  (identifier.parent?.type === "VariableDeclarator" &&
    identifier.parent.init === identifier) ||
  (identifier.parent?.type === "AssignmentExpression" &&
    identifier.parent.right === identifier);

const isRouteResultCallArgument = (
  identifier: SyntaxNode,
  functionNode: RouteFunction
) =>
  Option.getOrNull(
    EffectArray.findFirst(
      EffectArray.takeWhile(
        [identifier, ...syntaxParents(identifier)],
        (current) =>
          current.parent !== undefined && current.parent !== functionNode
      ),
      (current) =>
        current.parent?.type === "CallExpression" &&
        EffectArray.some(
          current.parent.arguments,
          (argument) => argument === current
        )
          ? Option.some({ argument: current, call: current.parent })
          : Option.none()
    )
  );

const routeValueForwardingMessage = ({
  canonicalImports,
  consumer,
  forwardingBindings,
  identifier,
  restoreCall,
  resultDeclarator,
  resultVariable,
}: Pick<
  RoutePolicyInput,
  | "canonicalImports"
  | "consumer"
  | "forwardingBindings"
  | "identifier"
  | "restoreCall"
  | "resultDeclarator"
  | "resultVariable"
>) => {
  const forwardingBinding = Option.getOrUndefined(
    EffectArray.findFirst(forwardingBindings, ({ variable }) =>
      isRouteTransportReference(variable, identifier)
    )
  );

  if (forwardingBinding === undefined) {
    return null;
  }

  const resultCallArgument =
    forwardingBinding.messageId === "forwardedRouteResult"
      ? isRouteResultCallArgument(identifier, consumer.functionNode)
      : null;
  const resultImportVariable = Option.getOrUndefined(
    HashMap.get(canonicalImports, "Result")
  );
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
}: Pick<
  RoutePolicyInput,
  | "callExpressions"
  | "canonicalImports"
  | "consumer"
  | "headLoaderDataVariable"
  | "identifiers"
  | "loaderVariable"
  | "report"
  | "reportedForwardingNodes"
  | "restoreCall"
  | "resultDeclarator"
  | "resultVariable"
>) => {
  const forwardingBindings = EffectArray.filterMap(
    [
      { messageId: "forwardedLoaderTransport", variable: loaderVariable },
      {
        messageId: "forwardedLoaderTransport",
        variable:
          headLoaderDataVariable === loaderVariable
            ? null
            : headLoaderDataVariable,
      },
      { messageId: "forwardedRouteResult", variable: resultVariable },
    ],
    (binding) =>
      binding.variable === null ? Result.failVoid : Result.succeed(binding)
  );
  const reportedIdentifiers = EffectArray.reduce(
    identifiers,
    reportedForwardingNodes,
    (current, identifier) => {
      const messageId = routeValueForwardingMessage({
        canonicalImports,
        consumer,
        forwardingBindings,
        identifier,
        restoreCall,
        resultDeclarator,
        resultVariable,
      });
      const key = referenceIdentity(identifier);
      if (messageId !== null && !HashSet.has(current, key)) {
        report(messageId, identifier);
        return HashSet.add(current, key);
      }
      return current;
    }
  );
  return EffectArray.reduce(
    callExpressions,
    reportedIdentifiers,
    (current, call) => {
      const key = referenceIdentity(call);
      if (
        isRouteUseLoaderDataCall(call, consumer.routeVariable) &&
        firstArgument(restoreCall) !== call &&
        isInsideJsxExpression(call, consumer.functionNode) &&
        !HashSet.has(current, key)
      ) {
        report("forwardedLoaderTransport", call);
        return HashSet.add(current, key);
      }
      return current;
    }
  );
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
}: Pick<
  RoutePolicyInput,
  | "callExpressions"
  | "canonicalImports"
  | "directRestoreCalls"
  | "identifiers"
  | "isConfiguredConsumerFile"
  | "report"
  | "routeConsumers"
  | "routeDefinitionCount"
  | "sourceCode"
  | "variableDeclarators"
>) => {
  const observations = EffectArray.reduce(
    directRestoreCalls,
    {
      callsByConsumer: HashMap.empty<
        ReturnType<typeof referenceIdentity<RouteConsumer>>,
        readonly SyntaxKind<"CallExpression">[]
      >(),
      consumerOrder: EffectArray.empty<RouteConsumer>(),
      reportedForwardingNodes:
        HashSet.empty<ReturnType<typeof referenceIdentity<SyntaxNode>>>(),
    },
    (current, restoreCall) => {
      const functionNode = routeConsumerFunction(restoreCall);
      const matchingConsumers = EffectArray.filter(
        routeConsumers,
        (consumer) => consumer.functionNode === functionNode
      );
      if (!isConfiguredConsumerFile) {
        report("restoreOutsideConsumer", restoreCall);
        return current;
      }
      if (routeDefinitionCount === 0) {
        report("unresolvedRouteConsumer", restoreCall);
        return current;
      }
      if (matchingConsumers.length === 0) {
        report("restoreOutsideConsumer", restoreCall);
        return current;
      }
      if (matchingConsumers.length !== 1) {
        report("unresolvedRouteConsumer", restoreCall);
        return current;
      }
      const consumer = Option.getOrNull(EffectArray.head(matchingConsumers));
      if (consumer === null) {
        return current;
      }
      const key = referenceIdentity(consumer);
      const existingCalls = HashMap.get(current.callsByConsumer, key);
      const callsByConsumer = HashMap.set(
        current.callsByConsumer,
        key,
        EffectArray.append(
          Option.getOrElse(existingCalls, () => []),
          restoreCall
        )
      );
      const consumerOrder = Option.isNone(existingCalls)
        ? EffectArray.append(current.consumerOrder, consumer)
        : current.consumerOrder;
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

      const reportedForwardingNodes = reportRouteValueForwarding({
        callExpressions,
        canonicalImports,
        consumer,
        headLoaderDataVariable: restoreInput.headLoaderDataVariable ?? null,
        identifiers,
        loaderVariable: restoreInput.loaderVariable,
        report,
        reportedForwardingNodes: current.reportedForwardingNodes,
        restoreCall,
        resultDeclarator,
        resultVariable,
      });
      return { callsByConsumer, consumerOrder, reportedForwardingNodes };
    }
  );
  forEach(observations.consumerOrder, (consumer) => {
    const restoreCalls = Option.getOrElse(
      HashMap.get(observations.callsByConsumer, referenceIdentity(consumer)),
      () => []
    );
    forEach(EffectArray.drop(restoreCalls, 1), (duplicateRestore) =>
      report("multipleRestores", duplicateRestore)
    );
  });
};

const RouteConsumerOptions = Schema.Struct({
  routeTransportBoundaryModules: Schema.NonEmptyArray(Schema.String),
  routeTransportConsumerFiles: Schema.NonEmptyArray(Schema.String),
});

const noRouteTransportRestoreOutsideConsumers: OxlintRule = {
  create(context) {
    const parsedOptions = EffectArray.head(context.options).pipe(
      Option.flatMap(Schema.decodeUnknownOption(RouteConsumerOptions))
    );
    return Option.match(parsedOptions, {
      onNone: () => ({
        Program: (node) =>
          context.report({ messageId: "invalidRoutePolicyOptions", node }),
      }),
      onSome: (options) => {
        const { sourceCode } = context;
        const boundaryModules = HashSet.fromIterable(
          options.routeTransportBoundaryModules
        );
        const consumerFiles = HashSet.fromIterable(
          EffectArray.map(options.routeTransportConsumerFiles, (fileName) =>
            resolve(fileName)
          )
        );
        const isConfiguredConsumerFile = HashSet.has(
          consumerFiles,
          resolve(sourceFileName(context))
        );
        // Oxlint owns one synchronous listener lifetime per source file.
        const observations = Ref.makeUnsafe<RouteSyntaxObservations>({
          callExpressions: [],
          functionDeclarations: [],
          identifiers: [],
          importDeclarations: [],
          importExpressions: [],
          memberExpressions: [],
          variableDeclarators: [],
        });

        const report: RoutePolicyInput["report"] = (messageId, node) =>
          context.report({
            messageId,
            node,
          });

        return {
          CallExpression(node) {
            MutableRef.update(observations.ref, (current) => ({
              ...current,
              callExpressions: EffectArray.append(
                current.callExpressions,
                node
              ),
            }));
          },
          FunctionDeclaration(node) {
            MutableRef.update(observations.ref, (current) => ({
              ...current,
              functionDeclarations: EffectArray.append(
                current.functionDeclarations,
                node
              ),
            }));
          },
          Identifier(node) {
            MutableRef.update(observations.ref, (current) => ({
              ...current,
              identifiers: EffectArray.append(current.identifiers, node),
            }));
          },
          ImportDeclaration(node) {
            MutableRef.update(observations.ref, (current) => ({
              ...current,
              importDeclarations: EffectArray.append(
                current.importDeclarations,
                node
              ),
            }));
          },
          ImportExpression(node) {
            MutableRef.update(observations.ref, (current) => ({
              ...current,
              importExpressions: EffectArray.append(
                current.importExpressions,
                node
              ),
            }));
          },
          MemberExpression(node) {
            MutableRef.update(observations.ref, (current) => ({
              ...current,
              memberExpressions: EffectArray.append(
                current.memberExpressions,
                node
              ),
            }));
          },
          "Program:exit"() {
            const {
              importDeclarations,
              importExpressions,
              callExpressions,
              functionDeclarations,
              identifiers,
              memberExpressions,
              variableDeclarators,
            } = Ref.getUnsafe(observations);
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
            MutableRef.update(observations.ref, (current) => ({
              ...current,
              variableDeclarators: EffectArray.append(
                current.variableDeclarators,
                node
              ),
            }));
          },
        };
      },
    });
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
      invalidRoutePolicyOptions:
        "Route policy options must contain non-empty boundary-module and consumer-file lists; invalid configuration fails closed.",
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
    name: "taxkit",
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
    "no-native-array-methods": noNativeArrayMethods,
    "no-native-collections": noNativeCollections,
    "no-nested-wrapper-calls": noNestedWrapperCalls,
    "no-nullish-comparison": noNullishComparison,
    "no-object-writes": noObjectWrites,
    "no-route-transport-restore-outside-consumers":
      noRouteTransportRestoreOutsideConsumers,
    "no-throw": noThrow,
    "no-typeof": noTypeof,
    "no-undefined-comparison": noUndefinedComparison,
  },
};
