import { Function as EffectFunction } from "effect";

import { importSourceValue } from "../binding-tracker.ts";
import type { OxlintRule } from "../host.types.js";

const isHostImport = (source: string) =>
  source.startsWith("node:") ||
  source === "bun" ||
  source.startsWith("bun:") ||
  source.startsWith("@effect/platform-bun") ||
  source.startsWith("@effect/platform-node");
export const noHostImportsInContracts: OxlintRule = {
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
