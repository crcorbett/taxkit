import {
  Predicate,
  Match,
  Function as EffectFunction,
  Array as EffectArray,
  HashMap,
  HashSet,
  Option,
} from "effect";
import { forEach } from "effect/Array";

import { createBindingTracker } from "./binding-tracker.ts";
import type {
  ImportSemantic,
  OxlintRule,
  SyntaxKind,
  SyntaxNode,
} from "./host.types.js";

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
  node?.type === "Literal" && Predicate.isNull(node.value);
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
          EffectFunction.pipe(
            node.arguments,
            EffectArray.some((argument) => argument?.type === "CallExpression")
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
  EffectFunction.pipe(
    [...nativeCollectionConstructors],
    EffectArray.flatMap((name) => [`Native.${name}`, `Global.${name}`])
  )
);
const noNativeCollections: OxlintRule = {
  create(context) {
    const tracker = EffectFunction.pipe(context.sourceCode, (argument1) =>
      EffectFunction.pipe(
        HashMap.fromIterable([
          ...EffectFunction.pipe(
            [...nativeCollectionConstructors],
            EffectArray.map((name) => [name, `Native.${name}`] as const)
          ),
          ["globalThis", "Global"],
          ["window", "Global"],
        ]),
        (argument2) => createBindingTracker(argument1, argument2)
      )
    );
    return {
      AssignmentExpression: tracker.trackAssignment,
      NewExpression(node) {
        if (
          tracker
            .semanticOfExpression(node.callee)
            .pipe(
              Option.exists((name) =>
                HashSet.has(nativeCollectionSemantics, name)
              )
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
    const tracker = EffectFunction.pipe(context.sourceCode, (argument3) =>
      EffectFunction.pipe(
        HashMap.fromIterable([
          ["Object", "Global.Object"],
          ["Reflect", "Global.Reflect"],
          ["globalThis", "Global"],
          ["window", "Global"],
        ]),
        (argument4) => createBindingTracker(argument3, argument4)
      )
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
        tracker
          .semanticOfExpression(node)
          .pipe(
            Option.exists((name) => HashSet.has(objectWriteSemantics, name))
          )
      ) {
        context.report({ messageId: "noObjectWrites", node });
      }
    };
    const reportDestructuredWrite = (
      pattern: SyntaxNode | null | undefined,
      source: Option.Option<string>
    ): void => {
      if (Option.isNone(source)) {
        return;
      }
      if (pattern?.type === "Identifier") {
        if (HashSet.has(objectWriteSemantics, source.value)) {
          context.report({ messageId: "noObjectWrites", node: pattern });
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
                if (!Predicate.isNull(member)) {
                  const memberSemantic = Option.some(
                    `${source.value}.${member}`
                  );
                  reportDestructuredWrite(property.value, memberSemantic);
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
          reportDestructuredWrite(node.left, source);
        }
      },
      CallExpression(node) {
        if (
          tracker
            .calledSemantic(node)
            .pipe(
              Option.exists((name) => HashSet.has(objectWriteSemantics, name))
            )
        ) {
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
const localBindingName = (node: SyntaxNode | null | undefined) =>
  Match.value(node).pipe(
    Match.when({ type: "Identifier" }, (matchedValue) => matchedValue.name),
    Match.orElse(() => null)
  );
const schemaImportSemantic: ImportSemantic = (source, kind, imported) => {
  if (source === "effect") {
    if (kind === "ImportSpecifier") {
      return imported.pipe(Option.filter((name) => name === "Schema"));
    }
    if (kind === "ImportNamespaceSpecifier") {
      return Option.some("effect");
    }
  }
  if (source === "effect/Schema") {
    if (kind === "ImportSpecifier" && Option.isSome(imported)) {
      return Option.some(`Schema.${imported.value}`);
    }
    return Option.some("Schema");
  }
  return Option.none();
};
const isSchemaDecoderSemantic = (semantic: Option.Option<string>) =>
  semantic.pipe(
    Option.exists((name) =>
      EffectFunction.pipe(
        ["Schema.", "effect.Schema."],
        EffectArray.some(
          (prefix) =>
            name.startsWith(prefix) &&
            HashSet.has(
              effectSchemaRuntimeDecoderNames,
              name.slice(prefix.length)
            )
        )
      )
    )
  );
const noDecodingOutsideBoundaries: OxlintRule = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);
    const report = (node: SyntaxNode) => {
      context.report({ messageId: "noDecodingOutsideBoundaries", node });
    };
    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (node.callee?.type === "Identifier") {
          if (
            EffectFunction.pipe(
              tracker.calledSemantic(node),
              isSchemaDecoderSemantic
            ) ||
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
          (Option.contains(objectSemantic, "Schema") ||
            Option.contains(objectSemantic, "effect.Schema"))
        ) {
          return;
        }
        if (
          EffectFunction.pipe(
            tracker.calledSemantic(node),
            isSchemaDecoderSemantic
          ) ||
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
          (Option.contains(semantic, "Schema") ||
            Option.contains(semantic, "effect.Schema"))
        ) {
          EffectFunction.pipe(
            node.id.properties ?? [],
            forEach((property) => {
              if (
                property.type === "Property" &&
                !Predicate.isNull(localBindingName(property.value)) &&
                HashSet.has(
                  effectSchemaRuntimeDecoderNames,
                  propertyName(property.key)
                )
              ) {
                report(property);
              }
            })
          );
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
    "no-throw": noThrow,
    "no-typeof": noTypeof,
    "no-undefined-comparison": noUndefinedComparison,
  },
};
