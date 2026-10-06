import { Array, HashSet, Schema } from "effect";

export const DocsNonEmptyText = Schema.Trimmed.check(Schema.isMinLength(1));
export type DocsNonEmptyText = typeof DocsNonEmptyText.Type;

export const DocsPagePath = DocsNonEmptyText.pipe(
  Schema.brand("taxkit/DocsPagePath")
);
export type DocsPagePath = typeof DocsPagePath.Type;

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
  contentRoot: Schema.Literal("packages/docs-content/content"),
  primaryNavigation: Schema.Array(DocsNavigationItem),
  status: DocsContentStatus,
});
export type DocsNavigation = typeof DocsNavigation.Type;

export const DocsContentPage = Schema.Struct({
  frontmatter: DocsPageFrontmatter,
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
}).check(
  Schema.makeFilter(
    (page) => {
      const path = page.slugs.join("/");
      return (
        /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/u.test(page.path) &&
        page.path === `/${path}` &&
        (page.source === `content/${path}.mdx` ||
          page.source === `content/${path}/index.mdx`)
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
      const navigation = Array.flatMap(
        catalogue.navigation.primaryNavigation,
        (item) => [item, ...item.pages]
      );
      return (
        HashSet.size(
          HashSet.fromIterable(Array.map(catalogue.pages, (page) => page.path))
        ) === catalogue.pages.length &&
        HashSet.size(
          HashSet.fromIterable(
            Array.map(catalogue.pages, (page) => page.source)
          )
        ) === catalogue.pages.length &&
        HashSet.size(
          HashSet.fromIterable(Array.map(navigation, (item) => item.path))
        ) === navigation.length &&
        navigation.length === catalogue.pages.length &&
        Array.every(navigation, (item) =>
          Array.some(
            catalogue.pages,
            (page) =>
              page.path === item.path &&
              page.source === item.source &&
              page.frontmatter.title === item.title
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
