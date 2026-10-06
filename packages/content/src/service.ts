import { Context } from "effect";
import type { Effect } from "effect";

import type { DocsPageNotFoundError, DocsSourceError } from "./errors.js";
import type {
  DocsDiscoveryDocument,
  DocsDiscoveryPath,
  DocsPagePath,
  DocsPublicCatalogue,
  DocsPublicNavigation,
  DocsPublicPage,
  DocsSearchResult,
  DocsSearchTerm,
} from "./schemas.js";

export class ContentCatalogue extends Context.Service<
  ContentCatalogue,
  DocsPublicCatalogue
>()("@taxkit/content/ContentCatalogue") {}

export interface ContentServiceContract {
  readonly getNavigation: () => Effect.Effect<DocsPublicNavigation>;
  readonly getPage: (
    path: DocsPagePath
  ) => Effect.Effect<DocsPublicPage, DocsPageNotFoundError>;
  readonly listPages: () => Effect.Effect<readonly DocsPublicPage[]>;
  readonly searchPages: (
    term: DocsSearchTerm
  ) => Effect.Effect<readonly DocsSearchResult[], DocsSourceError>;
}

export class ContentService extends Context.Service<
  ContentService,
  ContentServiceContract
>()("@taxkit/content/ContentService") {}

export class ContentDiscovery extends Context.Service<
  ContentDiscovery,
  {
    readonly getDocument: (
      path: DocsDiscoveryPath
    ) => Effect.Effect<DocsDiscoveryDocument, DocsSourceError>;
  }
>()("@taxkit/content/ContentDiscovery") {}
