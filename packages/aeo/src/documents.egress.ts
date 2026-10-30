import { docsPaths } from "@taxkit/api-http/routes";
import type {
  DocsPublicationOrigin,
  DocsPublicPage,
  PublicHttpOrigin,
} from "@taxkit/content/schemas";
import { Function as EffectFunction, Array } from "effect";
// Text documents for answer engines and crawlers. Each is a total function over
// checked catalogue pages and this stage's origins; routes only serve the result.
const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("'", "&apos;")
    .replaceAll('"', "&quot;")
    .replaceAll(">", "&gt;")
    .replaceAll("<", "&lt;");
/** One sitemap entry per published page, in catalogue order. */
export const sitemapXml = ({
  pages,
  publicationOrigin,
}: Readonly<{
  pages: readonly DocsPublicPage[];
  publicationOrigin: DocsPublicationOrigin;
}>): string =>
  EffectFunction.pipe(
    pages,
    Array.map(
      (page) =>
        `  <url><loc>${escapeXml(new URL(page.path, publicationOrigin).href)}</loc></url>`
    ),
    Array.join("\n"),
    (entries) =>
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
  );
const markdownLabel = (title: string) =>
  title
    .replaceAll(/\s+/gu, " ")
    .replaceAll(/(?<delimiter>[\\[\]])/gu, "\\$<delimiter>");
/** The short index: each page's processed Markdown on the public API. */
export const llmsTxt = ({
  apiOrigin,
  pages,
  publicationOrigin,
}: Readonly<{
  apiOrigin: typeof PublicHttpOrigin.Type;
  pages: readonly DocsPublicPage[];
  publicationOrigin: DocsPublicationOrigin;
}>): string =>
  EffectFunction.pipe(
    pages,
    Array.map(
      (page) =>
        `- [${markdownLabel(page.frontmatter.title)}](${new URL(`${docsPaths.markdown}?${new URLSearchParams({ path: page.path }).toString()}`, apiOrigin).href}): ${page.frontmatter.description.replaceAll(/\s+/gu, " ")}`
    ),
    Array.join("\n"),
    (entries) =>
      `# TaxKit\n\n> Open-source Australian tax calculators, APIs and integration documentation.\n\nThese links contain accepted public documentation, not personal calculation reports.\nRelative page links in the Markdown use ${publicationOrigin.origin}.\n\n## Documentation\n\n${entries}\n`
  );
/** The full text: every page's processed Markdown with its canonical address. */
export const llmsFullTxt = ({
  pages,
  publicationOrigin,
}: Readonly<{
  pages: readonly DocsPublicPage[];
  publicationOrigin: DocsPublicationOrigin;
}>): string =>
  EffectFunction.pipe(
    pages,
    Array.map(
      (page) =>
        `Canonical page: ${new URL(page.path, publicationOrigin).href}\n\n${page.markdown}`
    ),
    Array.join("\n\n---\n\n"),
    (bodies) =>
      `# TaxKit documentation\n\nAccepted public documentation only; no personal calculation reports.\nRelative page links use ${publicationOrigin.origin}.\n\n${bodies}\n`
  );
