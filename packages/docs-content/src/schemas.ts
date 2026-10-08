import { DocsNonEmptyText } from "@taxkit/content/schemas";
import { Schema } from "effect";

export {
  DocsNonEmptyText,
  DocsPagePath,
  DocsPageSlug,
  DocsSourcePath,
  DocsContentStatus,
  DocsPageFrontmatter,
  DocsPageType,
  DocsPrimaryReader,
  DocsNavigationLeaf,
  DocsNavigationItem,
  DocsNavigation,
  DocsContentPage,
} from "@taxkit/content/schemas";

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

export const DocsMdxComponentName = DocsNonEmptyText.pipe(
  Schema.check(
    Schema.isPattern(/^[A-Z][A-Za-z0-9]*(?:\.[A-Z][A-Za-z0-9]*)*$/u)
  ),
  Schema.brand("taxkit/DocsMdxComponentName")
);
export type DocsMdxComponentName = typeof DocsMdxComponentName.Type;

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
