import { expect, it } from "@effect/vitest";

import { DocsSourcePath } from "../schemas.js";
import { validateCheckedSnippet } from "./checked-snippets.js";

it("rejects a copied example that drifts from its compiled source", () => {
  const source = DocsSourcePath.make("content/api/errors.mdx");
  const example = 'import { Schema } from "effect";';
  expect(
    validateCheckedSnippet(
      source,
      '```ts\nimport { Schema } from "effect";\n```',
      example
    )
  ).toEqual([]);
  expect(
    validateCheckedSnippet(
      source,
      "```ts\nconst error = response as never;\n```",
      example
    )
  ).toHaveLength(1);
  expect(
    validateCheckedSnippet(source, "The source code is elsewhere.", example)
  ).toHaveLength(1);
});
