import { Effect, Schema } from "effect";

import { DocsMetadataError } from "./errors.js";
import { docsRepositoryProfile } from "./repository.ingress.js";
import { DocsPageFrontmatter, DocsPublicPagePath } from "./schemas.js";
import type {
  DocsOgImage,
  DocsPageMetadata,
  DocsPublicationOrigin,
  DocsPublicPage,
} from "./schemas.js";
// A published page's Website addresses: its Markdown file and its share image.
// The page itself is served at its own path. Each family claims every address
// of its shape; its parser accepts only a published page path and returns it.
export const DocsMarkdownFamilyPath = Schema.TemplateLiteral([
  Schema.String,
  ".md",
]);
export const DocsMarkdownPath = Schema.TemplateLiteralParser([
  DocsPublicPagePath,
  ".md",
]);
export const docsMarkdownPath = (
  path: DocsPublicPagePath
): typeof DocsMarkdownPath.Encoded => `${path}.md`;
export const DocsImageFamilyPath = Schema.TemplateLiteral([
  "/og/",
  Schema.String,
  ".png",
]);
export const DocsImagePath = Schema.TemplateLiteralParser([
  "/og",
  DocsPublicPagePath,
  ".png",
]);
export const docsImagePath = (
  path: DocsPublicPagePath
): typeof DocsImagePath.Encoded => `/og${path}.png`;
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
    const { repositoryUrl } = yield* docsRepositoryProfile;
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
      // The authored source on the repository's main branch.
      edit: new URL(
        `${repositoryUrl.pathname}/edit/main/content/docs/${page.source}`,
        repositoryUrl
      ).href,
      title: page.frontmatter.title,
    } satisfies DocsPageMetadata;
  },
  Effect.mapError(() => new DocsMetadataError({ reason: "invalid-metadata" }))
);
