import {
  Function as EffectFunction,
  Array as EffectArray,
  Option,
} from "effect";

import { createBindingTracker } from "../binding-tracker.ts";
import type { OxlintRule } from "../host.types.js";
import { effectImportSemantic } from "./shared/effect-references.ts";

const schemaEncoderMethodPattern = /^encode(?!To)[A-Za-z]*$/u;
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
export const noSchemaEncoderOutsideEgress = schemaCodecRule({
  description:
    "Restrict Effect Schema encoder execution to configured egress boundaries.",
  matches: (method) => schemaEncoderMethodPattern.test(method),
  message:
    "Schema encoder execution belongs at an exact serialization egress: an HTTP response, route transport, persisted representation, provider request, or command output. Pass schema-derived values inward and encode once with the owning Schema where the value leaves the system.",
  messageId: "noSchemaEncoderOutsideEgress",
});
