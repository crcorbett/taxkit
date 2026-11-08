import { Match, Function as EffectFunction } from "effect";
import { forEach } from "effect/Array";

import { propertyName } from "../binding-tracker.ts";
import type { OxlintRule, SyntaxNode } from "../host.types.js";

const layerExportNamePattern = /(?:Live|Mock|Test|TestLive)$/u;
export const noLayerExportsInServiceFiles: OxlintRule = {
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
