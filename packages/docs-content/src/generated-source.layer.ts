import { FumadocsSourceLive } from "@taxkit/docs-fumadocs/live";
import { FumadocsGeneratedCollection } from "@taxkit/docs-fumadocs/service";
import { Layer } from "effect";

import { createGeneratedCollectionAdapter } from "./generated-collection.boundary.js";
import { source } from "./server.js";

export const DocsGeneratedFumadocsSourceLive = FumadocsSourceLive.pipe(
  Layer.provide(
    Layer.succeed(FumadocsGeneratedCollection)(
      createGeneratedCollectionAdapter(source)
    )
  )
);
