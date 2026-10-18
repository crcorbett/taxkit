import { Context } from "effect";
import type { Effect } from "effect";

import type { DocsSourceError } from "./errors.js";
import type { DocsContentPage, DocsNavigation } from "./schemas.js";

export interface DocsContentServiceContract {
  readonly getNavigation: () => Effect.Effect<DocsNavigation, DocsSourceError>;
  readonly listPages: () => Effect.Effect<
    readonly DocsContentPage[],
    DocsSourceError
  >;
}

export class DocsContentService extends Context.Service<
  DocsContentService,
  DocsContentServiceContract
>()("@taxkit/docs-content/DocsContentService") {}
