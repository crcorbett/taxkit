import { Function as EffectFunction, Array, HashSet, Schema } from "effect";

import { Theme, TokenAppearance } from "./theme.schemas.js";

export const NonEmptyText = Schema.Trimmed.check(Schema.isMinLength(1));
export const InlineText = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("taxkit/mdx/InlineText")
);
export type InlineText = typeof InlineText.Type;
export const SourceText = Schema.String.check(
  Schema.isMaxLength(1_000_000)
).pipe(Schema.brand("taxkit/mdx/SourceText"));
export type SourceText = typeof SourceText.Type;
export const CodeText = Schema.String.check(Schema.isMaxLength(20_000)).pipe(
  Schema.brand("taxkit/mdx/CodeText")
);
export type CodeText = typeof CodeText.Type;
// An authored target is unresolved; even an empty target can have host semantics.
export const LinkTarget = Schema.String.check(Schema.isMaxLength(8192)).pipe(
  Schema.brand("taxkit/mdx/LinkTarget")
);
export type LinkTarget = typeof LinkTarget.Type;
export const ListStart = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(1)
).pipe(Schema.brand("taxkit/mdx/ListStart"));
export type ListStart = typeof ListStart.Type;
export const SourceId = NonEmptyText.pipe(Schema.brand("taxkit/mdx/SourceId"));
export type SourceId = typeof SourceId.Type;
export const LinkReference = Schema.Struct({
  sourceId: SourceId,
  target: LinkTarget,
});
export type LinkReference = typeof LinkReference.Type;
export const LinkDestination = NonEmptyText.check(
  Schema.isMaxLength(8192)
).pipe(Schema.brand("taxkit/mdx/LinkDestination"));
export type LinkDestination = typeof LinkDestination.Type;
export const Source = Schema.Struct({
  id: SourceId,
  text: SourceText,
});
export type Source = typeof Source.Type;
export const Metadata = Schema.Record(Schema.String, Schema.Json);
export const HeadingId = NonEmptyText.pipe(
  Schema.brand("taxkit/mdx/HeadingId")
);
export type HeadingId = typeof HeadingId.Type;
export const CodeLanguage = Schema.Literals(["json", "md", "sh", "ts", "txt"]);
export type CodeLanguage = typeof CodeLanguage.Type;
export const CodeSnippet = Schema.Struct({
  language: CodeLanguage,
  text: CodeText,
});
export type CodeSnippet = typeof CodeSnippet.Type;
export const CodeHighlightRequest = Schema.Struct({
  snippet: CodeSnippet,
  theme: Theme,
});
export type CodeHighlightRequest = typeof CodeHighlightRequest.Type;
export const CodeToken = Schema.Struct({
  light: TokenAppearance,
  dark: TokenAppearance,
  text: InlineText,
});
export type CodeToken = typeof CodeToken.Type;
// Each line keeps its tokens; an empty line has none.
export const CodeLines = Schema.Array(Schema.Array(CodeToken)).check(
  Schema.isMinLength(1)
);
export type CodeLines = typeof CodeLines.Type;
export const DiagramTitle = NonEmptyText.check(Schema.isMaxLength(200)).pipe(
  Schema.brand("taxkit/DiagramTitle")
);
export type DiagramTitle = typeof DiagramTitle.Type;
export const DiagramSource = NonEmptyText.check(
  Schema.isMaxLength(10_000)
).pipe(Schema.brand("taxkit/DiagramSource"));
export type DiagramSource = typeof DiagramSource.Type;
export const DiagramRenderRequest = Schema.Struct({
  source: DiagramSource,
  theme: Theme,
});
export type DiagramRenderRequest = typeof DiagramRenderRequest.Type;
// A finished standalone SVG document from the diagram renderer.
export const DiagramSvg = Schema.String.check(
  Schema.isMaxLength(500_000),
  Schema.isPattern(/^<svg[\s>][\s\S]*<\/svg>\s*$/u)
).pipe(Schema.brand("taxkit/DiagramSvg"));
export type DiagramSvg = typeof DiagramSvg.Type;
export const Text = Schema.Struct({
  kind: Schema.Literal("text"),
  text: InlineText,
});
export const InlineCode = Schema.Struct({
  kind: Schema.Literal("inline-code"),
  text: InlineText,
});
const Leaf = Schema.Union([Text, InlineCode]);
const Leaves = Schema.Array(Leaf).check(Schema.isMinLength(1));
export const Strong = Schema.Struct({
  content: Leaves,
  kind: Schema.Literal("strong"),
});
export const Emphasis = Schema.Struct({
  content: Leaves,
  kind: Schema.Literal("emphasis"),
});
const Formatted = Schema.Union([Text, InlineCode, Strong, Emphasis]);
export const Link = Schema.Struct({
  content: Schema.Array(Formatted).check(Schema.isMinLength(1)),
  kind: Schema.Literal("link"),
  target: LinkTarget,
});
export const Inline = Schema.Union([
  Text,
  InlineCode,
  Strong,
  Emphasis,
  Link,
]).pipe(Schema.toTaggedUnion("kind"));
export type Inline = typeof Inline.Type;
export const Inlines = Schema.Array(Inline).check(Schema.isMinLength(1));
export type Inlines = typeof Inlines.Type;
export const HeadingBlock = Schema.Struct({
  content: Inlines,
  depth: Schema.Literals([1, 2, 3, 4]),
  id: HeadingId,
  kind: Schema.Literal("heading"),
});
export const ParagraphBlock = Schema.Struct({
  content: Inlines,
  kind: Schema.Literal("paragraph"),
});
export const ListBlock = Schema.Struct({
  items: Schema.Array(Inlines).check(Schema.isMinLength(1)),
  kind: Schema.Literal("list"),
  ordered: Schema.Boolean,
  start: ListStart,
});
export const TableAlign = Schema.Literals(["left", "center", "right", "none"]);
const TableCells = Schema.Array(Schema.Array(Inline)).check(
  Schema.isMinLength(1)
);
// Inline representations differ between source, rendered and reading nodes;
// their table-width invariant depends only on the three array lengths.
export const ConsistentTableColumns = Schema.makeFilter(
  (
    table: Readonly<{
      align: readonly unknown[];
      header: readonly unknown[];
      rows: readonly (readonly unknown[])[];
    }>
  ) =>
    table.align.length === table.header.length &&
    EffectFunction.pipe(
      table.rows,
      Array.every((row) => row.length === table.header.length)
    ),
  { message: "Every table row must have the header's column count." }
);
export const TableBlock = Schema.Struct({
  align: Schema.Array(TableAlign),
  header: TableCells,
  kind: Schema.Literal("table"),
  rows: Schema.Array(TableCells),
}).check(ConsistentTableColumns);
export const CodeBlock = Schema.Struct({
  kind: Schema.Literal("code"),
  language: CodeLanguage,
  text: CodeSnippet.fields.text,
});
export const DiagramBlock = Schema.Struct({
  kind: Schema.Literal("diagram"),
  source: DiagramSource,
  title: DiagramTitle,
});
export const Block = Schema.Union([
  HeadingBlock,
  ParagraphBlock,
  ListBlock,
  TableBlock,
  CodeBlock,
  DiagramBlock,
]).pipe(Schema.toTaggedUnion("kind"));
export type Block = typeof Block.Type;
export const UniqueHeadingIds = Schema.makeFilter(
  (blocks: readonly (Block | ReadingBlock)[]) => {
    const ids = EffectFunction.pipe(
      blocks,
      Array.filter((block) => block.kind === "heading"),
      Array.map((heading) => heading.id)
    );
    return HashSet.size(HashSet.fromIterable(ids)) === ids.length;
  },
  { message: "Heading ids must be unique." }
);
export const Blocks = Schema.Array(Block).check(UniqueHeadingIds);
export const Document = Schema.Struct({
  blocks: Blocks,
  format: Schema.Literal("mdx-document"),
  metadata: Schema.OptionFromNullOr(Metadata),
  sourceId: SourceId,
  version: Schema.Literal(1),
});
export type Document = typeof Document.Type;
export const RenderRequest = Schema.Struct({
  document: Document,
  theme: Theme,
});
export type RenderRequest = typeof RenderRequest.Type;
export const RenderedLink = Schema.Struct({
  ...Link.fields,
  href: LinkDestination,
});
const RenderedInline = Schema.Union([
  Text,
  InlineCode,
  Strong,
  Emphasis,
  RenderedLink,
]).pipe(Schema.toTaggedUnion("kind"));
export type RenderedInline = typeof RenderedInline.Type;
const RenderedInlines = Schema.Array(RenderedInline).check(
  Schema.isMinLength(1)
);
export const RenderedBlock = Schema.Union([
  Schema.Struct({ ...HeadingBlock.fields, content: RenderedInlines }),
  Schema.Struct({ ...ParagraphBlock.fields, content: RenderedInlines }),
  Schema.Struct({
    ...ListBlock.fields,
    items: Schema.Array(RenderedInlines).check(Schema.isMinLength(1)),
  }),
  Schema.Struct({
    ...TableBlock.fields,
    header: Schema.Array(Schema.Array(RenderedInline)).check(
      Schema.isMinLength(1)
    ),
    rows: Schema.Array(
      Schema.Array(Schema.Array(RenderedInline)).check(Schema.isMinLength(1))
    ),
  }).check(ConsistentTableColumns),
  Schema.Struct({ ...CodeBlock.fields, lines: CodeLines }).check(
    Schema.makeFilter(
      (block) =>
        EffectFunction.pipe(
          block.lines,
          Array.map((line) =>
            EffectFunction.pipe(
              line,
              Array.map((token) => token.text)
            ).join("")
          )
        ).join("\n") === block.text,
      { message: "Tokens must preserve source text." }
    )
  ),
  Schema.Struct({ ...DiagramBlock.fields, svg: DiagramSvg }),
]).pipe(Schema.toTaggedUnion("kind"));
export type RenderedBlock = typeof RenderedBlock.Type;
export const RenderedDocument = Schema.Struct({
  ...Document.fields,
  blocks: Schema.Array(RenderedBlock).check(UniqueHeadingIds),
  format: Schema.Literal("mdx-rendered-document"),
  theme: Theme,
  version: Schema.Literal(2),
});
export type RenderedDocument = typeof RenderedDocument.Type;

// Checked presentation values omit authored link targets and redundant code
// source, while retaining the renderer's paired tokens and finished diagrams.
export const ReadingLink = Schema.Struct({
  content: RenderedLink.fields.content,
  href: RenderedLink.fields.href,
  kind: RenderedLink.fields.kind,
});
export type ReadingLink = typeof ReadingLink.Type;
export const ReadingInline = Schema.Union([
  Text,
  InlineCode,
  Strong,
  Emphasis,
  ReadingLink,
]).pipe(Schema.toTaggedUnion("kind"));
export type ReadingInline = typeof ReadingInline.Type;
export const ReadingInlines = Schema.Array(ReadingInline).check(
  Schema.isMinLength(1)
);
export type ReadingInlines = typeof ReadingInlines.Type;
export const ReadingHeadingBlock = Schema.Struct({
  ...HeadingBlock.fields,
  content: ReadingInlines,
});
export const ReadingParagraphBlock = Schema.Struct({
  ...ParagraphBlock.fields,
  content: ReadingInlines,
});
export const ReadingListBlock = Schema.Struct({
  ...ListBlock.fields,
  items: Schema.Array(ReadingInlines).check(Schema.isMinLength(1)),
});
const ReadingTableCells = Schema.Array(Schema.Array(ReadingInline)).check(
  Schema.isMinLength(1)
);
export const ReadingTableBlock = Schema.Struct({
  ...TableBlock.fields,
  header: ReadingTableCells,
  rows: Schema.Array(ReadingTableCells),
}).check(ConsistentTableColumns);
export const ReadingCodeBlock = Schema.Struct({
  kind: RenderedBlock.cases.code.fields.kind,
  language: RenderedBlock.cases.code.fields.language,
  lines: RenderedBlock.cases.code.fields.lines,
});
export type ReadingCodeBlock = typeof ReadingCodeBlock.Type;
export const ReadingDiagramBlock = RenderedBlock.cases.diagram;
export const ReadingBlock = Schema.Union([
  ReadingHeadingBlock,
  ReadingParagraphBlock,
  ReadingListBlock,
  ReadingTableBlock,
  ReadingCodeBlock,
  ReadingDiagramBlock,
]).pipe(Schema.toTaggedUnion("kind"));
export type ReadingBlock = typeof ReadingBlock.Type;
export const ReadingBody = Schema.Array(ReadingBlock).check(UniqueHeadingIds);
export type ReadingBody = typeof ReadingBody.Type;
