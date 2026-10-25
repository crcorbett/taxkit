import { Context } from "effect";
import type { Effect } from "effect";

import type {
  DocsCodeHighlightError,
  DocsDiagramRenderError,
  DocsImageRenderError,
  DocsPageNotFoundError,
  DocsSourceError,
} from "./errors.js";
import type { DocsLinkContext } from "./links.js";
import type {
  DocsCodeLines,
  DocsCodeSnippet,
  DocsDiagramSource,
  DocsDiagramSvg,
  DocsOgImage,
  DocsPagePath,
  DocsPngBytes,
  DocsPublicCatalogue,
  DocsPublicPagePath,
  DocsPublicNavigation,
  DocsPublicPage,
  DocsReadPage,
  DocsSearchResult,
  DocsSearchTerm,
  DocsSource,
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

// The authored MDX files, as the host bundles them. The API supplies the list;
// Content checks it against the navigation when it builds the catalogue.
export class DocsSources extends Context.Service<
  DocsSources,
  readonly DocsSource[]
>()("@taxkit/content/DocsSources") {}

// Contracts Content consumes. `@taxkit/mdx` reads MDX and highlights code;
// `@taxkit/diagrams` draws Mermaid. Content never imports either package.
export class DocsPageReader extends Context.Service<
  DocsPageReader,
  {
    readonly read: (
      source: DocsSource,
      links: DocsLinkContext
    ) => Effect.Effect<DocsReadPage, DocsSourceError>;
  }
>()("@taxkit/content/DocsPageReader") {}

export class DocsCodeHighlighter extends Context.Service<
  DocsCodeHighlighter,
  {
    readonly highlight: (
      snippet: DocsCodeSnippet
    ) => Effect.Effect<DocsCodeLines, DocsCodeHighlightError>;
  }
>()("@taxkit/content/DocsCodeHighlighter") {}

export class DocsDiagramRenderer extends Context.Service<
  DocsDiagramRenderer,
  {
    readonly render: (
      source: DocsDiagramSource
    ) => Effect.Effect<DocsDiagramSvg, DocsDiagramRenderError>;
  }
>()("@taxkit/content/DocsDiagramRenderer") {}

// Share images. `@taxkit/og-image` implements the renderer, which draws one
// image at build time; routes read finished images through `DocsOgImages`.
export class DocsPageRenderer extends Context.Service<
  DocsPageRenderer,
  {
    readonly renderPage: (
      image: DocsOgImage
    ) => Effect.Effect<DocsPngBytes, DocsImageRenderError>;
  }
>()("@taxkit/content/DocsPageRenderer") {}

// Each published page's finished share image, rendered ahead of time.
export class DocsOgImages extends Context.Service<
  DocsOgImages,
  {
    readonly getImage: (
      path: DocsPublicPagePath
    ) => Effect.Effect<DocsPngBytes, DocsImageRenderError>;
  }
>()("@taxkit/content/DocsOgImages") {}
