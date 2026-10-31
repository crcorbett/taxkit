import { Effect, Schema } from "effect";

import { DocsMetadataError } from "./errors.js";
import { DocsPageFrontmatter } from "./schemas.js";
import type {
  DocsOgImage,
  DocsPageMetadata,
  DocsPublicationOrigin,
  DocsPublicPage,
  DocsPublicPagePath,
} from "./schemas.js";
// A published page's Website addresses: its Markdown file and its share image.
// The page itself is served at its own path.
export const docsMarkdownPath = (path: DocsPublicPagePath) =>
  `${path}.md` as const;
export const docsImagePath = (path: DocsPublicPagePath) =>
  `/og${path}.png` as const;
// The share image draws only the page's checked title, description and address.
export const docsOgImage = (page: DocsPublicPage): DocsOgImage => ({
  description: page.frontmatter.description,
  path: page.path,
  title: page.frontmatter.title,
});
const TechArticle = Schema.Struct({
  "@context": Schema.Literal("https://schema.org"),
  "@type": Schema.Literal("TechArticle"),
  description: DocsPageFrontmatter.fields.description,
  headline: DocsPageFrontmatter.fields.title,
  image: Schema.URLFromString,
  inLanguage: Schema.Literal("en-AU"),
  url: Schema.URLFromString,
});
// Head metadata for one published page on the publication origin. It invents
// no author, publisher or modification date.
export const docsPageMetadata = Effect.fn("Content.docsPageMetadata")(
  function* ({
    page,
    origin,
  }: {
    readonly page: DocsPublicPage;
    readonly origin: DocsPublicationOrigin;
  }) {
    const canonical = new URL(page.path, origin);
    const image = new URL(docsImagePath(page.path), origin);
    const article = yield* Schema.encodeEffect(
      Schema.fromJsonString(TechArticle)
    )({
      "@context": "https://schema.org",
      "@type": "TechArticle",
      description: page.frontmatter.description,
      headline: page.frontmatter.title,
      image,
      inLanguage: "en-AU",
      url: canonical,
    });
    return {
      canonical: canonical.href,
      description: page.frontmatter.description,
      image: image.href,
      imageAlt: `TaxKit documentation: ${page.frontmatter.title}`,
      jsonLd: article
        .replaceAll("<", "\\u003c")
        .replaceAll("\u2028", "\\u2028")
        .replaceAll("\u2029", "\\u2029"),
      markdown: new URL(docsMarkdownPath(page.path), origin).href,
      title: page.frontmatter.title,
    } satisfies DocsPageMetadata;
  },
  Effect.mapError(() => new DocsMetadataError({ reason: "invalid-metadata" }))
);
