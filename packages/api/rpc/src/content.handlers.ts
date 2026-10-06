import { ContentService } from "@taxkit/content/service";
import { Effect } from "effect";

import {
  DocsPageUnavailable,
  DocsSearchUnavailable,
  DocsRpcVersionMismatch,
} from "./content.errors.js";
import { DocsRpcGroup } from "./content.group.js";
import { DocsRpcVersion } from "./content.schemas.js";

export const DocsRpcHandlersLive = DocsRpcGroup.toLayer(
  Effect.gen(function* () {
    const content = yield* ContentService;
    return DocsRpcGroup.of({
      GetDocsMarkdown: ({ path, version }) =>
        version === DocsRpcVersion
          ? content.getPage(path).pipe(
              Effect.map((page) => page.markdown),
              Effect.mapError(
                () =>
                  new DocsPageUnavailable({
                    message: "The documentation page was not found.",
                  })
              )
            )
          : Effect.fail(new DocsRpcVersionMismatch()),
      GetDocsNavigation: ({ version }) =>
        version === DocsRpcVersion
          ? content.getNavigation()
          : Effect.fail(new DocsRpcVersionMismatch()),
      GetDocsPage: ({ path, version }) =>
        version === DocsRpcVersion
          ? content.getPage(path).pipe(
              Effect.mapError(
                () =>
                  new DocsPageUnavailable({
                    message: "The documentation page was not found.",
                  })
              )
            )
          : Effect.fail(new DocsRpcVersionMismatch()),
      SearchDocsPages: ({ term, version }) =>
        version === DocsRpcVersion
          ? content.searchPages(term).pipe(
              Effect.mapError(
                () =>
                  new DocsSearchUnavailable({
                    message: "Documentation search is temporarily unavailable.",
                  })
              )
            )
          : Effect.fail(new DocsRpcVersionMismatch()),
    });
  })
);
