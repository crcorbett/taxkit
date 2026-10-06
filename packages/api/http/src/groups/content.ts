import {
  DocsPagePath,
  DocsPublicNavigation,
  DocsPublicPage,
  DocsSearchResult,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { DocsPageUnavailable, DocsSearchUnavailable } from "../schemas.js";

export { DocsPageUnavailable, DocsSearchUnavailable } from "../schemas.js";

export const DocsPageQuery = Schema.Struct({
  path: DocsPagePath.check(
    Schema.isMaxLength(256),
    Schema.isPattern(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/u)
  ),
});

export const DocsSearchQuery = Schema.Struct({ term: DocsSearchTerm });

const PageError = DocsPageUnavailable.pipe(HttpApiSchema.status("NotFound"));
const SearchError = DocsSearchUnavailable.pipe(
  HttpApiSchema.status("ServiceUnavailable")
);

export class ContentApiGroup extends HttpApiGroup.make("content")
  .add(
    HttpApiEndpoint.get("getNavigation", "/navigation", {
      success: DocsPublicNavigation,
    }).annotate(
      OpenApi.Description,
      "Read navigation for accepted public documentation."
    )
  )
  .add(
    HttpApiEndpoint.get("getPage", "/page", {
      error: PageError,
      query: DocsPageQuery,
      success: DocsPublicPage,
    }).annotate(
      OpenApi.Description,
      "Read one accepted public documentation page."
    )
  )
  .add(
    HttpApiEndpoint.get("searchPages", "/search", {
      error: SearchError,
      query: DocsSearchQuery,
      success: Schema.Array(DocsSearchResult),
    }).annotate(
      OpenApi.Description,
      "Search accepted public documentation; at most 20 results with 240-character excerpts."
    )
  )
  .add(
    HttpApiEndpoint.get("getMarkdown", "/markdown", {
      error: PageError,
      query: DocsPageQuery,
      success: Schema.String.pipe(
        HttpApiSchema.asText({ contentType: "text/markdown" })
      ),
    }).annotate(
      OpenApi.Description,
      "Read processed public Markdown, with resolved links and without executable MDX. This route does not return personal calculation reports."
    )
  )
  .prefix("/api/v1/docs")
  .annotate(OpenApi.Title, "Public documentation") {}
