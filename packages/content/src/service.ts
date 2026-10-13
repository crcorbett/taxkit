import { Context } from "effect";
import type { Effect } from "effect";

import type { DocsPageNotFoundError, DocsSourceError } from "./errors.js";
import type {
  DocsDiscoveryDocument,
  DocsDiscoveryPath,
  DocsDiscoverySettings,
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

// Settings are a checked lazy Effect owned by application composition. Native
// stage addresses are resolved on incoming use, never invented at source build.
export class ContentDiscoverySettings extends Context.Service<
  ContentDiscoverySettings,
  Effect.Effect<DocsDiscoverySettings, DocsSourceError>
>()("@taxkit/content/ContentDiscoverySettings") {}
