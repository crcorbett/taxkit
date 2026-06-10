import { Schema } from "effect";

export const DocsNonEmptyText = Schema.Trimmed.check(Schema.isMinLength(1));
export type DocsNonEmptyText = typeof DocsNonEmptyText.Type;

export const DocsPagePath = DocsNonEmptyText.pipe(
  Schema.brand("whattax/DocsPagePath")
);
export type DocsPagePath = typeof DocsPagePath.Type;

export const DocsPageSlug = DocsNonEmptyText.pipe(
  Schema.brand("whattax/DocsPageSlug")
);
export type DocsPageSlug = typeof DocsPageSlug.Type;

export const DocsSourcePath = DocsNonEmptyText.pipe(
  Schema.brand("whattax/DocsSourcePath")
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
  contentRoot: Schema.Literal("apps/docs/content"),
  primaryNavigation: Schema.Array(DocsNavigationItem),
  status: DocsContentStatus,
});
export type DocsNavigation = typeof DocsNavigation.Type;

export const DocsMeta = Schema.Struct({
  collapsible: Schema.optional(Schema.Boolean),
  defaultOpen: Schema.optional(Schema.Boolean),
  description: Schema.optional(DocsNonEmptyText),
  icon: Schema.optional(Schema.String),
  pages: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
  root: Schema.optional(Schema.Boolean),
  title: Schema.optional(DocsNonEmptyText),
});
export type DocsMeta = typeof DocsMeta.Type;

export const DocsContentPage = Schema.Struct({
  frontmatter: DocsPageFrontmatter,
  markdown: Schema.String,
  path: DocsPagePath,
  source: DocsSourcePath,
});
export type DocsContentPage = typeof DocsContentPage.Type;

export class DocsValidationIssue extends Schema.TaggedClass<DocsValidationIssue>()(
  "DocsValidationIssue",
  {
    message: DocsNonEmptyText,
    path: Schema.Array(Schema.String),
  }
) {}

export const DocsValidationResult = Schema.Struct({
  issues: Schema.Array(DocsValidationIssue),
});
export type DocsValidationResult = typeof DocsValidationResult.Type;
