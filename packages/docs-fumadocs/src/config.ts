import type { ShikiTransformer } from "@shikijs/core";
import {
  transformerMetaHighlight,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Option, Schema } from "effect";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import type {
  DefaultMDXOptions,
  DocsCollection,
  GlobalConfig,
} from "fumadocs-mdx/config";
import remarkMermaid from "remark-mermaidjs";

import { applyCodeBlockMeta } from "./code-block-meta.ts";

export const effectSchemaToStandardSchema = <
  const SourceSchema extends Schema.Decoder<unknown, never>,
>(
  schema: SourceSchema
) => Schema.toStandardSchemaV1(schema);

export const transformerCodeBlockMeta = (): ShikiTransformer => ({
  name: "taxkit:docs-code-block-meta",
  pre(node) {
    return applyCodeBlockMeta(node, this.options);
  },
});

export const sharedMdxOptions = (): DefaultMDXOptions & {
  readonly remarkPlugins: Exclude<
    DefaultMDXOptions["remarkPlugins"],
    readonly unknown[] | undefined
  >;
} => ({
  rehypeCodeOptions: {
    defaultColor: false,
    themes: { dark: "github-dark", light: "github-light" },
    transformers: [
      transformerMetaHighlight(),
      transformerNotationHighlight(),
      transformerCodeBlockMeta(),
    ],
  },
  remarkPlugins: (existing) => [
    ...existing,
    [remarkMermaid, { mermaidConfig: { theme: "neutral" } }],
  ],
});

export const defineFumadocsConfig = (
  config: Omit<GlobalConfig, "mdxOptions"> & {
    readonly mdxOptions?: DefaultMDXOptions | undefined;
  } = {}
): GlobalConfig =>
  defineConfig({
    ...config,
    mdxOptions: Option.fromUndefinedOr(config.mdxOptions).pipe(
      Option.getOrElse(sharedMdxOptions)
    ),
  });

export const defineFumadocsDocsWithMeta = <
  const FrontmatterSchema extends StandardSchemaV1,
  const MetaSchema extends StandardSchemaV1,
>({
  dir,
  frontmatterSchema,
  metaSchema,
}: {
  readonly dir: string;
  readonly frontmatterSchema: FrontmatterSchema;
  readonly metaSchema: MetaSchema;
}): DocsCollection<FrontmatterSchema, MetaSchema> =>
  defineDocs<FrontmatterSchema, MetaSchema>({
    dir,
    docs: {
      async: true,
      schema: frontmatterSchema,
    },
    meta: {
      schema: metaSchema,
    },
  });
