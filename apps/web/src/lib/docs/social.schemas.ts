import { DocsPageFrontmatter } from "@taxkit/content/schemas";
import type { DocsPublicPage } from "@taxkit/content/schemas";
import { Schema } from "effect";

export const WebsiteDocsImageSize = { height: 630, width: 1200 } as const;

// One owned address mapping shared by generation and HTML metadata. Its page
// already passed the accepted catalogue's public-path/status refinements.
export const docsImagePath = (page: DocsPublicPage) => `/og${page.path}.png`;

const WebsiteDocsArticle = Schema.Struct({
  "@context": Schema.Literal("https://schema.org"),
  "@type": Schema.Literal("TechArticle"),
  description: DocsPageFrontmatter.fields.description,
  headline: DocsPageFrontmatter.fields.title,
  image: Schema.URLFromString,
  url: Schema.URLFromString,
});
export const WebsiteDocsArticleJson = Schema.fromJsonString(WebsiteDocsArticle);
