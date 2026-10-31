import * as Mdx from "@taxkit/mdx/schemas";
import {
  Match,
  Function as EffectFunction,
  Array,
  HashSet,
  Schema,
} from "effect";
// Shared public address policy; API and Website retain distinct identities.
export const PublicHttpOrigin = Schema.URLFromString.check(
  Schema.makeFilter(
    (url) =>
      url.href === `${url.origin}/` &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          (url.hostname === "localhost" || url.hostname === "127.0.0.1")))
  )
);
export const DocsWebsiteOrigin = PublicHttpOrigin.pipe(
  Schema.brand("taxkit/DocsWebsiteOrigin")
);
export type DocsWebsiteOrigin = typeof DocsWebsiteOrigin.Type;
// The main public address named by published pages and discovery documents,
// including when a page is served by a separate Preview Website.
export const DocsPublicationOrigin = PublicHttpOrigin.pipe(
  Schema.brand("taxkit/DocsPublicationOrigin")
);
export type DocsPublicationOrigin = typeof DocsPublicationOrigin.Type;
export const DocsNonEmptyText = Schema.Trimmed.check(Schema.isMinLength(1));
export type DocsNonEmptyText = typeof DocsNonEmptyText.Type;
export const DocsPagePath = DocsNonEmptyText.pipe(
  Schema.brand("taxkit/DocsPagePath")
);
export type DocsPagePath = typeof DocsPagePath.Type;
export const DocsPublicPagePath = DocsPagePath.check(
  Schema.isMaxLength(256),
  Schema.isPattern(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/u)
);
export type DocsPublicPagePath = typeof DocsPublicPagePath.Type;
export const DocsPageSlug = DocsNonEmptyText.pipe(
  Schema.brand("taxkit/DocsPageSlug")
);
export type DocsPageSlug = typeof DocsPageSlug.Type;
export const DocsSourcePath = DocsNonEmptyText.pipe(
  Schema.brand("taxkit/DocsSourcePath")
);
export type DocsSourcePath = typeof DocsSourcePath.Type;
export const DocsContentStatus = Schema.Literals(["draft", "published"]);
export type DocsContentStatus = typeof DocsContentStatus.Type;
export const DocsPageFrontmatter = Schema.Struct({
  description: DocsNonEmptyText,
  status: DocsContentStatus,
  title: DocsNonEmptyText,
});
export type DocsPageFrontmatter = typeof DocsPageFrontmatter.Type;
export const DocsPageType = Schema.Literals([
  "api reference overview",
  "changelog or release note",
  "concept",
  "contribution guide",
  "decision page",
  "guide",
  "quickstart",
  "reference",
  "section index",
  "troubleshooting",
]);
export type DocsPageType = typeof DocsPageType.Type;
export const DocsPrimaryReader = Schema.Literals([
  "API consumer",
  "Application integrator",
  "Correctness reviewer",
  "Documentation contributor",
  "New contributor",
  "SDK evaluator",
  "Type-safety focused developer",
]);
export type DocsPrimaryReader = typeof DocsPrimaryReader.Type;
export const DocsNavigationLeaf = Schema.Struct({
  pageType: DocsPageType,
  path: DocsPagePath,
  primaryReader: DocsPrimaryReader,
  source: DocsSourcePath,
  title: DocsNonEmptyText,
});
export type DocsNavigationLeaf = typeof DocsNavigationLeaf.Type;
export const DocsNavigationItem = Schema.Struct({
  ...DocsNavigationLeaf.fields,
  pages: Schema.optional(Schema.Array(DocsNavigationLeaf)),
});
export type DocsNavigationItem = typeof DocsNavigationItem.Type;
export const DocsNavigation = Schema.Struct({
  $schema: Schema.optional(Schema.String),
  contentRoot: Schema.Literal("content/docs"),
  primaryNavigation: Schema.Array(DocsNavigationItem),
  status: DocsContentStatus,
});
export type DocsNavigation = typeof DocsNavigation.Type;
// One authored page as the API bundles it: its path inside `content/docs` and
// the raw MDX text. Content checks everything else when it builds the catalogue.
export const DocsSource = Schema.Struct({
  path: DocsSourcePath,
  text: Schema.String,
});
export type DocsSource = typeof DocsSource.Type;
// Where repository links in the docs point. Page links never use these.
export const DocsRepositoryRevision = Schema.String.check(
  Schema.isPattern(/^[a-f0-9]{40}$/u)
).pipe(Schema.brand("taxkit/DocsRepositoryRevision"));
export type DocsRepositoryRevision = typeof DocsRepositoryRevision.Type;
export const DocsRepositoryProfile = Schema.Struct({
  checkedExampleRevision: DocsRepositoryRevision,
  repositoryRevision: DocsRepositoryRevision,
  repositoryUrl: Schema.URLFromString,
});
export type DocsRepositoryProfile = typeof DocsRepositoryProfile.Type;
// A link target after Content resolves it: a public page path with an optional
// fragment, a fragment on the same page, or an absolute HTTPS address.
export const DocsLinkHref = Schema.String.check(
  Schema.isMaxLength(2048),
  Schema.isPattern(
    /^(?:\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:#[a-z0-9-]+)?|#[a-z0-9-]+|https:\/\/\S+)$/u
  )
).pipe(Schema.brand("taxkit/DocsLinkHref"));
export type DocsLinkHref = typeof DocsLinkHref.Type;
export const DocsHeadingId = Schema.String.check(
  Schema.isMaxLength(120),
  Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
).pipe(Schema.brand("taxkit/DocsHeadingId"));
export type DocsHeadingId = typeof DocsHeadingId.Type;
const DocsInlineText = Schema.String.check(Schema.isMinLength(1));
export const DocsText = Schema.Struct({
  kind: Schema.Literal("text"),
  text: DocsInlineText,
});
export const DocsInlineCode = Schema.Struct({
  kind: Schema.Literal("inline-code"),
  text: DocsInlineText,
});
const DocsLeaf = Schema.Union([DocsText, DocsInlineCode]);
const DocsLeaves = Schema.Array(DocsLeaf).check(Schema.isMinLength(1));
export const DocsStrong = Schema.Struct({
  content: DocsLeaves,
  kind: Schema.Literal("strong"),
});
export const DocsEmphasis = Schema.Struct({
  content: DocsLeaves,
  kind: Schema.Literal("emphasis"),
});
const DocsFormatted = Schema.Union([
  DocsText,
  DocsInlineCode,
  DocsStrong,
  DocsEmphasis,
]);
export const DocsLink = Schema.Struct({
  content: Schema.Array(DocsFormatted).check(Schema.isMinLength(1)),
  href: DocsLinkHref,
  kind: Schema.Literal("link"),
});
export const DocsInline = Schema.Union([
  DocsText,
  DocsInlineCode,
  DocsStrong,
  DocsEmphasis,
  DocsLink,
]).pipe(Schema.toTaggedUnion("kind"));
export type DocsInline = typeof DocsInline.Type;
export const DocsInlines = Schema.Array(DocsInline).check(
  Schema.isMinLength(1)
);
export type DocsInlines = typeof DocsInlines.Type;
// Preserve the public Content identities while reusing MDX's wire refinements.
// Neutral semantic brands stay inside MDX; the Content adapter projects them.
export const DocsCodeLanguage = Mdx.CodeLanguage;
export type DocsCodeLanguage = typeof DocsCodeLanguage.Type;
export const DocsTokenColor = Schema.toEncoded(Mdx.TokenColor).pipe(
  Schema.brand("taxkit/DocsTokenColor")
);
export type DocsTokenColor = typeof DocsTokenColor.Type;
export const DocsTokenStyle = Mdx.TokenStyle;
export type DocsTokenStyle = typeof DocsTokenStyle.Type;
export const DocsCodeToken = Schema.Struct({
  color: Schema.OptionFromNullOr(DocsTokenColor),
  style: DocsTokenStyle,
  text: DocsInlineText,
});
export type DocsCodeToken = typeof DocsCodeToken.Type;
export const DocsCodeLines = Schema.Array(Schema.Array(DocsCodeToken)).check(
  Schema.isMinLength(1)
);
export type DocsCodeLines = typeof DocsCodeLines.Type;
export const DocsDiagramTitle = Schema.toEncoded(Mdx.DiagramTitle).pipe(
  Schema.brand("taxkit/DocsDiagramTitle")
);
export type DocsDiagramTitle = typeof DocsDiagramTitle.Type;
export const DocsDiagramSource = Schema.toEncoded(Mdx.DiagramSource).pipe(
  Schema.brand("taxkit/DocsDiagramSource")
);
export type DocsDiagramSource = typeof DocsDiagramSource.Type;
export const DocsDiagramSvg = Schema.toEncoded(Mdx.DiagramSvg).pipe(
  Schema.brand("taxkit/DocsDiagramSvg")
);
export type DocsDiagramSvg = typeof DocsDiagramSvg.Type;
export const DocsHeadingBlock = Schema.Struct({
  content: DocsInlines,
  depth: Schema.Literals([2, 3, 4]),
  id: DocsHeadingId,
  kind: Schema.Literal("heading"),
});
export const DocsParagraphBlock = Schema.Struct({
  content: DocsInlines,
  kind: Schema.Literal("paragraph"),
});
export const DocsListBlock = Schema.Struct({
  items: Schema.Array(DocsInlines).check(Schema.isMinLength(1)),
  kind: Schema.Literal("list"),
  ordered: Schema.Boolean,
  start: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
});
export const DocsTableAlign = Schema.Literals([
  "left",
  "center",
  "right",
  "none",
]);
const DocsTableCells = Schema.Array(Schema.Array(DocsInline)).check(
  Schema.isMinLength(1)
);
export const DocsTableBlock = Schema.Struct({
  align: Schema.Array(DocsTableAlign),
  header: DocsTableCells,
  kind: Schema.Literal("table"),
  rows: Schema.Array(DocsTableCells),
}).check(
  Schema.makeFilter(
    (table) =>
      table.align.length === table.header.length &&
      EffectFunction.pipe(
        table.rows,
        Array.every((row) => row.length === table.header.length)
      ),
    { message: "Every table row must have the header's column count." }
  )
);
export const DocsCodeBlock = Schema.Struct({
  kind: Schema.Literal("code"),
  language: DocsCodeLanguage,
  lines: DocsCodeLines,
});
export const DocsDiagramBlock = Schema.Struct({
  kind: Schema.Literal("diagram"),
  source: DocsDiagramSource,
  svg: DocsDiagramSvg,
  title: DocsDiagramTitle,
});
export const DocsBlock = Schema.Union([
  DocsHeadingBlock,
  DocsParagraphBlock,
  DocsListBlock,
  DocsTableBlock,
  DocsCodeBlock,
  DocsDiagramBlock,
]).pipe(Schema.toTaggedUnion("kind"));
export type DocsBlock = typeof DocsBlock.Type;
// The page body after its `#` title. Heading ids are unique within a page.
export const DocsReadingBody = Schema.Array(DocsBlock).check(
  Schema.isMinLength(1),
  Schema.makeFilter(
    (blocks) => {
      const ids = EffectFunction.pipe(
        blocks,
        Array.flatMap((block) =>
          Match.value(block).pipe(
            Match.when({ kind: "heading" }, (matchedValue) => [
              matchedValue.id,
            ]),
            Match.orElse(() => [])
          )
        )
      );
      return HashSet.size(HashSet.fromIterable(ids)) === ids.length;
    },
    { message: "Heading ids must be unique within a page." }
  )
);
export type DocsReadingBody = typeof DocsReadingBody.Type;
// One authored page after its MDX is read: checked frontmatter and body.
export const DocsReadPage = Schema.Struct({
  body: DocsReadingBody,
  frontmatter: DocsPageFrontmatter,
  markdown: Schema.String,
});
export type DocsReadPage = typeof DocsReadPage.Type;
export const DocsContentPage = Schema.Struct({
  ...DocsReadPage.fields,
  markdown: Schema.String,
  path: DocsPagePath,
  slugs: Schema.Array(DocsPageSlug),
  source: DocsSourcePath,
});
export type DocsContentPage = typeof DocsContentPage.Type;
export const DocsPublicPage = Schema.Struct({
  ...DocsContentPage.fields,
  frontmatter: Schema.Struct({
    ...DocsPageFrontmatter.fields,
    status: Schema.Literal("published"),
  }),
  path: DocsPublicPagePath,
}).check(
  Schema.makeFilter(
    (page) => {
      const path = page.slugs.join("/");
      return (
        page.path === `/${path}` &&
        (page.source === `${path}.mdx` || page.source === `${path}/index.mdx`)
      );
    },
    { message: "The public page address and source must agree." }
  )
);
export type DocsPublicPage = typeof DocsPublicPage.Type;
export const DocsPublicNavigationItem = Schema.Struct({
  ...DocsNavigationLeaf.fields,
  pages: Schema.Array(DocsNavigationLeaf),
});
export type DocsPublicNavigationItem = typeof DocsPublicNavigationItem.Type;
export const DocsPublicNavigation = Schema.Struct({
  primaryNavigation: Schema.Array(DocsPublicNavigationItem),
});
export type DocsPublicNavigation = typeof DocsPublicNavigation.Type;
export const DocsPublicCatalogue = Schema.Struct({
  navigation: DocsPublicNavigation,
  pages: Schema.Array(DocsPublicPage),
  schemaVersion: Schema.Literal(1),
}).check(
  Schema.makeFilter(
    (catalogue) => {
      const navigation = EffectFunction.pipe(
        catalogue.navigation.primaryNavigation,
        Array.flatMap((item) => [item, ...item.pages])
      );
      return (
        HashSet.size(
          HashSet.fromIterable(
            EffectFunction.pipe(
              catalogue.pages,
              Array.map((page) => page.path)
            )
          )
        ) === catalogue.pages.length &&
        HashSet.size(
          HashSet.fromIterable(
            EffectFunction.pipe(
              catalogue.pages,
              Array.map((page) => page.source)
            )
          )
        ) === catalogue.pages.length &&
        HashSet.size(
          HashSet.fromIterable(
            EffectFunction.pipe(
              navigation,
              Array.map((item) => item.path)
            )
          )
        ) === navigation.length &&
        navigation.length === catalogue.pages.length &&
        EffectFunction.pipe(
          navigation,
          Array.every((item) =>
            EffectFunction.pipe(
              catalogue.pages,
              Array.some(
                (page) =>
                  page.path === item.path &&
                  page.source === item.source &&
                  page.frontmatter.title === item.title
              )
            )
          )
        )
      );
    },
    {
      message:
        "The public catalogue must contain unique pages and matching navigation.",
    }
  )
);
export type DocsPublicCatalogue = typeof DocsPublicCatalogue.Type;
export const DocsSearchTerm = DocsNonEmptyText.check(
  Schema.isMaxLength(100)
).pipe(Schema.brand("taxkit/DocsSearchTerm"));
export type DocsSearchTerm = typeof DocsSearchTerm.Type;
export const DocsSearchExcerpt = Schema.String.check(
  Schema.isMaxLength(240)
).pipe(Schema.brand("taxkit/DocsSearchExcerpt"));
export type DocsSearchExcerpt = typeof DocsSearchExcerpt.Type;
export const DocsSearchResult = Schema.Struct({
  description: DocsNonEmptyText,
  excerpt: DocsSearchExcerpt,
  path: DocsPagePath,
  title: DocsNonEmptyText,
});
export type DocsSearchResult = typeof DocsSearchResult.Type;
// The share image for one published page: its title, description and address.
// Effect's cache compares these immutable checked keys structurally.
export const DocsOgImage = Schema.Struct({
  description: DocsNonEmptyText,
  path: DocsPublicPagePath,
  title: DocsNonEmptyText,
});
export type DocsOgImage = typeof DocsOgImage.Type;
export const docsOgImageSize = { height: 630, width: 1200 } as const;
// A rendered share image: the PNG signature, the owned dimensions and a byte
// bound. Browsers and crawlers decode the pixels themselves.
export const DocsPngBytes = Schema.Uint8Array.check(
  Schema.makeFilter(
    (bytes) => {
      if (bytes.byteLength < 24 || bytes.byteLength > 500_000) {
        return false;
      }
      const data = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength
      );
      return (
        data.getBigUint64(0) === 0x89_50_4e_47_0d_0a_1a_0an &&
        data.getUint32(16) === docsOgImageSize.width &&
        data.getUint32(20) === docsOgImageSize.height
      );
    },
    {
      message:
        "A share image must be a PNG of the owned dimensions and byte bound.",
    }
  )
).pipe(Schema.brand("taxkit/DocsPngBytes"));
export type DocsPngBytes = typeof DocsPngBytes.Type;
// Every published page's share image, keyed by page address. The API build
// renders them; its JSON form carries each PNG as base64.
export const DocsImageArchive = Schema.Record(DocsPublicPagePath, DocsPngBytes);
export type DocsImageArchive = typeof DocsImageArchive.Type;
// One page's public addresses and head metadata on the publication origin.
// The JSON-LD leaves as checked script text, ready for its HTML output.
export const DocsPageMetadata = Schema.Struct({
  canonical: Schema.String,
  description: DocsNonEmptyText,
  image: Schema.String,
  imageAlt: DocsNonEmptyText,
  jsonLd: Schema.String,
  markdown: Schema.String,
  title: DocsNonEmptyText,
});
export type DocsPageMetadata = typeof DocsPageMetadata.Type;
