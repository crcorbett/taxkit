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

import { FumadocsCodeBlockMeta, FumadocsMeta } from "./schemas.js";

export const effectSchemaToStandardSchema = <
  const SourceSchema extends Schema.Decoder<unknown, never>,
>(
  schema: SourceSchema
) => Schema.toStandardSchemaV1(schema);

export const fumadocsMetaStandardSchema =
  effectSchemaToStandardSchema(FumadocsMeta);

export const transformerCodeBlockMeta = (): ShikiTransformer => ({
  name: "whattax:docs-code-block-meta",
  pre(node) {
    Schema.decodeUnknownOption(FumadocsCodeBlockMeta)(this.options.meta).pipe(
      Option.flatMap((meta) => Option.fromUndefinedOr(meta.title)),
      Option.map((title) => {
        node.properties["data-title"] = title;
        return title;
      })
    );

    Option.fromUndefinedOr(this.options.lang).pipe(
      Option.map((language) => {
        node.properties["data-language"] = language;
        return language;
      })
    );
  },
});

export const sharedMdxOptions = (): DefaultMDXOptions => ({
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

export const defineFumadocsDocs = <
  const FrontmatterSchema extends StandardSchemaV1,
>({
  dir,
  frontmatterSchema,
}: {
  readonly dir: string;
  readonly frontmatterSchema: FrontmatterSchema;
}): DocsCollection<FrontmatterSchema, typeof fumadocsMetaStandardSchema> =>
  defineDocs<FrontmatterSchema, typeof fumadocsMetaStandardSchema>({
    dir,
    docs: {
      async: true,
      schema: frontmatterSchema,
    },
    meta: {
      schema: fumadocsMetaStandardSchema,
    },
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
