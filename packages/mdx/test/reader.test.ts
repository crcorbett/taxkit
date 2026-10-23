import { assert, describe, it } from "@effect/vitest";
import {
  DocsPagePath,
  DocsRepositoryProfile,
  DocsSourcePath,
} from "@taxkit/content/schemas";
import { DocsPageReader } from "@taxkit/content/service";
import {
  DocsCodeHighlighterTest,
  DocsDiagramRendererTest,
} from "@taxkit/content/test";
import { Array, Effect, HashMap, Layer, Schema } from "effect";

import { DocsPageReaderLive } from "../src/live.layer.js";

const ReaderTest = DocsPageReaderLive.pipe(
  Layer.provide(Layer.merge(DocsCodeHighlighterTest, DocsDiagramRendererTest))
);

const links = Effect.gen(function* () {
  const source = yield* DocsSourcePath.makeEffect("guides/first.mdx");
  return {
    pages: HashMap.make(
      [source, yield* DocsPagePath.makeEffect("/guides/first")],
      [
        yield* DocsSourcePath.makeEffect("start/index.mdx"),
        yield* DocsPagePath.makeEffect("/start"),
      ]
    ),
    repository: yield* Schema.decodeEffect(DocsRepositoryProfile)({
      checkedExampleRevision: "1".repeat(40),
      repositoryRevision: "2".repeat(40),
      repositoryUrl: "https://github.com/crcorbett/taxkit",
    }),
    source,
  };
}).pipe(Effect.orDie);

const page = (body: string) =>
  `---\ntitle: "First guide"\ndescription: "Read the first guide."\nstatus: "published"\n---\n\n# First guide\n\n${body}`;

const read = (text: string) =>
  Effect.gen(function* () {
    const context = yield* links;
    const reader = yield* DocsPageReader;
    return yield* reader.read({ path: context.source, text }, context);
  }).pipe(Effect.provide(ReaderTest));

describe("MDX page reader", () => {
  it.effect("reads supported Markdown into checked reading blocks", () =>
    Effect.gen(function* () {
      const result = yield* read(
        page(
          [
            "Use **the SDK** and `calculate`; see [Start](../start/index.mdx#install).",
            "",
            "## Run it",
            "",
            "1. Install it.",
            "2. Read [the example](../../../packages/docs-examples/src/a.ts).",
            "",
            "| Field | Value |",
            "| :--- | ---: |",
            "| `netPay` | cents |",
            "",
            "```ts",
            "const a = 1;",
            "```",
            "",
            '```mermaid title="Two steps"',
            "flowchart LR",
            "  A --> B",
            "```",
          ].join("\n")
        )
      );
      assert.strictEqual(result.frontmatter.title, "First guide");
      assert.deepEqual(
        Array.map(result.body, (block) => block.kind),
        ["paragraph", "heading", "list", "table", "code", "diagram"]
      );
      const [paragraph, heading, list, table, , diagram] = result.body;
      assert.deepEqual<unknown>(paragraph, {
        content: [
          { kind: "text", text: "Use " },
          { content: [{ kind: "text", text: "the SDK" }], kind: "strong" },
          { kind: "text", text: " and " },
          { kind: "inline-code", text: "calculate" },
          { kind: "text", text: "; see " },
          {
            content: [{ kind: "text", text: "Start" }],
            href: "/start#install",
            kind: "link",
          },
          { kind: "text", text: "." },
        ],
        kind: "paragraph",
      });
      assert.deepEqual<unknown>(heading, {
        content: [{ kind: "text", text: "Run it" }],
        depth: 2,
        id: "run-it",
        kind: "heading",
      });
      const [, secondItem] = list?.kind === "list" ? list.items : [];
      const [, exampleLink] = secondItem ?? [];
      assert.deepEqual<unknown>(exampleLink, {
        content: [{ kind: "text", text: "the example" }],
        href: `https://github.com/crcorbett/taxkit/blob/${"1".repeat(40)}/packages/docs-examples/src/a.ts`,
        kind: "link",
      });
      assert.deepEqual(table?.kind === "table" ? table.align : undefined, [
        "left",
        "right",
      ]);
      assert.strictEqual(
        diagram?.kind === "diagram" ? diagram.title : undefined,
        "Two steps"
      );
    })
  );

  it.effect(
    "fails each unsupported page with a parse error naming the file",
    () =>
      Effect.forEach(
        [
          "No frontmatter",
          page("<Callout>Hi</Callout>"),
          page("![An image](./a.png)"),
          page("See [nowhere](./missing.mdx)."),
          page("Write to [us](mailto:a@example.com)."),
          page("# A second title"),
          page("```mermaid\nflowchart LR\n  A --> B\n```"),
          page('```ts title="a.ts"\nconst a = 1;\n```'),
          page("```python\nprint(1)\n```"),
          page("## Twice\n\n## Twice"),
          page("> A quote"),
          `---\ntitle: "Other"\ndescription: "Read it."\nstatus: "published"\n---\n\n# First guide\n\nText.`,
          `---\ntitle: "First guide"\ndescription: "Read it."\nstatus: "published"\nextra: true\n---\n\n# First guide\n\nText.`,
        ],
        (text) =>
          read(text).pipe(
            Effect.flip,
            Effect.flatMap((error) =>
              Effect.sync(() => {
                assert.strictEqual(error._tag, "DocsSourceError");
                assert.strictEqual(error.operation, "parse");
                assert.strictEqual(error.source, "guides/first.mdx");
              })
            )
          )
      )
  );
});
