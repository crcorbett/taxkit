import { Context } from "effect";
import type { Effect } from "effect";

import type { DocsPageNotFoundError, DocsSourceError } from "./errors.js";
import type {
  DocsContentPage,
  DocsNavigation,
  DocsPagePath,
  DocsValidationResult,
} from "./schemas.js";

export interface DocsRenderablePageData {
  readonly body: unknown;
  readonly structuredData: unknown;
  readonly toc: readonly unknown[];
}

export type DocsRenderableContentPage = DocsContentPage &
  DocsRenderablePageData;

export interface DocsContentServiceShape {
  readonly getNavigation: () => Effect.Effect<DocsNavigation, DocsSourceError>;
  readonly getPage: (
    path: DocsPagePath
  ) => Effect.Effect<DocsContentPage, DocsPageNotFoundError | DocsSourceError>;
  readonly getRenderablePage: (
    path: DocsPagePath
  ) => Effect.Effect<
    DocsRenderableContentPage,
    DocsPageNotFoundError | DocsSourceError
  >;
  readonly listPages: () => Effect.Effect<
    readonly DocsContentPage[],
    DocsSourceError
  >;
  readonly listRenderablePages: () => Effect.Effect<
    readonly DocsRenderableContentPage[],
    DocsSourceError
  >;
  readonly validateContent: () => Effect.Effect<
    DocsValidationResult,
    DocsSourceError
  >;
}

export class DocsContentService extends Context.Service<
  DocsContentService,
  DocsContentServiceShape
>()("@whattax/docs-content/DocsContentService") {}
