import type { ShikiTransformer } from "@shikijs/core";
import {
  transformerMetaHighlight,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Option, Schema } from "effect";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import remarkMermaid from "remark-mermaidjs";

import { DocsMeta, DocsPageFrontmatter } from "./src/schemas";

const docsFrontmatterSchema = Schema.toStandardSchemaV1(
  DocsPageFrontmatter
) satisfies StandardSchemaV1;

const docsMetaSchema = Schema.toStandardSchemaV1(
  DocsMeta
) satisfies StandardSchemaV1;

const ShikiCodeBlockMeta = Schema.Struct({
  title: Schema.String,
});

const transformerCodeBlockMeta = (): ShikiTransformer => ({
  name: "whattax:docs-code-block-meta",
  pre(node) {
    Schema.decodeUnknownOption(ShikiCodeBlockMeta)(this.options.meta).pipe(
      Option.map((meta) => {
        node.properties["data-title"] = meta.title;
        return meta.title;
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

export const docs = defineDocs<
  typeof docsFrontmatterSchema,
  typeof docsMetaSchema
>({
  dir: "../../apps/docs/content",
  docs: {
    async: true,
    schema: docsFrontmatterSchema,
  },
  meta: {
    schema: docsMetaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
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
  },
});
