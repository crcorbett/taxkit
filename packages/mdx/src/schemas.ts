import { Array, Match, Schema } from "effect";

// The supported MDX, as the installed parser reports it. Anything else,
// including JSX, images, raw HTML, quotes and nested lists, fails the page.
const SyntaxText = Schema.Struct({
  type: Schema.Literal("text"),
  value: Schema.String.check(Schema.isMinLength(1)),
});
const SyntaxInlineCode = Schema.Struct({
  type: Schema.Literal("inlineCode"),
  value: Schema.String.check(Schema.isMinLength(1)),
});
export const SyntaxLeaf = Schema.Union([SyntaxText, SyntaxInlineCode]).pipe(
  Schema.toTaggedUnion("type")
);
export type SyntaxLeaf = typeof SyntaxLeaf.Type;
const SyntaxLeaves = Schema.Array(SyntaxLeaf).check(Schema.isMinLength(1));
const SyntaxStrong = Schema.Struct({
  children: SyntaxLeaves,
  type: Schema.Literal("strong"),
});
const SyntaxEmphasis = Schema.Struct({
  children: SyntaxLeaves,
  type: Schema.Literal("emphasis"),
});
export const SyntaxFormatted = Schema.Union([
  SyntaxText,
  SyntaxInlineCode,
  SyntaxStrong,
  SyntaxEmphasis,
]).pipe(Schema.toTaggedUnion("type"));
export type SyntaxFormatted = typeof SyntaxFormatted.Type;
const SyntaxLink = Schema.Struct({
  children: Schema.Array(SyntaxFormatted).check(Schema.isMinLength(1)),
  type: Schema.Literal("link"),
  url: Schema.String,
});
export const SyntaxPhrasing = Schema.Union([
  SyntaxText,
  SyntaxInlineCode,
  SyntaxStrong,
  SyntaxEmphasis,
  SyntaxLink,
]).pipe(Schema.toTaggedUnion("type"));
export type SyntaxPhrasing = typeof SyntaxPhrasing.Type;

// The words a reader sees in a run of inline syntax, without formatting.
export const plainText = (nodes: readonly SyntaxPhrasing[]): string =>
  Array.map(nodes, (node) =>
    Match.value(node).pipe(
      Match.discriminatorsExhaustive("type")({
        emphasis: ({ children }) => plainText(children),
        inlineCode: ({ value }) => value,
        link: ({ children }) => plainText(children),
        strong: ({ children }) => plainText(children),
        text: ({ value }) => value,
      })
    )
  ).join("");

const SyntaxPhrasings = Schema.Array(SyntaxPhrasing).check(
  Schema.isMinLength(1)
);
const SyntaxParagraph = Schema.Struct({
  children: SyntaxPhrasings,
  type: Schema.Literal("paragraph"),
});
const SyntaxHeading = Schema.Struct({
  children: SyntaxPhrasings,
  depth: Schema.Literals([1, 2, 3, 4]),
  type: Schema.Literal("heading"),
});
const SyntaxList = Schema.Struct({
  children: Schema.Array(
    Schema.Struct({
      children: Schema.Tuple([SyntaxParagraph]),
      type: Schema.Literal("listItem"),
    })
  ).check(Schema.isMinLength(1)),
  ordered: Schema.Boolean,
  start: Schema.OptionFromNullOr(Schema.Int),
  type: Schema.Literal("list"),
});
export const SyntaxTableRow = Schema.Struct({
  children: Schema.Array(
    Schema.Struct({
      children: Schema.Array(SyntaxPhrasing),
      type: Schema.Literal("tableCell"),
    })
  ).check(Schema.isMinLength(1)),
  type: Schema.Literal("tableRow"),
});
export type SyntaxTableRow = typeof SyntaxTableRow.Type;
const SyntaxTable = Schema.Struct({
  align: Schema.Array(
    Schema.OptionFromNullOr(Schema.Literals(["left", "center", "right"]))
  ),
  children: Schema.TupleWithRest(Schema.Tuple([SyntaxTableRow]), [
    SyntaxTableRow,
  ]),
  type: Schema.Literal("table"),
});
const SyntaxCode = Schema.Struct({
  lang: Schema.OptionFromNullOr(Schema.String),
  meta: Schema.OptionFromNullOr(Schema.String),
  type: Schema.Literal("code"),
  value: Schema.String,
});
export const SyntaxBlock = Schema.Union([
  SyntaxParagraph,
  SyntaxHeading,
  SyntaxList,
  SyntaxTable,
  SyntaxCode,
]).pipe(Schema.toTaggedUnion("type"));
export type SyntaxBlock = typeof SyntaxBlock.Type;

// A page is its `#` title followed by at least one body block.
export const SyntaxRoot = Schema.Struct({
  children: Schema.TupleWithRest(
    Schema.Tuple([
      Schema.Struct({ ...SyntaxHeading.fields, depth: Schema.Literal(1) }),
      SyntaxBlock,
    ]),
    [SyntaxBlock]
  ),
  type: Schema.Literal("root"),
});
