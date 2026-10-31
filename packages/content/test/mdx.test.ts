import { assert, describe, it } from "@effect/vitest";
import {
  DocsPagePath,
  DocsRepositoryProfile,
  DocsSourcePath,
} from "@taxkit/content/schemas";
import { CodeHighlightError, DiagramRenderError } from "@taxkit/mdx/errors";
import { MdxLive } from "@taxkit/mdx/live";
import { CodeHighlighter, DiagramRenderer } from "@taxkit/mdx/service";
import { CodeHighlighterTest, DiagramRendererTest } from "@taxkit/mdx/test";
import { Array, Effect, HashMap, Layer, Schema } from "effect";

import { ContentLinkResolverLive } from "../src/link-resolver.layer.js";
import { DocsLinkTargets } from "../src/links.js";
import { ContentMdxReaderLive } from "../src/mdx.layer.js";
import { DocsPageReader } from "../src/service.js";

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

const MdxPageReaderLive = ContentMdxReaderLive.pipe(
  Layer.provide(MdxLive),
  Layer.provide(
    ContentLinkResolverLive.pipe(
      Layer.provide(
        Layer.effect(
          DocsLinkTargets,
          Effect.suspend(() => links)
        )
      )
    )
  )
);

const ReaderTest = MdxPageReaderLive.pipe(
  Layer.provide(Layer.merge(CodeHighlighterTest, DiagramRendererTest))
);

const page = (body: string) =>
  `---\ntitle: "First guide"\ndescription: "Read the first guide."\nstatus: "published"\n---\n\n# First guide\n\n${body}`;

const read = (text: string) =>
  Effect.gen(function* () {
    const context = yield* links;
    const reader = yield* DocsPageReader;
    return yield* reader.read({ path: context.source, text });
  }).pipe(Effect.provide(ReaderTest));

describe("MDX page reader", () => {
  it.effect(
    "uses the source file for relative links and closes its dependencies",
    () =>
      Effect.gen(function* () {
        const reader = yield* DocsPageReader.pipe(Effect.provide(ReaderTest));
        const path = yield* DocsSourcePath.makeEffect("start/another.mdx");
        // The targets still carry the old helper's source field. It cannot
        // override the actual file or affect relative link resolution.
        const result = yield* reader.read({
          path,
          text: page("See [Start](./index.mdx).\n\n```ts\nconst n = 1;\n```"),
        });
        const [paragraph] = result.body;
        assert.deepEqual<unknown>(paragraph, {
          content: [
            { kind: "text", text: "See " },
            {
              content: [{ kind: "text", text: "Start" }],
              href: "/start",
              kind: "link",
            },
            { kind: "text", text: "." },
          ],
          kind: "paragraph",
        });
      })
  );

  it.effect("preserves highlighter refusal and malformed-token reasons", () =>
    Effect.forEach(["highlight", "tokens"] as const, (reason) =>
      Effect.gen(function* () {
        const context = yield* links;
        const reader = yield* DocsPageReader.pipe(
          Effect.provide(
            MdxPageReaderLive.pipe(
              Layer.provide(
                Layer.merge(
                  Layer.succeed(CodeHighlighter, {
                    highlight: (snippet) =>
                      Effect.fail(
                        new CodeHighlightError({
                          language: snippet.language,
                          reason,
                        })
                      ),
                  }),
                  DiagramRendererTest
                )
              )
            )
          )
        );
        const error = yield* reader
          .read({
            path: context.source,
            text: page("```ts\nconst n = 1;\n```"),
          })
          .pipe(Effect.flip);
        assert.strictEqual(error._tag, "DocsPageReadError");
        assert.strictEqual(
          error.reason,
          reason === "highlight" ? "code-highlight" : "code-tokens"
        );
        assert.strictEqual(error.source, context.source);
        assert.notInclude(error.message, "const n");
      })
    )
  );

  it.effect("preserves diagram refusal and malformed-SVG reasons", () =>
    Effect.forEach(["render", "svg"] as const, (reason) =>
      Effect.gen(function* () {
        const context = yield* links;
        const reader = yield* DocsPageReader.pipe(
          Effect.provide(
            MdxPageReaderLive.pipe(
              Layer.provide(
                Layer.merge(
                  CodeHighlighterTest,
                  Layer.succeed(DiagramRenderer, {
                    render: () =>
                      Effect.fail(new DiagramRenderError({ reason })),
                  })
                )
              )
            )
          )
        );
        const error = yield* reader
          .read({
            path: context.source,
            text: page(
              '```mermaid title="Steps"\nflowchart LR\n  A --> B\n```'
            ),
          })
          .pipe(Effect.flip);
        assert.strictEqual(error._tag, "DocsPageReadError");
        assert.strictEqual(
          error.reason,
          reason === "render" ? "diagram-render" : "diagram-svg"
        );
        assert.strictEqual(error.source, context.source);
        assert.notInclude(error.message, "flowchart");
      })
    )
  );

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
          ["No frontmatter", "frontmatter"],
          [page("<Callout>Hi</Callout>"), "syntax"],
          [page("![An image](./a.png)"), "syntax"],
          [page("See [nowhere](./missing.mdx)."), "link"],
          [page("Write to [us](mailto:a@example.com)."), "link"],
          [page("# A second title"), "heading"],
          [page("```mermaid\nflowchart LR\n  A --> B\n```"), "diagram-title"],
          [page('```ts title="a.ts"\nconst a = 1;\n```'), "code-metadata"],
          [page("```python\nprint(1)\n```"), "code-language"],
          [page("## Twice\n\n## Twice"), "body"],
          [page("> A quote"), "syntax"],
          [
            `---\ntitle: "Other"\ndescription: "Read it."\nstatus: "published"\n---\n\n# First guide\n\nText.`,
            "title",
          ],
          [
            `---\ntitle: "First guide"\ndescription: "Read it."\nstatus: "published"\nextra: true\n---\n\n# First guide\n\nText.`,
            "frontmatter",
          ],
        ] as const,
        ([text, reason]) =>
          read(text).pipe(
            Effect.flip,
            Effect.flatMap((error) =>
              Effect.sync(() => {
                assert.strictEqual(error._tag, "DocsPageReadError");
                assert.strictEqual(error.reason, reason);
                assert.strictEqual(error.source, "guides/first.mdx");
              })
            )
          )
      )
  );
});
