import { Array, Effect, Layer, Match, pipe } from "effect";

import { DocsPageNotFoundError, DocsSourceError } from "./errors.js";
import {
  DocsDiscoveryBody,
  DocsDiscoveryDocument,
  DocsSearchExcerpt,
} from "./schemas.js";
import type {
  DocsDiscoveryPath,
  DocsDiscoverySettings,
  DocsPagePath,
  DocsSearchResult,
  DocsSearchTerm,
} from "./schemas.js";
import {
  ContentCatalogue,
  ContentDiscovery,
  ContentService,
} from "./service.js";

export const ContentServiceLive = Layer.effect(
  ContentService,
  Effect.gen(function* () {
    const catalogue = yield* ContentCatalogue;
    return ContentService.of({
      getNavigation: Effect.fn("ContentService.getNavigation")(() =>
        Effect.succeed(catalogue.navigation)
      ),
      getPage: Effect.fn("ContentService.getPage")((path: DocsPagePath) =>
        Array.findFirst(catalogue.pages, (page) => page.path === path).pipe(
          Effect.fromOption,
          Effect.mapError(() => new DocsPageNotFoundError({ path }))
        )
      ),
      listPages: Effect.fn("ContentService.listPages")(() =>
        Effect.succeed(catalogue.pages)
      ),
      searchPages: Effect.fn("ContentService.searchPages")(
        (term: DocsSearchTerm) =>
          Effect.forEach(
            pipe(
              catalogue.pages,
              Array.filter((page) =>
                `${page.frontmatter.title}\n${page.frontmatter.description}\n${page.markdown}`
                  .toLowerCase()
                  .includes(term.toLowerCase())
              ),
              Array.take(20)
            ),
            (page) =>
              DocsSearchExcerpt.makeEffect(
                page.markdown.replaceAll(/\s+/gu, " ").trim().slice(0, 240)
              ).pipe(
                Effect.map(
                  (excerpt) =>
                    ({
                      description: page.frontmatter.description,
                      excerpt,
                      path: page.path,
                      title: page.frontmatter.title,
                    }) satisfies DocsSearchResult
                )
              )
          ).pipe(
            Effect.mapError(
              () =>
                new DocsSourceError({
                  message: "The docs search result could not be prepared.",
                  operation: "searchPages",
                })
            )
          )
      ),
    });
  })
);

// Settings are a checked lazy Effect owned by application composition. Native
// stage addresses are resolved on incoming use, never invented at source build.
export const ContentDiscoveryLive = (
  settings: Effect.Effect<DocsDiscoverySettings, DocsSourceError>
) =>
  Layer.effect(
    ContentDiscovery,
    Effect.gen(function* () {
      const catalogue = yield* ContentCatalogue;
      const configured = yield* Effect.cached(settings);
      return ContentDiscovery.of({
        getDocument: Effect.fn("ContentDiscovery.getDocument")(function* (
          path: DocsDiscoveryPath
        ) {
          const config = yield* configured;
          const body = Match.value(path).pipe(
            Match.when(
              "/sitemap.xml",
              () =>
                `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.map(
                  catalogue.pages,
                  (page) => {
                    const address = new URL(
                      page.path,
                      config.websiteOrigin
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
              "/robots.txt",
              () =>
                "User-agent: *\nAllow: /\nDisallow: /_serverFn/\n" +
                `Sitemap: ${new URL("/sitemap.xml", config.websiteOrigin).href}\n`
            ),
            Match.when(
              "/llms.txt",
              () =>
                `# TaxKit\n\n> Open-source Australian tax calculators, APIs and integration documentation.\n\nThese links contain accepted public documentation, not personal calculation reports.\nRelative page links in the Markdown use ${config.websiteOrigin.origin}.\n\n## Documentation\n\n${Array.map(
                  catalogue.pages,
                  (page) => {
                    const label = page.frontmatter.title
                      .replaceAll(/\s+/gu, " ")
                      .replaceAll(/(?<delimiter>[\\[\]])/gu, "\\$<delimiter>");
                    const address = new URL(
                      `/api/v1/docs/markdown?${new URLSearchParams({ path: page.path }).toString()}`,
                      config.apiOrigin
                    ).href;
                    return `- [${label}](${address}): ${page.frontmatter.description.replaceAll(/\s+/gu, " ")}`;
                  }
                ).join("\n")}\n`
            ),
            Match.when(
              "/llms-full.txt",
              () =>
                `# TaxKit documentation\n\nAccepted public documentation only; no personal calculation reports.\nRelative page links use ${config.websiteOrigin.origin}.\n\n${Array.map(
                  catalogue.pages,
                  (page) =>
                    `Canonical page: ${new URL(page.path, config.websiteOrigin).href}\n\n${page.markdown}`
                ).join("\n\n---\n\n")}\n`
            ),
            Match.exhaustive
          );
          return yield* DocsDiscoveryBody.makeEffect(body).pipe(
            Effect.flatMap((checked) =>
              DocsDiscoveryDocument.makeEffect({
                body: checked,
                contentType:
                  path === "/sitemap.xml" ? "application/xml" : "text/plain",
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
