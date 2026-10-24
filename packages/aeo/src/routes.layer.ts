import {
  discoveryApiPath,
  discoveryPaths,
  docsImageApiPath,
} from "@taxkit/api-http/routes";
import { ContentCatalogue, DocsOgImages } from "@taxkit/content/service";
import { Array, Effect, Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";

import { llmsFullTxt, llmsTxt, sitemapXml } from "./documents.egress.js";
import { robotsTxt } from "./robots.egress.js";
import { PublicationOrigins } from "./service.js";

const headers = { "x-content-type-options": "nosniff" };
const unavailable = () =>
  Effect.succeed(HttpServerResponse.empty({ status: 503 }));

// Every answer-engine route the API serves: the four discovery documents and
// each published page's share image. The inventory comes from the checked
// catalogue, never a second list of pages. The Website forwards its own
// /sitemap.xml, /robots.txt, /llms*.txt and /og/*.png requests here.
export const aeoRoutes = Layer.unwrap(
  Effect.gen(function* () {
    const { pages } = yield* ContentCatalogue;
    const images = yield* DocsOgImages;
    const origins = yield* Effect.cached(yield* PublicationOrigins);
    const document = (
      path: Parameters<typeof discoveryApiPath>[0],
      contentType: string,
      body: (settings: Effect.Success<typeof origins>) => string
    ) =>
      HttpRouter.route(
        "GET",
        discoveryApiPath(path),
        origins.pipe(
          Effect.map((settings) =>
            HttpServerResponse.text(body(settings), {
              contentType: `${contentType}; charset=utf-8`,
              headers,
            })
          ),
          Effect.catchTag("DocsSourceError", unavailable)
        )
      );
    return HttpRouter.addAll([
      document(discoveryPaths.robots, "text/plain", ({ publicationOrigin }) =>
        robotsTxt(publicationOrigin)
      ),
      document(
        discoveryPaths.sitemap,
        "application/xml",
        ({ publicationOrigin }) => sitemapXml({ pages, publicationOrigin })
      ),
      document(
        discoveryPaths.llms,
        "text/plain",
        ({ apiOrigin, publicationOrigin }) =>
          llmsTxt({ apiOrigin, pages, publicationOrigin })
      ),
      document(discoveryPaths.llmsFull, "text/plain", ({ publicationOrigin }) =>
        llmsFullTxt({ pages, publicationOrigin })
      ),
      ...Array.map(pages, (page) =>
        HttpRouter.route(
          "GET",
          docsImageApiPath(page.path),
          images.getImage(page.path).pipe(
            Effect.map((bytes) =>
              HttpServerResponse.uint8Array(bytes, {
                contentType: "image/png",
                headers,
              })
            ),
            Effect.catchTag("DocsImageRenderError", unavailable)
          )
        )
      ),
    ]);
  })
);
