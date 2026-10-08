import type { DocsPublicPage } from "@taxkit/content/schemas";
import { Result, Schema } from "effect";

import type { WebsitePublicSettings } from "../schemas";
import {
  docsImagePath,
  WebsiteDocsArticleJson,
  WebsiteDocsImageSize,
} from "./social.schemas";

// This is the named HTML metadata/script egress. Only checked public page and
// stage settings enter it; it invents no author, publisher or modification date.
export const docsMetadata = (
  page: DocsPublicPage,
  settings: WebsitePublicSettings
) => {
  const canonical = new URL(page.path, settings.websiteOrigin);
  const image = new URL(docsImagePath(page), settings.websiteOrigin);
  return Schema.encodeResult(WebsiteDocsArticleJson)({
    "@context": "https://schema.org",
    "@type": "TechArticle",
    description: page.frontmatter.description,
    headline: page.frontmatter.title,
    image,
    url: canonical,
  }).pipe(
    Result.map((article) => ({
      links: [
        { href: canonical.href, rel: "canonical" },
        {
          href: new URL(`${page.path}.md`, settings.websiteOrigin).href,
          rel: "alternate",
          type: "text/markdown",
        },
      ],
      meta: [
        { title: `${page.frontmatter.title} | TaxKit` },
        { content: page.frontmatter.description, name: "description" },
        { content: page.frontmatter.title, property: "og:title" },
        { content: page.frontmatter.description, property: "og:description" },
        { content: "article", property: "og:type" },
        { content: canonical.href, property: "og:url" },
        { content: "TaxKit", property: "og:site_name" },
        { content: image.href, property: "og:image" },
        { content: "image/png", property: "og:image:type" },
        {
          content: String(WebsiteDocsImageSize.width),
          property: "og:image:width",
        },
        {
          content: String(WebsiteDocsImageSize.height),
          property: "og:image:height",
        },
        {
          content: `TaxKit documentation: ${page.frontmatter.title}`,
          property: "og:image:alt",
        },
        { content: "summary_large_image", name: "twitter:card" },
        { content: page.frontmatter.title, name: "twitter:title" },
        { content: page.frontmatter.description, name: "twitter:description" },
        { content: image.href, name: "twitter:image" },
        {
          content: `TaxKit documentation: ${page.frontmatter.title}`,
          name: "twitter:image:alt",
        },
      ],
      scripts: [
        {
          children: article
            .replaceAll("<", "\\u003c")
            .replaceAll("\u2028", "\\u2028")
            .replaceAll("\u2029", "\\u2029"),
          type: "application/ld+json",
        },
      ],
    }))
  );
};
