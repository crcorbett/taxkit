import { Context } from "effect";
import type { Effect } from "effect";

import type { DocsPageNotFoundError, DocsSourceError } from "./errors.js";
import type {
  DocsContentPage,
  DocsNavigation,
  DocsPagePath,
  DocsValidationResult,
} from "./schemas.js";

export interface DocsContentServiceShape {
  readonly getNavigation: () => Effect.Effect<DocsNavigation, DocsSourceError>;
  readonly getPage: (
    path: DocsPagePath
  ) => Effect.Effect<DocsContentPage, DocsPageNotFoundError | DocsSourceError>;
  readonly listPages: () => Effect.Effect<
    readonly DocsContentPage[],
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
