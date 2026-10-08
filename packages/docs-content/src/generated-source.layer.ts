import { makeFumadocsSourceLive } from "@taxkit/docs-fumadocs/live";

import { createGeneratedCollectionAdapter } from "./generated-collection.boundary.js";
import { source } from "./server.js";

export const DocsGeneratedFumadocsSourceLive = makeFumadocsSourceLive(
  createGeneratedCollectionAdapter(source)
);
