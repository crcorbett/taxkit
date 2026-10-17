import { docsPaths, discoveryPaths } from "@taxkit/api-http/routes";
import { DocsSourceError } from "@taxkit/content/errors";
import { ContentCatalogue } from "@taxkit/content/service";
import { Array, Effect, Layer, Match } from "effect";

import { DocsDiscoveryBody, DocsDiscoveryDocument } from "./schemas.js";
import type { DocsDiscoveryPath } from "./schemas.js";
import { ContentDiscovery, ContentDiscoverySettings } from "./service.js";

// Settings are read on first use; a settings failure fails that request only.
export const ContentDiscoveryLive = Layer.effect(
  ContentDiscovery,
  Effect.gen(function* () {
    const catalogue = yield* ContentCatalogue;
    const configured = yield* Effect.cached(yield* ContentDiscoverySettings);
    return ContentDiscovery.of({
      getDocument: Effect.fn("ContentDiscovery.getDocument")(function* (
        path: DocsDiscoveryPath
      ) {
        const config = yield* configured;
        const body = Match.value(path).pipe(
          Match.when(
            discoveryPaths.sitemap,
            () =>
              `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.map(
                catalogue.pages,
                (page) => {
                  const address = new URL(
                    page.path,
                    config.publicationOrigin
                  ).href
                    .replaceAll("&", "&amp;")
                    .replaceAll("'", "&apos;")
                    .replaceAll('"', "&quot;")
                    .replaceAll(">", "&gt;")
                    .replaceAll("<", "&lt;");
                  return `  <url><loc>${address}</loc></url>`;
                }
              ).join("\n")}\n</urlset>\n`
          ),
          Match.when(
            discoveryPaths.robots,
            () =>
              "User-agent: *\nAllow: /\n" +
              `Sitemap: ${new URL(discoveryPaths.sitemap, config.publicationOrigin).href}\n`
          ),
          Match.when(
            discoveryPaths.llms,
            () =>
              `# TaxKit\n\n> Open-source Australian tax calculators, APIs and integration documentation.\n\nThese links contain accepted public documentation, not personal calculation reports.\nRelative page links in the Markdown use ${config.publicationOrigin.origin}.\n\n## Documentation\n\n${Array.map(
                catalogue.pages,
                (page) => {
                  const label = page.frontmatter.title
                    .replaceAll(/\s+/gu, " ")
                    .replaceAll(/(?<delimiter>[\\[\]])/gu, "\\$<delimiter>");
                  const address = new URL(
                    `${docsPaths.markdown}?${new URLSearchParams({ path: page.path }).toString()}`,
                    config.apiOrigin
                  ).href;
                  return `- [${label}](${address}): ${page.frontmatter.description.replaceAll(/\s+/gu, " ")}`;
                }
              ).join("\n")}\n`
          ),
          Match.when(
            discoveryPaths.llmsFull,
            () =>
              `# TaxKit documentation\n\nAccepted public documentation only; no personal calculation reports.\nRelative page links use ${config.publicationOrigin.origin}.\n\n${Array.map(
                catalogue.pages,
                (page) =>
                  `Canonical page: ${new URL(page.path, config.publicationOrigin).href}\n\n${page.markdown}`
              ).join("\n\n---\n\n")}\n`
          ),
          Match.exhaustive
        );
        return yield* DocsDiscoveryBody.makeEffect(body).pipe(
          Effect.flatMap((checked) =>
            DocsDiscoveryDocument.makeEffect({
              body: checked,
              contentType:
                path === discoveryPaths.sitemap
                  ? "application/xml"
                  : "text/plain",
              path,
            })
          ),
          Effect.mapError(
            () =>
              new DocsSourceError({
                message:
                  "The documentation discovery document could not be prepared.",
                operation: "getDiscoveryDocument",
              })
          )
        );
      }),
    });
  })
);
