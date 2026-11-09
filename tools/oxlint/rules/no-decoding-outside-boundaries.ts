import {
  Predicate,
  Match,
  Function as EffectFunction,
  Array as EffectArray,
  HashSet,
  Option,
} from "effect";
import { forEach } from "effect/Array";

import { createBindingTracker } from "../binding-tracker.ts";
import type { ImportSemantic, OxlintRule, SyntaxNode } from "../host.types.js";
import { propertyName } from "./shared/taxkit-syntax.ts";

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
export const noDecodingOutsideBoundaries: OxlintRule = {
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
