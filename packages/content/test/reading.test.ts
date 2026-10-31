import { assert, describe, it } from "@effect/vitest";
import { RenderedBlock } from "@taxkit/mdx/schemas";
import { Effect, HashMap, Schema } from "effect";

import { resolveDocsHref } from "../src/links.js";
import { readingMarkdown } from "../src/reading-markdown.egress.js";
import {
  DocsNonEmptyText,
  DocsPagePath,
  DocsRepositoryProfile,
  DocsSourcePath,
} from "../src/schemas.js";

const context = Effect.gen(function* () {
  const source = yield* DocsSourcePath.makeEffect("guides/first.mdx");
  return {
    pages: HashMap.make([
      yield* DocsSourcePath.makeEffect("start/index.mdx"),
      yield* DocsPagePath.makeEffect("/start"),
    ]),
    repository: yield* Schema.decodeEffect(DocsRepositoryProfile)({
      checkedExampleRevision: "1".repeat(40),
      repositoryRevision: "2".repeat(40),
      repositoryUrl: "https://github.com/crcorbett/taxkit/",
    }),
    source,
  };
}).pipe(Effect.orDie);

describe("docs links", () => {
  it.effect("resolves pages, repository files, fragments and HTTPS", () =>
    Effect.gen(function* () {
      const links = yield* context;
      const resolve = (href: string) => resolveDocsHref(href, links);
      assert.strictEqual(yield* resolve("../start/index.mdx"), "/start");
      assert.strictEqual(
        yield* resolve("../start/index.mdx#install"),
        "/start#install"
      );
      assert.strictEqual(yield* resolve("#local"), "#local");
      assert.strictEqual(
        yield* resolve("https://example.com/a"),
        "https://example.com/a"
      );
      assert.strictEqual(
        yield* resolve("../../../CHANGELOG.md"),
        `https://github.com/crcorbett/taxkit/blob/${"2".repeat(40)}/CHANGELOG.md`
      );
      assert.strictEqual(
        yield* resolve("../../../packages/docs-examples/src/a.ts"),
        `https://github.com/crcorbett/taxkit/blob/${"1".repeat(40)}/packages/docs-examples/src/a.ts`
      );
    })
  );

  it.effect(
    "rejects unknown pages, other schemes, absolute paths and escapes",
    () =>
      Effect.gen(function* () {
        const links = yield* context;
        yield* Effect.forEach(
          [
            "./missing.mdx",
            "mailto:a@example.com",
            "http://example.com",
            "/start",
            "../../../../outside.md",
            "../start/index.mdx#Bad Fragment",
          ],
          (href) =>
            resolveDocsHref(href, links).pipe(
              Effect.flip,
              Effect.flatMap((error) =>
                Effect.sync(() => {
                  assert.strictEqual(error._tag, "DocsPageReadError");
                  assert.strictEqual(error.reason, "link");
                  assert.strictEqual(error.source, "guides/first.mdx");
                })
              )
            )
        );
      })
  );
});

describe("reading Markdown", () => {
  it.effect("writes the checked body back as literal Markdown", () =>
    Effect.gen(function* () {
      const body = yield* Schema.decodeEffect(Schema.Array(RenderedBlock))([
        {
          content: [
            { kind: "text", text: "Use *stars* | pipes " },
            {
              content: [{ kind: "text", text: "Start" }],
              href: "/start",
              kind: "link",
              target: "/start",
            },
          ],
          kind: "paragraph",
        },
        {
          content: [{ kind: "text", text: "Steps" }],
          depth: 2,
          id: "steps",
          kind: "heading",
        },
        {
          items: [[{ kind: "inline-code", text: "a`b" }]],
          kind: "list",
          ordered: true,
          start: 3,
        },
        {
          align: ["left", "none"],
          header: [
            [{ kind: "text", text: "A" }],
            [{ kind: "text", text: "B" }],
          ],
          kind: "table",
          rows: [
            [[{ kind: "text", text: "1" }], [{ kind: "text", text: "2" }]],
          ],
        },
        {
          kind: "code",
          language: "ts",
          lines: [[{ color: null, style: "normal", text: "const a = 1;" }], []],
          text: "const a = 1;\n",
        },
        {
          kind: "diagram",
          source: "flowchart LR\n  A --> B",
          svg: "<svg></svg>",
          title: "Two steps",
        },
      ]);
      const title = yield* DocsNonEmptyText.makeEffect("First guide");
      assert.strictEqual(
        readingMarkdown({ body, title }),
        [
          "# First guide",
          "",
          "Use \\*stars\\* \\| pipes [Start](</start>)",
          "",
          "## Steps",
          "",
          "3. `` a`b ``",
          "",
          "| A | B |",
          "| :--- | --- |",
          "| 1 | 2 |",
          "",
          "```ts",
          "const a = 1;",
          "",
          "```",
          "",
          "```mermaid",
          "flowchart LR",
          "  A --> B",
          "```",
          "",
        ].join("\n")
      );
    })
  );
});
