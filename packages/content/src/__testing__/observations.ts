import type { Ref } from "effect";

import type { DocsPagePath, DocsSearchTerm } from "../schemas.js";

export interface ContentObservations {
  readonly requestedPages: Ref.Ref<readonly DocsPagePath[]>;
  readonly searchTerms: Ref.Ref<readonly DocsSearchTerm[]>;
}
