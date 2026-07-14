import { Schema } from "effect";

export const FumadocsNonEmptyText = Schema.Trimmed.check(Schema.isMinLength(1));
export type FumadocsNonEmptyText = typeof FumadocsNonEmptyText.Type;

export const FumadocsCodeBlockMeta = Schema.Struct({
  title: Schema.optional(FumadocsNonEmptyText),
});
export type FumadocsCodeBlockMeta = typeof FumadocsCodeBlockMeta.Type;

export const FumadocsMeta = Schema.Struct({
  collapsible: Schema.optional(Schema.Boolean),
  defaultOpen: Schema.optional(Schema.Boolean),
  description: Schema.optional(FumadocsNonEmptyText),
  icon: Schema.optional(Schema.String),
  pages: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
  root: Schema.optional(Schema.Boolean),
  title: Schema.optional(FumadocsNonEmptyText),
});
export type FumadocsMeta = typeof FumadocsMeta.Type;

export interface FumadocsPageTreePage {
  readonly type: "page";
  readonly name: FumadocsNonEmptyText;
  readonly url: FumadocsNonEmptyText;
  readonly description?: FumadocsNonEmptyText | undefined;
  readonly external?: boolean | undefined;
  readonly icon?: string | undefined;
}

export interface FumadocsPageTreeSeparator {
  readonly type: "separator";
  readonly name?: FumadocsNonEmptyText | undefined;
  readonly icon?: string | undefined;
}

export interface FumadocsPageTreeFolder {
  readonly type: "folder";
  readonly name: FumadocsNonEmptyText;
  readonly children: readonly FumadocsPageTreeNode[];
  readonly collapsible?: boolean | undefined;
  readonly defaultOpen?: boolean | undefined;
  readonly description?: FumadocsNonEmptyText | undefined;
  readonly icon?: string | undefined;
  readonly root?: boolean | undefined;
}

export interface FumadocsPageTreeFolderLink {
  readonly type: "folder-link";
  readonly name: FumadocsNonEmptyText;
  readonly url: FumadocsNonEmptyText;
  readonly children: readonly FumadocsPageTreeNode[];
  readonly collapsible?: boolean | undefined;
  readonly defaultOpen?: boolean | undefined;
  readonly description?: FumadocsNonEmptyText | undefined;
  readonly external?: boolean | undefined;
  readonly icon?: string | undefined;
  readonly root?: boolean | undefined;
}

export type FumadocsPageTreeNode =
  | FumadocsPageTreeFolder
  | FumadocsPageTreeFolderLink
  | FumadocsPageTreePage
  | FumadocsPageTreeSeparator;

export const FumadocsPageTreeNode: Schema.Codec<
  FumadocsPageTreeNode,
  FumadocsPageTreeNode
> = Schema.Union([
  Schema.Struct({
    description: Schema.optional(FumadocsNonEmptyText),
    external: Schema.optional(Schema.Boolean),
    icon: Schema.optional(Schema.String),
    name: FumadocsNonEmptyText,
    type: Schema.Literal("page"),
    url: FumadocsNonEmptyText,
  }),
  Schema.Struct({
    icon: Schema.optional(Schema.String),
    name: Schema.optional(FumadocsNonEmptyText),
    type: Schema.Literal("separator"),
  }),
  Schema.Struct({
    children: Schema.Array(
      Schema.suspend(
        (): Schema.Codec<FumadocsPageTreeNode, FumadocsPageTreeNode> =>
          FumadocsPageTreeNode
      )
    ),
    collapsible: Schema.optional(Schema.Boolean),
    defaultOpen: Schema.optional(Schema.Boolean),
    description: Schema.optional(FumadocsNonEmptyText),
    icon: Schema.optional(Schema.String),
    name: FumadocsNonEmptyText,
    root: Schema.optional(Schema.Boolean),
    type: Schema.Literal("folder"),
  }),
  Schema.Struct({
    children: Schema.Array(
      Schema.suspend(
        (): Schema.Codec<FumadocsPageTreeNode, FumadocsPageTreeNode> =>
          FumadocsPageTreeNode
      )
    ),
    collapsible: Schema.optional(Schema.Boolean),
    defaultOpen: Schema.optional(Schema.Boolean),
    description: Schema.optional(FumadocsNonEmptyText),
    external: Schema.optional(Schema.Boolean),
    icon: Schema.optional(Schema.String),
    name: FumadocsNonEmptyText,
    root: Schema.optional(Schema.Boolean),
    type: Schema.Literal("folder-link"),
    url: FumadocsNonEmptyText,
  }),
]);

export const FumadocsPageTreeRoot = Schema.Struct({
  children: Schema.Array(FumadocsPageTreeNode),
  description: Schema.optional(FumadocsNonEmptyText),
  name: FumadocsNonEmptyText,
});
export type FumadocsPageTreeRoot = typeof FumadocsPageTreeRoot.Type;

export class FumadocsPageNotFoundError extends Schema.TaggedErrorClass<FumadocsPageNotFoundError>()(
  "FumadocsPageNotFoundError",
  {
    language: Schema.optional(Schema.String),
    slugs: Schema.Array(Schema.String),
  }
) {}

export class FumadocsSourceLoaderError extends Schema.TaggedErrorClass<FumadocsSourceLoaderError>()(
  "FumadocsSourceLoaderError",
  {
    cause: Schema.Defect(),
  }
) {}
