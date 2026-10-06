import type {
  DocsPagePath,
  DocsPublicNavigation,
  DocsPublicPage,
  DocsSearchResult,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import { Context } from "effect";
import type { Effect } from "effect";

import type { DocsRpcClientError } from "./content.errors.js";

export class DocsRpcClient extends Context.Service<
  DocsRpcClient,
  {
    readonly getNavigation: () => Effect.Effect<
      DocsPublicNavigation,
      DocsRpcClientError
    >;
    readonly getPage: (
      path: DocsPagePath
    ) => Effect.Effect<DocsPublicPage, DocsRpcClientError>;
    readonly getMarkdown: (
      path: DocsPagePath
    ) => Effect.Effect<string, DocsRpcClientError>;
    readonly searchPages: (
      term: DocsSearchTerm
    ) => Effect.Effect<readonly DocsSearchResult[], DocsRpcClientError>;
  }
>()("@taxkit/api-rpc/DocsRpcClient") {}
