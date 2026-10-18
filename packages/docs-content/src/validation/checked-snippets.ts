import { Array, Schema } from "effect";

import { DocsSourcePath, DocsValidationIssue } from "../schemas.ts";

export const checkedExampleFiles = [
  "browser-http.ts",
  "effect.ts",
  "error-handling.ts",
  "node-server.ts",
  "api-error-envelope.ts",
  "calculator-help.ts",
  "validate-external-input.ts",
  "define-gross-pay-fact.ts",
  "../test/integration.example.test.ts",
] as const;

const CheckedSnippetBinding = Schema.Struct({
  example: Schema.Literals(checkedExampleFiles),
  page: DocsSourcePath,
});

export const checkedSnippetBindings = Schema.Array(CheckedSnippetBinding).make([
  {
    example: "browser-http.ts",
    page: DocsSourcePath.make(
      "content/guides/build-a-browser-app-with-the-http-api.mdx"
    ),
  },
  {
    example: "api-error-envelope.ts",
    page: DocsSourcePath.make("content/api/errors.mdx"),
  },
  {
    example: "calculator-help.ts",
    page: DocsSourcePath.make(
      "content/guides/show-calculator-help-to-users.mdx"
    ),
  },
  {
    example: "validate-external-input.ts",
    page: DocsSourcePath.make("content/guides/handle-validation-errors.mdx"),
  },
  {
    example: "validate-external-input.ts",
    page: DocsSourcePath.make("content/sdk/type-safety.mdx"),
  },
  {
    example: "define-gross-pay-fact.ts",
    page: DocsSourcePath.make("content/contributing/add-a-fact.mdx"),
  },
  {
    example: "../test/integration.example.test.ts",
    page: DocsSourcePath.make("content/guides/test-your-integration.mdx"),
  },
]);

// The complete copied TS fence must match its compiled source owner.
export const validateCheckedSnippet = (
  source: DocsSourcePath,
  markdown: string,
  example: string
): readonly DocsValidationIssue[] =>
  markdown.includes(`\`\`\`ts\n${example.trim()}\n\`\`\``)
    ? Array.empty()
    : Array.of(
        new DocsValidationIssue({
          message:
            "The copied TypeScript snippet does not match its checked example file.",
          path: [source, "checked-snippet"],
        })
      );
