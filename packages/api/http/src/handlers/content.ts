import { ContentService } from "@taxkit/content/service";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { TaxKitApi } from "../api.js";
import {
  DocsPageUnavailable,
  DocsSearchUnavailable,
} from "../groups/content.js";

export const ContentApiHandlerLive = HttpApiBuilder.group(
  TaxKitApi,
  "content",
  (handlers) =>
    Effect.gen(function* () {
      const content = yield* ContentService;
      return handlers
        .handle("getNavigation", () => content.getNavigation())
        .handle("getPage", ({ query }) =>
          content.getPage(query.path).pipe(
            Effect.mapError(
              () =>
                new DocsPageUnavailable({
                  message: "The documentation page was not found.",
                })
            )
          )
        )
        .handle("searchPages", ({ query }) =>
          content.searchPages(query.term).pipe(
            Effect.mapError(
              () =>
                new DocsSearchUnavailable({
                  message: "Documentation search is temporarily unavailable.",
                })
            )
          )
        )
        .handle("getMarkdown", ({ query }) =>
          content.getPage(query.path).pipe(
            Effect.map((page) => page.markdown),
            Effect.mapError(
              () =>
                new DocsPageUnavailable({
                  message: "The documentation page was not found.",
                })
            )
          )
        );
    })
);
