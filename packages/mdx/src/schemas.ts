import { Array, HashSet, Schema } from "effect";

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

export const TokenColor = Schema.String.check(
  Schema.isPattern(/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu)
).pipe(Schema.brand("taxkit/TokenColor"));
export type TokenColor = typeof TokenColor.Type;

export const TokenStyle = Schema.Literals([
  "normal",
  "italic",
  "bold",
  "bold-italic",
]);
export type TokenStyle = typeof TokenStyle.Type;

export const CodeToken = Schema.Struct({
  color: Schema.OptionFromNullOr(TokenColor),
  style: TokenStyle,
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
export const TableBlock = Schema.Struct({
  align: Schema.Array(TableAlign),
  header: TableCells,
  kind: Schema.Literal("table"),
  rows: Schema.Array(TableCells),
}).check(
  Schema.makeFilter(
    (table) =>
      table.align.length === table.header.length &&
      Array.every(table.rows, (row) => row.length === table.header.length),
    { message: "Every table row must have the header's column count." }
  )
);
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

const UniqueHeadingIds = Schema.makeFilter(
  (blocks: readonly Block[]) => {
    const ids = Array.map(
      Array.filter(blocks, (block) => block.kind === "heading"),
      (heading) => heading.id
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
  }).check(
    Schema.makeFilter(
      (table) =>
        table.align.length === table.header.length &&
        Array.every(table.rows, (row) => row.length === table.header.length)
    )
  ),
  Schema.Struct({ ...CodeBlock.fields, lines: CodeLines }).check(
    Schema.makeFilter(
      (block) =>
        Array.map(block.lines, (line) =>
          Array.map(line, (token) => token.text).join("")
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
});
export type RenderedDocument = typeof RenderedDocument.Type;
