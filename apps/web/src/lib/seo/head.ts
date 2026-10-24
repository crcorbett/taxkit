import { docsOgImageSize } from "@taxkit/content/schemas";
import type { DocsPageMetadata } from "@taxkit/content/schemas";

// One documentation page's head: its title, social card, canonical and
// Markdown addresses and structured data, all from checked Content metadata.
export const docsHead = (metadata: DocsPageMetadata) => ({
  links: [
    { href: metadata.canonical, rel: "canonical" },
    { href: metadata.markdown, rel: "alternate", type: "text/markdown" },
  ],
  meta: [
    { title: `${metadata.title} | TaxKit` },
    { content: metadata.description, name: "description" },
    { content: "article", property: "og:type" },
    { content: "en_AU", property: "og:locale" },
    { content: "TaxKit", property: "og:site_name" },
    { content: metadata.title, property: "og:title" },
    { content: metadata.description, property: "og:description" },
    { content: metadata.canonical, property: "og:url" },
    { content: metadata.image, property: "og:image" },
    { content: "image/png", property: "og:image:type" },
    { content: String(docsOgImageSize.width), property: "og:image:width" },
    { content: String(docsOgImageSize.height), property: "og:image:height" },
    { content: metadata.imageAlt, property: "og:image:alt" },
    { content: "summary_large_image", name: "twitter:card" },
    { content: metadata.title, name: "twitter:title" },
    { content: metadata.description, name: "twitter:description" },
    { content: metadata.image, name: "twitter:image" },
    { content: metadata.imageAlt, name: "twitter:image:alt" },
  ],
  scripts: [{ children: metadata.jsonLd, type: "application/ld+json" }],
});
