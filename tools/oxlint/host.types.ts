import type { RuleTester } from "oxlint/plugins-dev";

// Oxlint exports RuleTester as its supported plugin type surface. Derive the
// listener and syntax contracts from that surface rather than copying its AST.
export type OxlintRule = Parameters<RuleTester["run"]>[1];
export type OxlintContext = Parameters<NonNullable<OxlintRule["create"]>>[0];
export type OxlintSourceCode = OxlintContext["sourceCode"];
export type SyntaxNode = Parameters<OxlintSourceCode["getScope"]>[0];
export type SyntaxVariable = ReturnType<
  OxlintSourceCode["getDeclaredVariables"]
>[number];
export type SyntaxKind<Kind extends SyntaxNode["type"]> = SyntaxNode & {
  readonly type: Kind;
};
export type ImportSemantic = (
  source: string,
  specifierType: SyntaxKind<"ImportDeclaration">["specifiers"][number]["type"],
  imported: string | null
) => string | null;
